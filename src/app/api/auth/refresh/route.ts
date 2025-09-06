import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enhancedJwtConfig } from '@/lib/jwt-config';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = enhancedJwtConfig.verifyToken(refreshToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if user exists and is active
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      clientId: user.clientId,
      email: user.email,
      role: user.role
    };

    const newLoginToken = enhancedJwtConfig.generateToken(tokenPayload, 'login');
    const newRefreshToken = enhancedJwtConfig.generateToken(tokenPayload, 'refresh');

    // Update session in database
    const session = await prisma.sessions.findFirst({
      where: {
        userId: user.id,
        clientId: user.clientId
      }
    });

    if (session) {
      await prisma.sessions.update({
        where: { id: session.id },
        data: {
          token: newLoginToken,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
        }
      });
    }

    // Return new tokens
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      user: userWithoutPassword,
      client: user.clients,
      session: {
        id: session?.id,
        userId: user.id,
        clientId: user.clientId,
        token: newLoginToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        tokenInfo: enhancedJwtConfig.getTokenInfo(newLoginToken)
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
