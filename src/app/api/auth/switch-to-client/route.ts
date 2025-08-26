import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { clientId, userId } = await request.json();

    // Verify the current admin token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Get the admin user
    const adminUser = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!adminUser || !adminUser.isActive || (adminUser.role !== 'admin' && adminUser.role !== 'master_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the target client and user
    const targetClient = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        users: {
          where: { id: userId }
        }
      }
    });

    if (!targetClient || !targetClient.isActive) {
      return NextResponse.json({ error: 'Client not found or inactive' }, { status: 404 });
    }

    const targetUser = targetClient.users[0];
    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 });
    }

    // Create a new session for the admin user as the target user
    const session = await prisma.sessions.create({
      data: {
        userId: targetUser.id,
        clientId: targetClient.id,
        token: jwt.sign(
          { 
            userId: targetUser.id, 
            clientId: targetClient.id,
            role: targetUser.role,
            isAdminSwitch: true,
            originalAdminId: adminUser.id
          },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        ),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    console.log(`🔄 [SWITCH_TO_CLIENT] Admin ${adminUser.email} switched to client ${targetClient.companyName} as user ${targetUser.email}`);

    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
        clientId: targetClient.id
      },
      client: {
        id: targetClient.id,
        name: targetClient.name,
        companyName: targetClient.companyName,
        email: targetClient.email,
        subscriptionPlan: targetClient.subscriptionPlan,
        subscriptionStatus: targetClient.subscriptionStatus,
        isActive: targetClient.isActive
      },
      session: {
        id: session.id,
        userId: session.userId,
        clientId: session.clientId,
        token: session.token,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('❌ [SWITCH_TO_CLIENT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to switch to client' },
      { status: 500 }
    );
  }
}
