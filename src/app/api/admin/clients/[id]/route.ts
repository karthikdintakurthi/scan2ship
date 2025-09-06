import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { id: clientId } = await params;

    console.log('📊 [API_ADMIN_CLIENT_GET] Fetching client details for ID:', clientId);

    // Get client with users and orders
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        orders: {
          select: {
            id: true,
            name: true,
            mobile: true,
            courier_service: true,
            created_at: true
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 10 // Limit to recent 10 orders
        },
        _count: {
          select: {
            users: true,
            orders: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    console.log(`✅ [API_ADMIN_CLIENT_GET] Found client: ${client.companyName}`);

    return NextResponse.json({
      client: {
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
        users: client.users,
        orders: client.orders,
        _count: client._count
      }
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENT_GET] Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { id: clientId } = await params;
    const updateData = await request.json();

    console.log('📝 [API_ADMIN_CLIENT_PUT] Updating client:', clientId);

    // Check if client exists
    const existingClient = await prisma.clients.findUnique({
      where: { id: clientId }
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update the client
    const updatedClient = await prisma.clients.update({
      where: { id: clientId },
      data: {
        name: updateData.name,
        companyName: updateData.companyName,
        email: updateData.email,
        phone: updateData.phone,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        country: updateData.country,
        pincode: updateData.pincode,
        subscriptionPlan: updateData.subscriptionPlan,
        subscriptionStatus: updateData.subscriptionStatus,
        subscriptionExpiresAt: updateData.subscriptionExpiresAt ? new Date(updateData.subscriptionExpiresAt) : null,
        isActive: updateData.isActive,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [API_ADMIN_CLIENT_PUT] Updated client: ${updatedClient.companyName}`);

    return NextResponse.json({
      message: 'Client updated successfully',
      client: updatedClient
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENT_PUT] Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.DELETE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { id: clientId } = await params;

    console.log('🗑️ [API_ADMIN_CLIENT_DELETE] Deleting client:', clientId);

    // Check if client exists
    const existingClient = await prisma.clients.findUnique({
      where: { id: clientId }
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Delete the client
    await prisma.clients.delete({
      where: { id: clientId }
    });

    console.log(`✅ [API_ADMIN_CLIENT_DELETE] Deleted client: ${existingClient.companyName}`);

    return NextResponse.json({
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENT_DELETE] Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
