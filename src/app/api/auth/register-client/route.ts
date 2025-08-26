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
        isActive: true
      }
    });

    // Create user for the client (not admin)
    const clientUser = await prisma.users.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'user',
        isActive: true,
        clientId: client.id
      }
    });

    console.log(`✅ [REGISTER_CLIENT] Created client user: ${clientUser.email} with role: ${clientUser.role}`);

    // Create default pickup locations for the client
    const defaultPickupLocations = [
      { value: 'main-warehouse', label: 'Main Warehouse', delhiveryApiKey: null },
      { value: 'branch-office', label: 'Branch Office', delhiveryApiKey: null }
    ];

    for (const location of defaultPickupLocations) {
      await prisma.pickupLocation.create({
        data: {
          ...location,
          clientId: client.id
        }
      });
    }

    // Create default courier services for the client
    const defaultCourierServices = [
      { value: 'delhivery', label: 'Delhivery', isActive: true },
      { value: 'dtdc', label: 'DTDC', isActive: true },
      { value: 'india_post', label: 'India Post', isActive: true },
      { value: 'manual', label: 'Manual', isActive: true }
    ];

    for (const service of defaultCourierServices) {
      await prisma.courierService.create({
        data: {
          ...service,
          clientId: client.id
        }
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
