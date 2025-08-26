import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
             const {
           name,
           email,
           password,
           clientId,
           role = 'user'
         } = await request.json();

    // Validate required fields
    if (!name || !email || !password || !clientId) {
      return NextResponse.json(
        { error: 'Name, email, password, and client ID are required' },
        { status: 400 }
      );
    }

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

             // Create user
         const user = await prisma.users.create({
           data: {
             email,
             name,
             password: hashedPassword,
             role,
             isActive: true,
             clientId
           }
         });

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

  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
