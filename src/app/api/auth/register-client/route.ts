import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      companyName,
      email,
      phone,
      address,
      city,
      state,
      country,
      pincode,
      password
    } = await request.json();

    // Validate required fields
    if (!name || !companyName || !email || !password) {
      return NextResponse.json(
        { error: 'Name, company name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if client already exists
    const existingClient = await prisma.clients.findUnique({
      where: { email }
    });

    if (existingClient) {
      return NextResponse.json(
        { error: 'Client with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create client
    const client = await prisma.clients.create({
      data: {
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        companyName,
        email,
        phone,
        address,
        city,
        state,
        country: country || 'India',
        pincode,
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Create user for the client (not admin)
    const clientUser = await prisma.users.create({
      data: {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        name,
        password: hashedPassword,
        role: 'user',
        isActive: true,
        clientId: client.id,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [REGISTER_CLIENT] Created client user: ${clientUser.email} with role: ${clientUser.role}`);

    // Create pickup locations
    if (pickupLocations && pickupLocations.length > 0) {
      await prisma.pickup_locations.createMany({
        data: pickupLocations.map((location: any) => ({
          id: `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: client.id,
          value: location.value,
          label: location.label,
          delhiveryApiKey: location.delhiveryApiKey || null
        }))
      });
    }

    // Create courier services
    if (courierServices && courierServices.length > 0) {
      await prisma.courier_services.createMany({
        data: courierServices.map((service: any) => ({
          id: `courier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: client.id,
          value: service.value,
          label: service.label,
          isActive: true
        }))
      });
    }

    return NextResponse.json({
      message: 'Client registered successfully',
      client: {
        id: client.id,
        name: client.name,
        companyName: client.companyName,
        email: client.email
      }
    });

  } catch (error) {
    console.error('Client registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
