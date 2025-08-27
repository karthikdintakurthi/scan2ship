import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive || (user.role !== 'admin' && user.role !== 'master_admin')) {
      return null;
    }

    return {
      user: user
    };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST_ADMIN] Testing admin authentication...');
    
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [TEST_ADMIN] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [TEST_ADMIN] Admin authenticated:', auth.user.email);

    // Get all clients
    const clients = await prisma.clients.findMany({
      select: {
        id: true,
        companyName: true,
        email: true,
        isActive: true
      }
    });

    console.log(`📊 [TEST_ADMIN] Found ${clients.length} clients`);

    return NextResponse.json({
      message: 'Admin authentication successful',
      admin: {
        id: auth.user.id,
        email: auth.user.email,
        role: auth.user.role
      },
      clients: clients
    });

  } catch (error) {
    console.error('❌ [TEST_ADMIN] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
