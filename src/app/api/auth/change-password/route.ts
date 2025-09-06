import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { validatePassword, hashPassword, verifyPassword, DEFAULT_PASSWORD_POLICY } from '@/lib/password-policy';
import { revokeAllUserSessions } from '@/lib/session-manager';

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'auth', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      return authResult.response;
    }

    const user = authResult.user!;

    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Current password, new password, and confirmation are required' },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match' },
        { status: 400 }
      );
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Validate new password against policy
    const passwordValidation = validatePassword(newPassword, DEFAULT_PASSWORD_POLICY, {
      email: user.email,
      name: user.name
    });

    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors,
          warnings: passwordValidation.warnings,
          strength: passwordValidation.strength,
          score: passwordValidation.score
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Revoke all existing sessions for security
    const revokedCount = await revokeAllUserSessions(user.id);

    // Log password change
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        event: 'password_changed',
        level: 'info',
        details: JSON.stringify({
          passwordStrength: passwordValidation.strength,
          passwordScore: passwordValidation.score,
          sessionsRevoked: revokedCount
        }),
        timestamp: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      details: {
        passwordStrength: passwordValidation.strength,
        passwordScore: passwordValidation.score,
        sessionsRevoked: revokedCount,
        nextExpiryDate: new Date(Date.now() + (DEFAULT_PASSWORD_POLICY.maxAgeDays * 24 * 60 * 60 * 1000))
      }
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Password change error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
