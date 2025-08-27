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

    // Create default pickup locations for the client
    const defaultPickupLocations = [
      { value: 'main-warehouse', label: 'Main Warehouse', delhiveryApiKey: null },
      { value: 'branch-office', label: 'Branch Office', delhiveryApiKey: null }
    ];

    try {
      await prisma.pickup_locations.createMany({
        data: defaultPickupLocations.map((location: any) => ({
          id: `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: client.id,
          value: location.value,
          label: location.label,
          delhiveryApiKey: location.delhiveryApiKey
        }))
      });
      console.log(`✅ [REGISTER_CLIENT] Created ${defaultPickupLocations.length} default pickup locations for client ${client.id}`);
    } catch (error) {
      console.log(`⚠️ [REGISTER_CLIENT] Failed to create default pickup locations:`, error.message);
    }

    // Create default courier services for the client
    const defaultCourierServices = [
      { code: 'delhivery', name: 'Delhivery', isActive: true, isDefault: true },
      { code: 'india_post', name: 'India Post', isActive: true, isDefault: false }
    ];

    try {
      await prisma.courier_services.createMany({
        data: defaultCourierServices.map((service: any) => ({
          id: `courier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: client.id,
          code: service.code,
          name: service.name,
          isActive: service.isActive,
          isDefault: service.isDefault
        }))
      });
      console.log(`✅ [REGISTER_CLIENT] Created ${defaultCourierServices.length} default courier services for client ${client.id}`);
    } catch (error) {
      console.log(`⚠️ [REGISTER_CLIENT] Failed to create default courier services:`, error.message);
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
