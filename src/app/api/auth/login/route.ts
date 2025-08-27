import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.users.findFirst({
      where: { email },
      include: {
        clients: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Check if client is active
    if (!user.clients.isActive) {
      return NextResponse.json(
        { error: 'Client account is deactivated' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password || '');
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const session = await prisma.sessions.create({
      data: {
        id: crypto.randomUUID(), // Generate unique ID for session
        userId: user.id,
        clientId: user.clientId,
        token: jwt.sign(
          { 
            userId: user.id, 
            clientId: user.clientId,
            email: user.email,
            role: user.role 
          },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        ),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Return user data (without password) and session
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      user: userWithoutPassword,
      client: user.clients,
      session: {
        id: session.id,
        userId: session.userId,
        clientId: session.clientId,
        token: session.token,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
