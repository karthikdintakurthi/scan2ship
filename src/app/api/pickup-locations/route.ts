import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel, getAuthenticatedUser } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    console.log(`📊 [API_PICKUP_LOCATIONS_GET] Fetching pickup locations for client: ${user.client.companyName || user.client.id}`);

    // Get pickup locations for the current client
    const pickupLocations = await prisma.pickup_locations.findMany({
      where: { clientId: user.clientId },
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

    console.log(`✅ [API_PICKUP_LOCATIONS_GET] Found ${formattedLocations.length} pickup locations for client ${user.client.companyName || user.client.id}`);

    const response = NextResponse.json({
      pickupLocations: formattedLocations,
      clientId: user.clientId,
      clientName: user.client.companyName || user.client.id
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATIONS_GET] Error fetching pickup locations:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch pickup locations' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

export async function POST(request: NextRequest) {
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    const body = await request.json();
    const { name, value, delhiveryApiKey } = body;

    if (!name || !value) {
      return NextResponse.json({ error: 'Name and value are required' }, { status: 400 });
    }

    console.log(`📝 [API_PICKUP_LOCATIONS_POST] Creating pickup location for client: ${user.client.companyName || user.client.id}`);

    // Create new pickup location
    const newLocation = await prisma.pickup_locations.create({
      data: {
        label: name,
        value: value,
        delhiveryApiKey: delhiveryApiKey || null,
        clientId: user.clientId
      }
    });

    console.log(`✅ [API_PICKUP_LOCATIONS_POST] Created pickup location: ${newLocation.label}`);

    const response = NextResponse.json({
      success: true,
      location: {
        id: newLocation.id,
        value: newLocation.value,
        label: newLocation.label,
        delhiveryApiKey: newLocation.delhiveryApiKey
      }
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATIONS_POST] Error creating pickup location:', error);
    const response = NextResponse.json(
      { error: 'Failed to create pickup location' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

export async function PUT(request: NextRequest) {
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    const body = await request.json();
    const { locations } = body;

    if (!Array.isArray(locations)) {
      return NextResponse.json({ error: 'Locations array is required' }, { status: 400 });
    }

    console.log(`📝 [API_PICKUP_LOCATIONS_PUT] Updating pickup locations for client: ${user.client.companyName || user.client.id}`);

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

    const response = NextResponse.json({
      success: true,
      message: 'Pickup locations updated successfully'
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATIONS_PUT] Error updating pickup locations:', error);
    const response = NextResponse.json(
      { error: 'Failed to update pickup locations' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
