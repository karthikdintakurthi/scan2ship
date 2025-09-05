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

// GET /api/api-keys - List API keys for the client
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKeys = await prisma.api_keys.findMany({
      where: { 
        clientId: user.clientId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('API Keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, permissions = ['orders:read'], expiresInDays } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
    }

    // Generate API key
    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const newApiKey = await prisma.api_keys.create({
      data: {
        id: crypto.randomUUID(),
        name,
        key: apiKey,
        secret,
        clientId: user.clientId,
        permissions,
        expiresAt
      }
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        key: newApiKey.key,
        secret: newApiKey.secret, // Only returned on creation
        permissions: newApiKey.permissions,
        expiresAt: newApiKey.expiresAt,
        createdAt: newApiKey.createdAt
      }
    });
  } catch (error) {
    console.error('API Keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
