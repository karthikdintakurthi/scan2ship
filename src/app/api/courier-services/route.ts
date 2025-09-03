import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
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

    console.log(`📊 [API_COURIER_SERVICES_GET] Fetching courier services for client: ${user.client.companyName || user.client.id} (ID: ${user.clientId})`);

    // Get courier services for the current client
    const courierServices = await prisma.courier_services.findMany({
      where: { clientId: user.clientId },
      orderBy: { name: 'asc' }
    });

    console.log(`🔍 [API_COURIER_SERVICES_GET] Raw courier services from DB:`, courierServices);

    // Transform courier services to match the expected format
    const formattedServices = courierServices.map(service => ({
      id: service.id,
      value: service.code,
      label: service.name,
      isActive: service.isActive,
      isDefault: service.isDefault
    }));

    console.log(`✅ [API_COURIER_SERVICES_GET] Found ${formattedServices.length} courier services for client ${user.client.companyName || user.client.id}`);
    console.log(`📋 [API_COURIER_SERVICES_GET] Formatted services:`, formattedServices);

    const response = NextResponse.json({
      courierServices: formattedServices,
      clientId: user.clientId,
      clientName: user.client.companyName || user.client.id
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_GET] Error fetching courier services:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch courier services' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
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
    const { name, code, isActive } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    console.log(`📝 [API_COURIER_SERVICES_POST] Creating courier service for client: ${user.clients.companyName}`);

    // Create new courier service
    const newService = await prisma.courier_services.create({
      data: {
        name: name,
        code: code,
        isActive: isActive !== false,
        isDefault: false,
        clientId: user.clients.id
      }
    });

    console.log(`✅ [API_COURIER_SERVICES_POST] Created courier service: ${newService.name}`);

    return NextResponse.json({
      success: true,
      service: {
        id: newService.id,
        value: newService.code,
        label: newService.name,
        isActive: newService.isActive,
        isDefault: newService.isDefault
      }
    });

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_POST] Error creating courier service:', error);
    return NextResponse.json(
      { error: 'Failed to create courier service' },
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
    const { services } = body;

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: 'Services array is required' }, { status: 400 });
    }

    console.log(`📝 [API_COURIER_SERVICES_PUT] Updating courier services for client: ${user.clients.companyName}`);

    // Update courier services
    const updatePromises = services.map(async (service: any) => {
      if (service.id) {
        return prisma.courier_services.update({
          where: { id: service.id },
          data: {
            name: service.label,
            code: service.value,
            isActive: service.isActive !== false,
            isDefault: service.isDefault || false
          }
        });
      }
    });

    await Promise.all(updatePromises.filter(Boolean));

    console.log(`✅ [API_COURIER_SERVICES_PUT] Updated ${services.length} courier services`);

    return NextResponse.json({
      success: true,
      message: 'Courier services updated successfully'
    });

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_PUT] Error updating courier services:', error);
    return NextResponse.json(
      { error: 'Failed to update courier services' },
      { status: 500 }
    );
  }
}
