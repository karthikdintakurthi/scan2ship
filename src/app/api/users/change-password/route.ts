import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { userId: authResult.user!.id, user: authResult.user!, client: authResult.user!.client };

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.currentPassword || typeof body.currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      );
    }

    if (!body.newPassword || typeof body.newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (body.newPassword.length > 128) {
      return NextResponse.json(
        { error: 'New password must be 128 characters or less' },
        { status: 400 }
      );
    }

    // Check password strength (at least 3 out of 5 criteria)
    let strength = 0;
    if (body.newPassword.length >= 8) strength++;
    if (body.newPassword.length >= 12) strength++;
    if (/[a-z]/.test(body.newPassword)) strength++;
    if (/[A-Z]/.test(body.newPassword)) strength++;
    if (/[0-9]/.test(body.newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(body.newPassword)) strength++;

    if (strength < 3) {
      return NextResponse.json(
        { error: 'New password is too weak. Please use a stronger password with uppercase, lowercase, numbers, and special characters.' },
        { status: 400 }
      );
    }

    // Check if new password is different from current password
    if (body.currentPassword === body.newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Get user with current password
    const user = await prisma.users.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        password: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(body.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(body.newPassword, saltRounds);

    // Update password
    await prisma.users.update({
      where: { id: auth.userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    // Log password change for security audit
    console.log(`🔒 [PASSWORD_CHANGE] User ${user.email} (${user.id}) changed password`);

    return NextResponse.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('❌ [API_USERS_CHANGE_PASSWORD] Error changing password:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
