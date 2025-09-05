import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const jwt = await import('jsonwebtoken');
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

// GET - Fetch a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 [API_ADMIN_USERS_GET_BY_ID] Fetching user:', params.id);
    
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [API_ADMIN_USERS_GET_BY_ID] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: params.id },
      include: {
        clients: {
          select: {
            id: true,
            companyName: true,
            name: true
          }
        },
        user_pickup_locations: {
          include: {
            pickup_locations: {
              select: {
                id: true,
                value: true,
                label: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('❌ [API_ADMIN_USERS_GET_BY_ID] User not found:', params.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove sensitive information
    const { password, ...userWithoutPassword } = user;

    console.log('✅ [API_ADMIN_USERS_GET_BY_ID] User fetched successfully:', user.email);
    return NextResponse.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('❌ [API_ADMIN_USERS_GET_BY_ID] Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('✏️ [API_ADMIN_USERS_PUT] Updating user:', params.id);
    
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [API_ADMIN_USERS_PUT] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData = await request.json();
    console.log('📝 [API_ADMIN_USERS_PUT] Update data received:', { 
      name: updateData.name, 
      email: updateData.email, 
      role: updateData.role,
      isActive: updateData.isActive,
      pickupLocationIds: updateData.pickupLocationIds
    });

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: params.id },
      include: {
        clients: true,
        user_pickup_locations: true
      }
    });

    if (!existingUser) {
      console.log('❌ [API_ADMIN_USERS_PUT] User not found:', params.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is being changed and if it conflicts with another user
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailConflict = await prisma.users.findFirst({
        where: { 
          email: updateData.email,
          clientId: existingUser.clientId,
          id: { not: params.id }
        }
      });

      if (emailConflict) {
        console.log('❌ [API_ADMIN_USERS_PUT] Email already exists for this client:', updateData.email);
        return NextResponse.json({ error: 'Email already exists for this client' }, { status: 409 });
      }
    }

    // Prepare update data
    const userUpdateData: any = {
      updatedAt: new Date()
    };

    if (updateData.name) userUpdateData.name = updateData.name;
    if (updateData.email) userUpdateData.email = updateData.email;
    if (updateData.role) userUpdateData.role = updateData.role;
    if (typeof updateData.isActive === 'boolean') userUpdateData.isActive = updateData.isActive;
    
    // Hash password if provided
    if (updateData.password) {
      userUpdateData.password = await bcrypt.hash(updateData.password, 12);
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: { id: params.id },
      data: userUpdateData,
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

    // Handle pickup location assignments for child users
    if (updateData.role === 'child_user' && Array.isArray(updateData.pickupLocationIds)) {
      console.log('🔗 [API_ADMIN_USERS_PUT] Updating pickup location assignments...');
      
      // Remove existing assignments
      await prisma.user_pickup_locations.deleteMany({
        where: { userId: params.id }
      });

      // Add new assignments
      if (updateData.pickupLocationIds.length > 0) {
        const pickupLocationAssignments = updateData.pickupLocationIds.map((pickupLocationId: string) => ({
          id: `upl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: params.id,
          pickupLocationId: pickupLocationId,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await prisma.user_pickup_locations.createMany({
          data: pickupLocationAssignments
        });

        console.log(`✅ [API_ADMIN_USERS_PUT] Updated ${pickupLocationAssignments.length} pickup location assignments`);
      }
    } else if (updateData.role !== 'child_user') {
      // Remove pickup location assignments if role is not child_user
      await prisma.user_pickup_locations.deleteMany({
        where: { userId: params.id }
      });
      console.log('✅ [API_ADMIN_USERS_PUT] Removed pickup location assignments for non-child user');
    }

    // Remove sensitive information
    const { password, ...userWithoutPassword } = updatedUser;

    console.log('✅ [API_ADMIN_USERS_PUT] User updated successfully:', updatedUser.email);
    return NextResponse.json({
      message: 'User updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_USERS_PUT] Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🗑️ [API_ADMIN_USERS_DELETE] Deleting user:', params.id);
    
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [API_ADMIN_USERS_DELETE] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: params.id },
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

    if (!user) {
      console.log('❌ [API_ADMIN_USERS_DELETE] User not found:', params.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deletion of the current admin user
    if (user.id === auth.user.id) {
      console.log('❌ [API_ADMIN_USERS_DELETE] Cannot delete own account:', user.email);
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete user (cascade will handle related records)
    await prisma.users.delete({
      where: { id: params.id }
    });

    console.log('✅ [API_ADMIN_USERS_DELETE] User deleted successfully:', user.email);
    return NextResponse.json({
      message: 'User deleted successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        clientName: user.clients?.companyName
      }
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_USERS_DELETE] Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
