import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await params;
    console.log(`📊 [API_ADMIN_CLIENT_PICKUP_LOCATIONS_GET] Fetching pickup locations for client: ${clientId}`);

    // Get pickup locations for the specified client
    const pickupLocations = await prisma.pickup_locations.findMany({
      where: { clientId },
      orderBy: { label: 'asc' }
    });

    console.log(`✅ [API_ADMIN_CLIENT_PICKUP_LOCATIONS_GET] Found ${pickupLocations.length} pickup locations for client ${clientId}`);

    return NextResponse.json({
      pickupLocations: pickupLocations.map(location => ({
        id: location.id,
        value: location.value,
        label: location.label,
        clientId: location.clientId
      }))
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENT_PICKUP_LOCATIONS_GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pickup locations' }, { status: 500 });
  }
}
