import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Helper function to authenticate master admin
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.role !== 'master_admin' || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔐 [ADMIN_UPDATE_USER_PASSWORD] Starting request...');
    
    // Authenticate master admin
    const admin = await getAuthenticatedAdmin(request);
    if (!admin) {
      console.log('❌ [ADMIN_UPDATE_USER_PASSWORD] Admin authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [ADMIN_UPDATE_USER_PASSWORD] Admin authenticated:', admin.email);

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
