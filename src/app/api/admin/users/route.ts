import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuthenticatedAdmin } from '@/lib/auth-utils';

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
    
    // If user is client admin (role: 'admin'), restrict to their own client
    if (auth.user.role === 'admin') {
      whereClause.clientId = auth.user.clientId;
    } else if (clientId) {
      // Master admin can specify clientId
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

    // If user is client admin, restrict to their own client
    if (auth.user.role === 'admin') {
      userData.clientId = auth.user.clientId;
      console.log('🔒 [API_ADMIN_USERS_POST] Client admin restricted to own client:', userData.clientId);
    }

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

    // Handle pickup location assignments for child users
    if (userData.role === 'child_user' && userData.pickupLocationIds && userData.pickupLocationIds.length > 0) {
      console.log('🔗 [API_ADMIN_USERS_POST] Assigning pickup locations to child user...');
      
      const pickupLocationAssignments = userData.pickupLocationIds.map((pickupLocationId: string) => ({
        id: `upl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: newUser.id,
        pickupLocationId: pickupLocationId,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.user_pickup_locations.createMany({
        data: pickupLocationAssignments
      });

      console.log(`✅ [API_ADMIN_USERS_POST] Assigned ${pickupLocationAssignments.length} pickup locations to child user`);
    }

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

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [API_ADMIN_USERS_PUT] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
            const { userId, name, email, role, isActive } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`📝 [API_ADMIN_USERS_PUT] Updating user: ${userId} by ${auth.user.role}`);

    // Check if the user exists and belongs to the same client (for client admin)
    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
      include: { clients: true }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For client admin, ensure they can only edit users in their own client
    if (auth.user.role === 'admin' && existingUser.clientId !== auth.user.clientId) {
      console.log('🔒 [API_ADMIN_USERS_PUT] Client admin trying to edit user from different client');
      return NextResponse.json({ error: 'Unauthorized to edit this user' }, { status: 403 });
    }

    // Validate role for client admin (can't create admin or viewer)
    if (auth.user.role === 'admin' && (role === 'admin' || role === 'viewer')) {
      console.log('🔒 [API_ADMIN_USERS_PUT] Client admin trying to set admin/viewer role');
      return NextResponse.json({ error: 'Invalid role for client admin' }, { status: 400 });
    }

    // Update the user
            const updatedUser = await prisma.users.update({
          where: { id: userId },
          data: {
            name: name || existingUser.name,
            email: email || existingUser.email,
            role: role || existingUser.role,
            isActive: isActive !== undefined ? isActive : existingUser.isActive,
            updatedAt: new Date()
          },
      include: {
        clients: true
      }
    });

    console.log(`✅ [API_ADMIN_USERS_PUT] User updated successfully: ${updatedUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        clientId: updatedUser.clientId
      }
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_USERS_PUT] Error updating user:', error);
    console.error('❌ [API_ADMIN_USERS_PUT] Error stack:', error.stack);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [API_ADMIN_USERS_DELETE] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`🗑️ [API_ADMIN_USERS_DELETE] Deleting user: ${userId} by ${auth.user.role}`);

    // Check if the user exists and belongs to the same client (for client admin)
    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
      include: { clients: true }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For client admin, ensure they can only delete users in their own client
    if (auth.user.role === 'admin' && existingUser.clientId !== auth.user.clientId) {
      console.log('🔒 [API_ADMIN_USERS_DELETE] Client admin trying to delete user from different client');
      return NextResponse.json({ error: 'Unauthorized to delete this user' }, { status: 403 });
    }

    // Prevent deleting admin users (for client admin)
    if (auth.user.role === 'admin' && existingUser.role === 'admin') {
      console.log('🔒 [API_ADMIN_USERS_DELETE] Client admin trying to delete admin user');
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    // Prevent deleting self
    if (existingUser.id === auth.user.id) {
      console.log('🔒 [API_ADMIN_USERS_DELETE] User trying to delete themselves');
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
    }

    // Delete the user
    await prisma.users.delete({
      where: { id: userId }
    });

    console.log(`✅ [API_ADMIN_USERS_DELETE] User deleted successfully: ${existingUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_USERS_DELETE] Error deleting user:', error);
    console.error('❌ [API_ADMIN_USERS_DELETE] Error stack:', error.stack);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
