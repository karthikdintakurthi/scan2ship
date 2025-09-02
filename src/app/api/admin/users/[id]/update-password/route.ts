import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔐 [ADMIN_UPDATE_USER_PASSWORD] Starting request...');
    
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize master admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.SUPER_ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    console.log('✅ [ADMIN_UPDATE_USER_PASSWORD] Admin authenticated:', authResult.user!.email);

    const userId = params.id;
    const { newPassword } = await request.json();

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password is required and must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        clients: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('🔍 [ADMIN_UPDATE_USER_PASSWORD] Updating password for user:', user.email, 'Client:', user.clients?.companyName);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.users.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    console.log('✅ [ADMIN_UPDATE_USER_PASSWORD] User password updated successfully');

    return NextResponse.json({
      message: 'User password updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        clientId: user.clientId,
        clientName: user.clients?.companyName
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN_UPDATE_USER_PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
