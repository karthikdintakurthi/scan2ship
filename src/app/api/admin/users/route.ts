import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (clientId) {
      whereClause.clientId = clientId;
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where: whereClause,
        include: {
          clients: {
            select: {
              id: true,
              companyName: true,
              name: true
            }
          }
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.users.count({ where: whereClause })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ [API_ADMIN_USERS_GET] Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API_ADMIN_USERS_POST] Starting user creation...');
    
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [API_ADMIN_USERS_POST] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [API_ADMIN_USERS_POST] Authentication successful for:', auth.user.email);

    const userData = await request.json();
    console.log('📝 [API_ADMIN_USERS_POST] User data received:', { 
      name: userData.name, 
      email: userData.email, 
      role: userData.role, 
      clientId: userData.clientId 
    });

    const requiredFields = ['name', 'email', 'password', 'role', 'clientId'];
    
    for (const field of requiredFields) {
      if (!userData[field]) {
        console.log('❌ [API_ADMIN_USERS_POST] Missing required field:', field);
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Check if user with this email and clientId already exists (compound unique constraint)
    console.log('🔍 [API_ADMIN_USERS_POST] Checking for existing user...');
    const existingUser = await prisma.users.findFirst({
      where: { 
        email: userData.email,
        clientId: userData.clientId
      }
    });

    if (existingUser) {
      console.log('❌ [API_ADMIN_USERS_POST] User with email and clientId already exists:', userData.email, userData.clientId);
      return NextResponse.json({ error: 'User with this email already exists for this client' }, { status: 409 });
    }

    // Check if client exists
    console.log('🔍 [API_ADMIN_USERS_POST] Checking if client exists...');
    const client = await prisma.clients.findUnique({
      where: { id: userData.clientId }
    });

    if (!client) {
      console.log('❌ [API_ADMIN_USERS_POST] Client not found:', userData.clientId);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    console.log('✅ [API_ADMIN_USERS_POST] Client found:', client.companyName);

    // Hash the password
    console.log('🔐 [API_ADMIN_USERS_POST] Hashing password...');
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    console.log('✅ [API_ADMIN_USERS_POST] Password hashed successfully');

    console.log('📝 [API_ADMIN_USERS_POST] Creating user in database...');
    const newUser = await prisma.users.create({
      data: {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        clientId: userData.clientId,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        clients: {
          select: {
            id: true,
            companyName: true,
            name: true
          }
        }
      }
    });

    console.log('✅ [API_ADMIN_USERS_POST] User created successfully:', newUser.id);

    // Remove password from response
    const { password, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      message: 'User created successfully',
      user: userWithoutPassword
    }, { status: 201 });
  } catch (error) {
    console.error('❌ [API_ADMIN_USERS_POST] Error creating user:', error);
    console.error('❌ [API_ADMIN_USERS_POST] Error stack:', error.stack);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
