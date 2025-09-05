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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
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

// GET - Get specific pickup location
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
    const location = await prisma.pickup_locations.findFirst({
      where: {
        id: id,
        clientId: user.clients.id
      }
    });

    if (!location) {
      return NextResponse.json({ error: 'Pickup location not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: location.id,
      value: location.value,
      label: location.label,
      delhiveryApiKey: location.delhiveryApiKey
    });

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATION_GET] Error fetching pickup location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pickup location' },
      { status: 500 }
    );
  }
}

// PUT - Update specific pickup location
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
    const { name, value, delhiveryApiKey } = body;

    if (!name || !value) {
      return NextResponse.json({ error: 'Name and value are required' }, { status: 400 });
    }

    // Check if location exists and belongs to user's client
    const existingLocation = await prisma.pickup_locations.findFirst({
      where: {
        id: id,
        clientId: user.clients.id
      }
    });

    if (!existingLocation) {
      return NextResponse.json({ error: 'Pickup location not found' }, { status: 404 });
    }

    // Update the location
    const updatedLocation = await prisma.pickup_locations.update({
      where: { id: id },
      data: {
        label: name,
        value: value,
        delhiveryApiKey: delhiveryApiKey || null
      }
    });

    console.log(`✅ [API_PICKUP_LOCATION_PUT] Updated pickup location: ${updatedLocation.label}`);

    return NextResponse.json({
      success: true,
      location: {
        id: updatedLocation.id,
        value: updatedLocation.value,
        label: updatedLocation.label,
        delhiveryApiKey: updatedLocation.delhiveryApiKey
      }
    });

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATION_PUT] Error updating pickup location:', error);
    return NextResponse.json(
      { error: 'Failed to update pickup location' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific pickup location
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
    // Check if location exists and belongs to user's client
    const existingLocation = await prisma.pickup_locations.findFirst({
      where: {
        id: id,
        clientId: user.clients.id
      }
    });

    if (!existingLocation) {
      return NextResponse.json({ error: 'Pickup location not found' }, { status: 404 });
    }

    // Delete the location
    await prisma.pickup_locations.delete({
      where: { id: id }
    });

    console.log(`✅ [API_PICKUP_LOCATION_DELETE] Deleted pickup location: ${existingLocation.label}`);

    return NextResponse.json({
      success: true,
      message: 'Pickup location deleted successfully'
    });

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATION_DELETE] Error deleting pickup location:', error);
    return NextResponse.json(
      { error: 'Failed to delete pickup location' },
      { status: 500 }
    );
  }
}
