import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '@/lib/jwt-config';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token with backward-compatible configuration
    let decoded;
    let verificationError;
    
    // Strategy 1: Try with new configuration
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        issuer: process.env.JWT_ISSUER || 'scan2ship-saas',
        audience: process.env.JWT_AUDIENCE || 'scan2ship-users',
        algorithms: ['HS256']
      }) as any;
    } catch (error) {
      verificationError = error;
      
      // Strategy 2: Try without issuer/audience validation (for old tokens)
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!, {
          algorithms: ['HS256']
        }) as any;
      } catch (error2) {
        // Strategy 3: Try with old hardcoded values for backward compatibility
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET!, {
            issuer: 'vanitha-logistics',
            audience: 'vanitha-logistics-users',
            algorithms: ['HS256']
          }) as any;
        } catch (error3) {
          return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
          );
        }
      }
    }

    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return NextResponse.json(
        { error: 'User or client not found or inactive' },
        { status: 401 }
      );
    }

    // Return user and client data
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      user: userWithoutPassword,
      client: user.clients,
      session: {
        id: 'session-id', // We'll implement proper session management later
        userId: user.id,
        clientId: user.clientId,
        token: token,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours from now
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
