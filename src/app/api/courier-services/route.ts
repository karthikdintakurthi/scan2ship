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
        clients: {
          include: {
            courier_services: true
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
      console.log('❌ [API_COURIER_SERVICES_GET] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📊 [API_COURIER_SERVICES_GET] Fetching courier services for client: ${user.clients.companyName} (ID: ${user.clients.id})`);

    // Get courier services for the current client
    const courierServices = await prisma.courier_services.findMany({
      where: { clientId: user.clients.id },
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

    console.log(`✅ [API_COURIER_SERVICES_GET] Found ${formattedServices.length} courier services for client ${user.clients.companyName}`);
    console.log(`📋 [API_COURIER_SERVICES_GET] Formatted services:`, formattedServices);

    return NextResponse.json({
      courierServices: formattedServices,
      clientId: user.clients.id,
      clientName: user.clients.companyName
    });

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_GET] Error fetching courier services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courier services' },
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
    const { name, code, isActive, isDefault } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    console.log(`📝 [API_COURIER_SERVICES_POST] Creating courier service for client: ${user.clients.companyName}`);

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

    // Generate a unique ID for the courier service
    const serviceId = `courier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create new courier service
    const newService = await prisma.courier_services.create({
      data: {
        id: serviceId,
        name: name,
        code: code,
        isActive: isActive !== false,
        isDefault: isDefault || false,
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
