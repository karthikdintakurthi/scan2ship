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
        clients: {
          include: {
            pickup_locations: true
          }
        }
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

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📊 [API_PICKUP_LOCATIONS_GET] Fetching pickup locations for client: ${user.clients.companyName}`);

    // Get pickup locations for the current client
    let pickupLocations;
    
    if (user.role === 'child_user') {
      // For child users, only show assigned pickup locations
      pickupLocations = await prisma.pickup_locations.findMany({
        where: { 
          clientId: user.clients.id,
          user_pickup_locations: {
            some: {
              userId: user.id
            }
          }
        },
        orderBy: { label: 'asc' }
      });
    } else {
      // For other users, show all pickup locations for the client
      pickupLocations = await prisma.pickup_locations.findMany({
        where: { clientId: user.clients.id },
        orderBy: { label: 'asc' }
      });
    }

    // Transform pickup locations to match the expected format
    const formattedLocations = pickupLocations.map(location => {
      // Use API key as raw data - no encryption/decryption
      const apiKey = location.delhiveryApiKey || '';
      if (apiKey) {
        console.log(`🔑 [PICKUP_LOCATIONS] Raw API key for ${location.label}: ${apiKey.substring(0, 8)}...`);
      }

              return {
          id: location.id,
          value: location.value,
          label: location.label,
          delhiveryApiKey: apiKey,
          // Note: isActive field doesn't exist in pickup_locations table
          // Add default configuration for other required fields
        productDetails: {
          description: 'ARTIFICAL JEWELLERY',
          commodity_value: 5000,
          tax_value: 0,
          category: 'ARTIFICAL JEWELLERY',
          hsn_code: ''
        },
        returnAddress: {
          address: 'Mahalakshmi Complex-2, 2nd floor Vijayawada',
          pincode: '520002'
        },
        sellerDetails: {
          name: location.label,
          address: 'Mahalakshmi Complex-2, 2nd floor Vijayawada 520002',
          gst: '',
          cst_no: '',
          tin: ''
        },
        vendorPickupLocation: location.value,
        shipmentDimensions: {
          length: 10,
          breadth: 10,
          height: 10
        },
        fragileShipment: false
      };
    });

    console.log(`✅ [API_PICKUP_LOCATIONS_GET] Found ${formattedLocations.length} pickup locations for client ${user.clients.companyName}`);

    return NextResponse.json({
      pickupLocations: formattedLocations,
      clientId: user.clients.id,
      clientName: user.clients.companyName
    });

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATIONS_GET] Error fetching pickup locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pickup locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, value, delhiveryApiKey } = body;

    if (!name || !value) {
      return NextResponse.json({ error: 'Name and value are required' }, { status: 400 });
    }

    console.log(`📝 [API_PICKUP_LOCATIONS_POST] Creating pickup location for client: ${user.clients.companyName}`);

    // Generate a unique ID for the pickup location
    const locationId = `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create new pickup location
    const newLocation = await prisma.pickup_locations.create({
      data: {
        id: locationId,
        label: name,
        value: value,
        delhiveryApiKey: delhiveryApiKey || null,
        clientId: user.clients.id
      }
    });

    console.log(`✅ [API_PICKUP_LOCATIONS_POST] Created pickup location: ${newLocation.label}`);

    return NextResponse.json({
      success: true,
      location: {
        id: newLocation.id,
        value: newLocation.value,
        label: newLocation.label,
        delhiveryApiKey: newLocation.delhiveryApiKey
      }
    });

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATIONS_POST] Error creating pickup location:', error);
    return NextResponse.json(
      { error: 'Failed to create pickup location' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { locations } = body;

    if (!Array.isArray(locations)) {
      return NextResponse.json({ error: 'Locations array is required' }, { status: 400 });
    }

    console.log(`📝 [API_PICKUP_LOCATIONS_PUT] Updating pickup locations for client: ${user.clients.companyName}`);

    // Update pickup locations
    const updatePromises = locations.map(async (location: any) => {
      if (location.id) {
        return prisma.pickup_locations.update({
          where: { id: location.id },
          data: {
            label: location.label,
            value: location.value,
            delhiveryApiKey: location.delhiveryApiKey || null
          }
        });
      }
    });

    await Promise.all(updatePromises.filter(Boolean));

    console.log(`✅ [API_PICKUP_LOCATIONS_PUT] Updated ${locations.length} pickup locations`);

    return NextResponse.json({
      success: true,
      message: 'Pickup locations updated successfully'
    });

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATIONS_PUT] Error updating pickup locations:', error);
    return NextResponse.json(
      { error: 'Failed to update pickup locations' },
      { status: 500 }
    );
  }
}
