import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { enhancedJwtConfig } from '@/lib/jwt-config';

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

    // Generate JWT token with operation-specific expiry
    const tokenPayload = {
      userId: user.id,
      clientId: user.clientId,
      email: user.email,
      role: user.role
    };

    // Generate login token (8 hours) and refresh token (24 hours)
    const loginToken = enhancedJwtConfig.generateToken(tokenPayload, 'login');
    const refreshToken = enhancedJwtConfig.generateToken(tokenPayload, 'refresh');

    // Create session with enhanced security
    const session = await prisma.sessions.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        clientId: user.clientId,
        token: loginToken,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
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
        token: loginToken,
        refreshToken: refreshToken,
        expiresAt: session.expiresAt,
        tokenInfo: enhancedJwtConfig.getTokenInfo(loginToken)
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
