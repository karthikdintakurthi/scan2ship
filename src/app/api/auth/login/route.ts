import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  applySecurityMiddleware, 
  InputValidator 
} from '@/lib/security-middleware';
import { securityConfig } from '@/lib/security-config';
import { newRefreshToken, SESSION_TTL_MS, signSessionToken } from '@/lib/session-tokens';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
    } catch {
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
    
    // Compare the password exactly as typed: registration hashes it unmodified, so
    // trimming or stripping characters here would lock some users out. Length policy
    // is enforced when a password is set, not at login.
    if (typeof body.password !== 'string' || body.password.length === 0) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    if (body.password.length > securityConfig.password.maxLength) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const email = emailValidation.value!;
    const password: string = body.password;

    // Find user with client information. Emails are stored lower-case, but older
    // accounts may have been saved as typed, so match without regard to case.
    const user = await prisma.users.findFirst({
      where: { 
        email: { equals: email, mode: 'insensitive' },
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
    
    const loginToken = signSessionToken(user);
    const refresh = newRefreshToken();

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
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const now = new Date();
    const session = await prisma.sessions.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        clientId: user.clientId,
        sessionToken: loginToken,
        refreshToken: refresh.hash,
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
        refreshToken: refresh.token,
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
