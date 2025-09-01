import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '@/lib/jwt-config';

const prisma = new PrismaClient();

// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.options.issuer,
      audience: jwtConfig.options.audience,
      algorithms: [jwtConfig.options.algorithm]
    }) as any;
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || (user.role !== 'admin' && user.role !== 'master_admin')) {
      return null;
    }

    return {
      user: user,
      client: user.clients
    };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 [API_ADMIN_CLIENTS_GET] Fetching all clients for admin:', auth.user.email);

    // Get all clients with their statistics
    const clients = await prisma.clients.findMany({
      include: {
        _count: {
          select: {
            users: true,
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ [API_ADMIN_CLIENTS_GET] Found ${clients.length} clients`);

    return NextResponse.json({
      clients: clients.map((client: any) => ({
        id: client.id,
        name: client.name,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        country: client.country,
        pincode: client.pincode,
        subscriptionPlan: client.subscriptionPlan,
        subscriptionStatus: client.subscriptionStatus,
        subscriptionExpiresAt: client.subscriptionExpiresAt,
        isActive: client.isActive,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        _count: client._count
      }))
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENTS_GET] Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientData = await request.json();

    console.log('📝 [API_ADMIN_CLIENTS_POST] Creating new client:', clientData.companyName);

    // Validate required fields
    const requiredFields = ['name', 'companyName', 'email'];
    for (const field of requiredFields) {
      if (!clientData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Check if client with this email already exists
    const existingClient = await prisma.clients.findUnique({
      where: { email: clientData.email }
    });

    if (existingClient) {
      return NextResponse.json({ error: 'Client with this email already exists' }, { status: 409 });
    }

    // Create the client
    const newClient = await prisma.clients.create({
      data: {
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: clientData.name,
        companyName: clientData.companyName,
        email: clientData.email,
        phone: clientData.phone || null,
        address: clientData.address || null,
        city: clientData.city || null,
        state: clientData.state || null,
        country: clientData.country || 'India',
        pincode: clientData.pincode || null,
        subscriptionPlan: clientData.subscriptionPlan || 'basic',
        subscriptionStatus: clientData.subscriptionStatus || 'active',
        subscriptionExpiresAt: clientData.subscriptionExpiresAt ? new Date(clientData.subscriptionExpiresAt) : null,
        isActive: clientData.isActive !== undefined ? clientData.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ [API_ADMIN_CLIENTS_POST] Created client: ${newClient.companyName}`);

    return NextResponse.json({
      message: 'Client created successfully',
      client: newClient
    }, { status: 201 });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENTS_POST] Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
