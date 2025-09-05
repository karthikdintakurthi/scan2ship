import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const session = await prisma.sessions.findUnique({
      where: { token },
      include: {
        users: {
          include: {
            clients: true
          }
        }
      }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.users;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// PUT /api/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, permissions, isActive } = await request.json();

    const apiKey = await prisma.api_keys.findFirst({
      where: { 
        id,
        clientId: user.clientId 
      }
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const updatedApiKey = await prisma.api_keys.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(permissions && { permissions }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: updatedApiKey.id,
        name: updatedApiKey.name,
        key: updatedApiKey.key,
        permissions: updatedApiKey.permissions,
        lastUsedAt: updatedApiKey.lastUsedAt,
        expiresAt: updatedApiKey.expiresAt,
        isActive: updatedApiKey.isActive,
        createdAt: updatedApiKey.createdAt,
        updatedAt: updatedApiKey.updatedAt
      }
    });
  } catch (error) {
    console.error('API Keys PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const apiKey = await prisma.api_keys.findFirst({
      where: { 
        id,
        clientId: user.clientId 
      }
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.api_keys.update({
      where: { id },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'API key deactivated successfully'
    });
  } catch (error) {
    console.error('API Keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
