import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  applySecurityMiddleware, 
  InputValidator 
} from '@/lib/security-middleware';
import { securityConfig } from '@/lib/security-config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware (rate limiting for auth endpoints)
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'auth', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      return securityResponse;
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
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
      minLength: securityConfig.password.minLength,
      maxLength: securityConfig.password.maxLength
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

    // Generate JWT token using secure configuration
    if (!process.env.JWT_SECRET) {
      console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      );
    }
    
    const loginToken = jwt.sign(
      {
        userId: user.id,
        clientId: user.clientId,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
        issuer: process.env.JWT_ISSUER || 'scan2ship-saas',
        audience: process.env.JWT_AUDIENCE || 'scan2ship-users',
        algorithm: 'HS256'
      }
    );

    // Revoke existing active sessions for this user (optional - you can limit concurrent sessions)
    // This ensures only one active session per user at a time
    try {
      await prisma.sessions.updateMany({
        where: {
          userId: user.id,
          isActive: true
        },
        data: {
          isActive: false,
          revokedAt: new Date()
        }
      });
    } catch (revokeError) {
      console.warn('⚠️ [LOGIN] Could not revoke existing sessions:', revokeError);
      // Continue with session creation even if revocation fails
    }

    // Create new session
    const sessionExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    const now = new Date();
    const session = await prisma.sessions.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        clientId: user.clientId,
        sessionToken: loginToken,
        refreshToken: crypto.randomUUID(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        role: user.role,
        permissions: JSON.stringify(['read', 'write']),
        expiresAt: sessionExpiresAt,
        lastActivity: now,
        isActive: true,
        createdAt: now
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
    console.error('❌ [LOGIN] Login error:', error);
    console.error('❌ [LOGIN] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
