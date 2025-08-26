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
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        client: {
          include: {
            courierServices: true
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

    console.log(`📊 [API_COURIER_SERVICES_GET] Fetching courier services for client: ${user.client.companyName} (ID: ${user.client.id})`);

    // Get courier services for the current client
    const courierServices = await prisma.courierService.findMany({
      where: { clientId: user.client.id },
      orderBy: { label: 'asc' }
    });

    console.log(`🔍 [API_COURIER_SERVICES_GET] Raw courier services from DB:`, courierServices);

    // Transform courier services to match the expected format
    const formattedServices = courierServices.map(service => ({
      value: service.value,
      label: service.label,
      isActive: service.isActive
    }));

    console.log(`✅ [API_COURIER_SERVICES_GET] Found ${formattedServices.length} courier services for client ${user.client.companyName}`);
    console.log(`📋 [API_COURIER_SERVICES_GET] Formatted services:`, formattedServices);

    return NextResponse.json({
      courierServices: formattedServices,
      clientId: user.client.id,
      clientName: user.client.companyName
    });

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_GET] Error fetching courier services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courier services' },
      { status: 500 }
    );
  }
}
