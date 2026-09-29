import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { resolveUserProvisioning } from '@/lib/application/user-provisioning';

export async function POST(request: NextRequest) {
  try {
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'auth', cors: true, securityHeaders: true }
    );

    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CLIENT_ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }
    const creator = authResult.user!;

    const body = await request.json();
    const { name, email, password } = body ?? {};

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const decision = resolveUserProvisioning(creator, { clientId: body.clientId, role: body.role });
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status });
    }
    const { clientId, role } = decision;

    // Check if client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client is active
    if (!client.isActive) {
      return NextResponse.json(
        { error: 'Client account is deactivated' },
        { status: 400 }
      );
    }

    // Check if user already exists for this client
    const existingUser = await prisma.users.findFirst({
      where: {
        email,
        clientId
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists for this client' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.users.create({
      data: {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        name,
        password: hashedPassword,
        role,
        isActive: true,
        clientId,
        createdBy: creator.id,
        updatedAt: new Date()
      }
    });

    // Create default pickup locations for the client (only if they don't exist)
    const defaultPickupLocations = [
      { value: 'main-warehouse', label: 'Main Warehouse', delhiveryApiKey: null },
      { value: 'branch-office', label: 'Branch Office', delhiveryApiKey: null }
    ];

    for (const location of defaultPickupLocations) {
      // Check if this pickup location already exists for this client
      const existingLocation = await prisma.pickup_locations.findFirst({
        where: {
          clientId: client.id,
          value: location.value
        }
      });

      if (!existingLocation) {
        try {
          await prisma.pickup_locations.create({
            data: {
              id: `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              clientId: client.id,
              value: location.value,
              label: location.label,
              delhiveryApiKey: location.delhiveryApiKey
            }
          });
          console.log(`Created pickup location: ${location.label} for client ${client.id}`);
        } catch (error: any) {
          console.log(`Failed to create pickup location ${location.label}:`, error.message);
        }
      } else {
        console.log(`Pickup location ${location.label} already exists for client ${client.id}, skipping...`);
      }
    }

    // Create default courier services for the client (only if they don't exist)
    const defaultCourierServices = [
      { code: 'delhivery', name: 'Delhivery', isActive: true },
      { code: 'dtdc', name: 'DTDC', isActive: true },
      { code: 'india_post', name: 'India Post', isActive: true },
      { code: 'manual', name: 'Manual', isActive: true }
    ];

    for (const service of defaultCourierServices) {
      // Check if this courier service already exists for this client
      const existingService = await prisma.courier_services.findFirst({
        where: {
          clientId: client.id,
          code: service.code
        }
      });

      if (!existingService) {
        try {
          await prisma.courier_services.create({
            data: {
              id: `courier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              clientId: client.id,
              code: service.code,
              name: service.name,
              isActive: service.isActive
            }
          });
          console.log(`Created courier service: ${service.name} for client ${client.id}`);
        } catch (error: any) {
          console.log(`Failed to create courier service ${service.name}:`, error.message);
        }
      } else {
        console.log(`Courier service ${service.name} already exists for client ${client.id}, skipping...`);
      }
    }

    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId
      }
    });

  } catch (error: any) {
    console.error('User registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
