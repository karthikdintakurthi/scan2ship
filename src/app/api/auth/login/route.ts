import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  applySecurityMiddleware, 
  InputValidator 
} from '@/lib/security-middleware';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware (rate limiting for auth endpoints)
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'auth', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      return securityResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Input validation
    const emailValidation = InputValidator.validateEmail(body.email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }
    
    const passwordValidation = InputValidator.validateString(body.password, {
      required: true,
      minLength: 6,
      maxLength: 128
    });
    
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const { email, password } = {
      email: emailValidation.value!,
      password: passwordValidation.value!
    };

    // Find user with client information
    const user = await prisma.users.findFirst({
      where: { 
        email: email,
        isActive: true
      },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user's client is active
    if (!user.clients || !user.clients.isActive) {
      return NextResponse.json(
        { error: 'Client account is inactive' },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    if (!user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token using basic jwt.sign
    const loginToken = jwt.sign(
      {
        userId: user.id,
        clientId: user.clientId,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      {
        expiresIn: '8h',
        issuer: 'vanitha-logistics',
        audience: 'vanitha-logistics-users',
        algorithm: 'HS256'
      }
    );

    // Create or update session
    const session = await prisma.sessions.upsert({
      where: {
        token: loginToken
      },
      update: {
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      },
      create: {
        id: crypto.randomUUID(),
        userId: user.id,
        clientId: user.clientId,
        token: loginToken,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        createdAt: new Date()
      }
    });

    // Return user data and session
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        clientId: user.clientId,
        clients: user.clients
      },
      client: user.clients,
      session: {
        token: loginToken,
        expiresAt: session.expiresAt
      }
    });

    // Apply security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
