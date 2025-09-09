import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';

interface DelhiveryTrackingResponse {
  ShipmentData?: Array<{
    Shipment: {
      AWB: string;
      Status: {
        Status: string;
        StatusLocation: string;
        StatusDateTime: string;
        StatusCode: string;
        Instructions: string;
      };
      Origin: string;
      Destination: string;
      PickUpDate: string;
      DeliveryDate?: string;
      ExpectedDeliveryDate?: string;
      Scans: Array<{
        ScanDetail: {
          ScanDateTime: string;
          Scan: string;
          ScannedLocation: string;
          StatusCode: string;
          Instructions: string;
        };
      }>;
      Consignee: {
        Name: string;
        City: string;
        State: string;
        PinCode: number;
      };
      SenderName: string;
      ReferenceNo: string;
    };
  }>;
}

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [API_TRACKING_DELHIVERY] Request received for waybill: ${request.nextUrl.searchParams.get('waybill')}`);
    console.log(`🔍 [API_TRACKING_DELHIVERY] Authorization header: ${request.headers.get('authorization')?.substring(0, 20)}...`);

    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      console.log(`🚫 [API_TRACKING_DELHIVERY] Security middleware blocked request`);
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
      console.log(`🚫 [API_TRACKING_DELHIVERY] Authorization failed: ${authResult.response.status}`);
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const { searchParams } = new URL(request.url);
    const waybillNumber = searchParams.get('waybill');

    if (!waybillNumber) {
      return NextResponse.json({ error: 'Waybill number is required' }, { status: 400 });
    }

    console.log(`🔍 [API_TRACKING_DELHIVERY] Tracking waybill: ${waybillNumber} for client: ${user.client.companyName || user.client.id}`);
    console.log(`🔍 [API_TRACKING_DELHIVERY] User ID: ${user.id}, Client ID: ${user.clientId}`);

    // Find the order to get the pickup location and API key
    const order = await prisma.orders.findFirst({
      where: {
        OR: [
          { delhivery_waybill_number: waybillNumber },
          { tracking_id: waybillNumber }
        ],
        clientId: user.clientId
      }
    });

    if (!order) {
      console.log(`❌ [API_TRACKING_DELHIVERY] Order not found for waybill: ${waybillNumber}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`📦 [API_TRACKING_DELHIVERY] Found order: ${order.id}, pickup_location: ${order.pickup_location}`);

    // Get the pickup location with API key
    const pickupLocation = await prisma.pickup_locations.findFirst({
      where: {
        value: order.pickup_location,
        clientId: user.clientId
      }
    });

    if (!pickupLocation) {
      console.log(`❌ [API_TRACKING_DELHIVERY] Pickup location not found: ${order.pickup_location} for client: ${user.clientId}`);
      return NextResponse.json({ error: 'Pickup location not found' }, { status: 404 });
    }

    if (!pickupLocation.delhiveryApiKey) {
      console.log(`❌ [API_TRACKING_DELHIVERY] Delhivery API key not found for pickup location: ${pickupLocation.label}`);
      return NextResponse.json({ error: 'Delhivery API key not found for this pickup location' }, { status: 400 });
    }

    console.log(`🔑 [API_TRACKING_DELHIVERY] Using API key for pickup location: ${pickupLocation.label}`);

    // Call Delhivery tracking API
    const trackingUrl = 'https://track.delhivery.com/api/v1/packages/json';
    const trackingParams = new URLSearchParams({
      token: pickupLocation.delhiveryApiKey,
      waybill: waybillNumber
    });

    console.log(`🚚 [API_TRACKING_DELHIVERY] Calling Delhivery API for waybill: ${waybillNumber}`);
    console.log(`🚚 [API_TRACKING_DELHIVERY] API URL: ${trackingUrl}?${trackingParams.toString().replace(pickupLocation.delhiveryApiKey, '***')}`);

    const delhiveryResponse = await fetch(`${trackingUrl}?${trackingParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`🚚 [API_TRACKING_DELHIVERY] Delhivery response status: ${delhiveryResponse.status} ${delhiveryResponse.statusText}`);

    if (!delhiveryResponse.ok) {
      const errorText = await delhiveryResponse.text();
      console.error(`❌ [API_TRACKING_DELHIVERY] Delhivery API error: ${delhiveryResponse.status} ${delhiveryResponse.statusText}`);
      console.error(`❌ [API_TRACKING_DELHIVERY] Error response: ${errorText}`);
      return NextResponse.json({ 
        error: `Delhivery API error: ${delhiveryResponse.status} ${delhiveryResponse.statusText}`,
        details: errorText
      }, { status: delhiveryResponse.status });
    }

    const delhiveryResult: DelhiveryTrackingResponse = await delhiveryResponse.json();

    console.log(`✅ [API_TRACKING_DELHIVERY] Delhivery response for waybill ${waybillNumber}:`, delhiveryResult);

    if (!delhiveryResult.ShipmentData || delhiveryResult.ShipmentData.length === 0) {
      return NextResponse.json({ 
        error: 'No tracking data found for this waybill number' 
      }, { status: 404 });
    }

    const shipment = delhiveryResult.ShipmentData[0].Shipment;
    
    // Transform Delhivery response to our expected format
    const trackingData = {
      waybill: shipment.AWB,
      status: shipment.Status.Status,
      status_description: shipment.Status.Instructions,
      origin: shipment.Origin,
      destination: shipment.Destination,
      current_location: shipment.Status.StatusLocation,
      current_status: shipment.Status.Status,
      current_status_description: shipment.Status.Instructions,
      pickup_date: shipment.PickUpDate,
      delivered_date: shipment.DeliveryDate || null,
      expected_delivery_date: shipment.ExpectedDeliveryDate || null,
      tracking_events: shipment.Scans.map(scan => ({
        status: scan.ScanDetail.Scan,
        status_description: scan.ScanDetail.Instructions,
        location: scan.ScanDetail.ScannedLocation,
        timestamp: scan.ScanDetail.ScanDateTime,
        remarks: scan.ScanDetail.StatusCode
      }))
    };

    // Update the order's tracking status in the database
    const normalizedStatus = shipment.Status.Status.toLowerCase().replace(/\s+/g, '_')
    
    try {
      // Check if tracking_status column exists before updating
      const columnExists = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'tracking_status'
        AND table_schema = 'public'
      `;
      
      if (Array.isArray(columnExists) && columnExists.length > 0) {
        await prisma.orders.update({
          where: { id: order.id },
          data: {
            tracking_status: normalizedStatus,
            updated_at: new Date()
          }
        });
        console.log(`📝 [API_TRACKING_DELHIVERY] Updated order ${order.id} with tracking status: ${normalizedStatus}`);
      } else {
        // Column doesn't exist, just update the updated_at field
        await prisma.orders.update({
          where: { id: order.id },
          data: {
            updated_at: new Date()
          }
        });
        console.log(`📝 [API_TRACKING_DELHIVERY] Updated order ${order.id} updated_at (tracking_status column not available)`);
      }
    } catch (updateError) {
      console.warn(`⚠️ [API_TRACKING_DELHIVERY] Failed to update order ${order.id}:`, updateError);
      // Continue with the response even if update fails
    }

    const response = NextResponse.json({
      success: true,
      data: trackingData
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_TRACKING_DELHIVERY] Error:', error);
    
    const response = NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });

    securityHeaders(response);
    return response;
  }
}
