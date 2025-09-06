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
    console.log('🔐 [ADMIN_UPDATE_CLIENT_PASSWORD] Starting request...');
    
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

    console.log('✅ [ADMIN_UPDATE_CLIENT_PASSWORD] Admin authenticated:', authResult.user!.email);

    const clientId = params.id;
    const { newPassword } = await request.json();

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password is required and must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    console.log('🔍 [ADMIN_UPDATE_CLIENT_PASSWORD] Updating password for client:', client.companyName);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update client password
    await prisma.clients.update({
      where: { id: clientId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    console.log('✅ [ADMIN_UPDATE_CLIENT_PASSWORD] Client password updated successfully');

    return NextResponse.json({
      message: 'Client password updated successfully'
    });

  } catch (error) {
    console.error('❌ [ADMIN_UPDATE_CLIENT_PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
