import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

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

    console.log(`📊 [API_COURIER_SERVICES_GET] Fetching courier services for client: ${user.clientId}`);

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
      isDefault: service.isDefault,
      // Rate calculation fields
      baseRate: service.baseRate,
      ratePerKg: service.ratePerKg,
      minWeight: service.minWeight,
      maxWeight: service.maxWeight,
      codCharges: service.codCharges,
      freeShippingThreshold: service.freeShippingThreshold,
      estimatedDays: service.estimatedDays
    }));

    console.log(`✅ [API_COURIER_SERVICES_GET] Found ${formattedServices.length} courier services for client ${user.clientId}`);
    console.log(`📋 [API_COURIER_SERVICES_GET] Formatted services:`, formattedServices);

    // Get client name for response
    const client = await prisma.clients.findUnique({
      where: { id: user.clientId },
      select: { companyName: true }
    });

    const response = NextResponse.json({
      courierServices: formattedServices,
      clientId: user.clientId,
      clientName: client?.companyName || user.clientId
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
    const { 
      name, 
      code, 
      isActive,
      baseRate,
      ratePerKg,
      minWeight,
      maxWeight,
      codCharges,
      freeShippingThreshold,
      estimatedDays
    } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    console.log(`📝 [API_COURIER_SERVICES_POST] Creating courier service for client: ${user.clientId}`);

    // Create new courier service with rate configuration
    const newService = await prisma.courier_services.create({
      data: {
        id: `courier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        code: code,
        isActive: isActive !== false,
        isDefault: false,
        clientId: user.clientId,
        // Rate calculation fields
        baseRate: baseRate ? parseFloat(baseRate) : null,
        ratePerKg: ratePerKg ? parseFloat(ratePerKg) : null,
        minWeight: minWeight ? parseFloat(minWeight) : null,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        codCharges: codCharges ? parseFloat(codCharges) : null,
        freeShippingThreshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null
      }
    });

    console.log(`✅ [API_COURIER_SERVICES_POST] Created courier service: ${newService.name}`);

    const response = NextResponse.json({
      success: true,
      service: {
        id: newService.id,
        value: newService.code,
        label: newService.name,
        isActive: newService.isActive,
        isDefault: newService.isDefault,
        baseRate: newService.baseRate,
        ratePerKg: newService.ratePerKg,
        minWeight: newService.minWeight,
        maxWeight: newService.maxWeight,
        codCharges: newService.codCharges,
        freeShippingThreshold: newService.freeShippingThreshold,
        estimatedDays: newService.estimatedDays
      }
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_POST] Error creating courier service:', error);
    const response = NextResponse.json(
      { error: 'Failed to create courier service' },
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
    const { services } = body;

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: 'Services array is required' }, { status: 400 });
    }

    console.log(`📝 [API_COURIER_SERVICES_PUT] Updating courier services for client: ${user.clientId}`);

    // Update courier services with rate configuration
    const updatePromises = services.map(async (service: any) => {
      if (service.id) {
        return prisma.courier_services.update({
          where: { id: service.id },
          data: {
            name: service.label,
            code: service.value,
            isActive: service.isActive !== false,
            isDefault: service.isDefault || false,
            // Rate calculation fields
            baseRate: service.baseRate ? parseFloat(service.baseRate) : null,
            ratePerKg: service.ratePerKg ? parseFloat(service.ratePerKg) : null,
            minWeight: service.minWeight ? parseFloat(service.minWeight) : null,
            maxWeight: service.maxWeight ? parseFloat(service.maxWeight) : null,
            codCharges: service.codCharges ? parseFloat(service.codCharges) : null,
            freeShippingThreshold: service.freeShippingThreshold ? parseFloat(service.freeShippingThreshold) : null,
            estimatedDays: service.estimatedDays ? parseInt(service.estimatedDays) : null
          }
        });
      }
    });

    await Promise.all(updatePromises.filter(Boolean));

    console.log(`✅ [API_COURIER_SERVICES_PUT] Updated ${services.length} courier services`);

    const response = NextResponse.json({
      success: true,
      message: 'Courier services updated successfully'
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_PUT] Error updating courier services:', error);
    const response = NextResponse.json(
      { error: 'Failed to update courier services' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}