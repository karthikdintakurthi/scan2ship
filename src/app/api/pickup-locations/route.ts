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
    const pickupLocations = await prisma.pickup_locations.findMany({
      where: { clientId: user.clients.id },
      orderBy: { label: 'asc' }
    });

    // Transform pickup locations to match the expected format
    const formattedLocations = pickupLocations.map(location => {
      // Use API key as raw data - no encryption/decryption
      const apiKey = location.delhiveryApiKey || '';
      if (apiKey) {
        console.log(`🔑 [PICKUP_LOCATIONS] Raw API key for ${location.label}: ${apiKey.substring(0, 8)}...`);
      }

      return {
        value: location.value,
        label: location.label,
        delhiveryApiKey: apiKey,
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
