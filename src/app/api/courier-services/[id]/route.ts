import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

// GET - Get specific courier service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const service = await prisma.courier_services.findFirst({
      where: {
        id: id,
        clientId: user.clients.id
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Courier service not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: service.id,
      value: service.code,
      label: service.name,
      isActive: service.isActive,
      isDefault: service.isDefault
    });

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICE_GET] Error fetching courier service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courier service' },
      { status: 500 }
    );
  }
}

// PUT - Update specific courier service
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
    const body = await request.json();
    const { name, code, isActive, isDefault } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    // Check if service exists and belongs to user's client
    const existingService = await prisma.courier_services.findFirst({
      where: {
        id: id,
        clientId: user.clients.id
      }
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Courier service not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.courier_services.updateMany({
        where: {
          clientId: user.clients.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Update the service
    const updatedService = await prisma.courier_services.update({
      where: { id: id },
      data: {
        name,
        code,
        isActive: isActive !== false,
        isDefault: isDefault || false
      }
    });

    console.log(`✅ [API_COURIER_SERVICE_PUT] Updated courier service: ${updatedService.name}`);

    return NextResponse.json({
      success: true,
      service: {
        id: updatedService.id,
        value: updatedService.code,
        label: updatedService.name,
        isActive: updatedService.isActive,
        isDefault: updatedService.isDefault
      }
    });

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICE_PUT] Error updating courier service:', error);
    return NextResponse.json(
      { error: 'Failed to update courier service' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific courier service
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
    // Check if service exists and belongs to user's client
    const existingService = await prisma.courier_services.findFirst({
      where: {
        id: id,
        clientId: user.clients.id
      }
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Courier service not found' }, { status: 404 });
    }

    // Delete the service
    await prisma.courier_services.delete({
      where: { id: id }
    });

    console.log(`✅ [API_COURIER_SERVICE_DELETE] Deleted courier service: ${existingService.name}`);

    return NextResponse.json({
      success: true,
      message: 'Courier service deleted successfully'
    });

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICE_DELETE] Error deleting courier service:', error);
    return NextResponse.json(
      { error: 'Failed to delete courier service' },
      { status: 500 }
    );
  }
}
