import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

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

    console.log(`📦 [API_PICKUP_REQUEST] Pickup request from user: ${user.email} (${user.role})`);
    console.log(`📦 [API_PICKUP_REQUEST] Client: ${user.client.companyName || user.client.id} (ID: ${user.clientId})`);
    console.log(`📦 [API_PICKUP_REQUEST] Request data:`, body);

    // Validate required fields
    const requiredFields = ['pickup_date', 'pickup_time', 'expected_package_count'];
    const missingFields = requiredFields.filter(field => !body[field] || (typeof body[field] === 'string' && body[field].trim() === ''));
    
    if (missingFields.length > 0) {
      console.log(`❌ [API_PICKUP_REQUEST] Missing required fields: ${missingFields.join(', ')}`);
      const response = NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Get selected pickup locations for the client
    const selectedPickupLocations = body.selectedPickupLocations || [];
    
    if (!selectedPickupLocations || selectedPickupLocations.length === 0) {
      console.log(`❌ [API_PICKUP_REQUEST] No pickup locations selected for client: ${user.clientId}`);
      const response = NextResponse.json(
        { error: 'Please select at least one pickup location' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Get pickup location details for selected locations
    const pickupLocations = await prisma.pickup_locations.findMany({
      where: { 
        clientId: user.clientId,
        value: { in: selectedPickupLocations }
      },
      select: { value: true, label: true, delhiveryApiKey: true }
    });

    if (!pickupLocations || pickupLocations.length === 0) {
      console.log(`❌ [API_PICKUP_REQUEST] No valid pickup locations found for selected values: ${selectedPickupLocations.join(', ')}`);
      const response = NextResponse.json(
        { error: 'Selected pickup locations not found or invalid' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    console.log(`📍 [API_PICKUP_REQUEST] Processing ${pickupLocations.length} selected pickup locations for client: ${user.clientId}`);

    // Prepare base Delhivery API payload
    const basePayload = {
      pickup_date: body.pickup_date,
      pickup_time: body.pickup_time,
      expected_package_count: body.expected_package_count || 1
    };

    const delhiveryUrl = 'https://track.delhivery.com/fm/request/new/';
    const results = [];
    const errors = [];

    // Make individual calls for each pickup location
    for (const pickupLocation of pickupLocations) {
      console.log(`🚚 [API_PICKUP_REQUEST] Processing pickup location: ${pickupLocation.label} (${pickupLocation.value})`);
      
      const delhiveryPayload = {
        pickup_time: body.pickup_time,
        pickup_date: body.pickup_date,
        pickup_location: pickupLocation.value,
        expected_package_count: body.expected_package_count || 1
      };

      console.log(`🚚 [API_PICKUP_REQUEST] Delhivery payload for ${pickupLocation.label}:`, delhiveryPayload);
      
      try {
        const delhiveryResponse = await fetch(delhiveryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${pickupLocation.delhiveryApiKey}`
          },
          body: JSON.stringify(delhiveryPayload)
        });

        let delhiveryResult;
        try {
          delhiveryResult = await delhiveryResponse.json();
        } catch (jsonError) {
          console.error(`❌ [API_PICKUP_REQUEST] Failed to parse JSON response for ${pickupLocation.label}:`, jsonError);
          delhiveryResult = { error: 'Invalid JSON response from Delhivery API' };
        }
        
        console.log(`🚚 [API_PICKUP_REQUEST] Delhivery response for ${pickupLocation.label} - Status: ${delhiveryResponse.status}`);
        console.log(`🚚 [API_PICKUP_REQUEST] Delhivery response for ${pickupLocation.label}:`, delhiveryResult);

        if (delhiveryResponse.ok && (delhiveryResult.success || delhiveryResult.request_id || delhiveryResult.pickup_id)) {
          // Save pickup request to database
          const pickupRequest = await prisma.pickup_requests.create({
            data: {
              id: `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              clientId: user.clientId,
              userId: user.id,
              pickup_date: body.pickup_date,
              pickup_time: body.pickup_time,
              pickup_address: '', // Empty since field was removed
              contact_person: '', // Empty since field was removed
              contact_phone: '', // Empty since field was removed
              special_instructions: '', // Empty since field was removed
              pickup_location: pickupLocation.value,
              expected_package_count: body.expected_package_count || 1,
              delhivery_request_id: delhiveryResult.request_id || (delhiveryResult.pickup_id ? String(delhiveryResult.pickup_id) : null),
              status: 'scheduled',
              created_at: new Date(),
              updated_at: new Date()
            }
          });

          console.log(`✅ [API_PICKUP_REQUEST] Pickup request saved for ${pickupLocation.label} with ID: ${pickupRequest.id}`);

          results.push({
            pickup_location: pickupLocation.label,
            pickup_request_id: pickupRequest.id,
            delhivery_request_id: delhiveryResult.request_id || (delhiveryResult.pickup_id ? String(delhiveryResult.pickup_id) : null),
            status: 'success'
          });
        } else {
          console.log(`❌ [API_PICKUP_REQUEST] Delhivery API error for ${pickupLocation.label}:`, delhiveryResult);
          
          // Extract meaningful error message from Delhivery response
          let errorMessage = 'Unknown error from Delhivery API';
          if (delhiveryResult.prepaid) {
            errorMessage = `Wallet balance issue: ${delhiveryResult.prepaid}`;
          } else if (delhiveryResult.error) {
            // Handle nested error object structure
            if (typeof delhiveryResult.error === 'object' && delhiveryResult.error.message) {
              errorMessage = delhiveryResult.error.message;
            } else if (typeof delhiveryResult.error === 'string') {
              errorMessage = delhiveryResult.error;
            } else {
              errorMessage = JSON.stringify(delhiveryResult.error);
            }
          } else if (delhiveryResult.message) {
            errorMessage = delhiveryResult.message;
          } else if (typeof delhiveryResult === 'string') {
            errorMessage = delhiveryResult;
          }
          
          errors.push({
            pickup_location: pickupLocation.label,
            error: errorMessage,
            status: 'failed',
            delhivery_status: delhiveryResponse.status
          });
        }
      } catch (delhiveryError) {
        console.error(`❌ [API_PICKUP_REQUEST] Delhivery API call failed for ${pickupLocation.label}:`, delhiveryError);
        
        errors.push({
          pickup_location: pickupLocation.label,
          error: delhiveryError instanceof Error ? delhiveryError.message : 'Unknown error',
          status: 'failed'
        });
      }
    }

    // Return results
    if (results.length > 0) {
      const response = NextResponse.json({
        success: true,
        message: `Pickup requests submitted successfully for ${results.length} location(s)`,
        results: results,
        errors: errors.length > 0 ? errors : undefined,
        scheduled_date: body.pickup_date,
        scheduled_time: body.pickup_time
      });

      securityHeaders(response);
      return response;
    } else {
      const response = NextResponse.json(
        { 
          error: 'Failed to schedule pickup with any location',
          details: errors
        },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

  } catch (error) {
    console.error('❌ [API_PICKUP_REQUEST] Error processing pickup request:', error);
    const response = NextResponse.json(
      { error: 'Internal server error while processing pickup request' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
