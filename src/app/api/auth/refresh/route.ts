import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import {
  hashRefreshToken,
  newRefreshToken,
  SESSION_MAX_AGE_MS,
  SESSION_TTL_MS,
  signSessionToken,
} from '@/lib/session-tokens';

const INVALID = { error: 'Invalid refresh token' };

/**
 * POST /api/auth/refresh  { refreshToken }
 *
 * Exchanges the opaque refresh token issued at login for a new access token
 * and a new refresh token (the old one stops working). Access tokens (JWTs)
 * are not accepted here. The session must still be active, not revoked, and
 * less than SESSION_MAX_AGE_MS old; the user and client must still be active.
 */
export async function POST(request: NextRequest) {
  try {
    const securityResponse = await applySecurityMiddleware(request, new NextResponse(), {
      rateLimit: 'session',
      cors: true,
      securityHeaders: true,
    });
    if (securityResponse) {
      return securityResponse;
    }

    const body = await request.json().catch(() => null);
    const refreshToken = body && typeof body.refreshToken === 'string' ? body.refreshToken : '';
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const session = await prisma.sessions.findUnique({
      where: { refreshToken: hashRefreshToken(refreshToken) },
      include: { users: { include: { clients: true } } },
    });

    const now = Date.now();
    if (
      !session ||
      !session.isActive ||
      session.revokedAt ||
      now - session.createdAt.getTime() > SESSION_MAX_AGE_MS
    ) {
      return NextResponse.json(INVALID, { status: 401 });
    }

    const user = session.users;
    if (!user || !user.isActive || !user.clients?.isActive || user.clientId !== session.clientId) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const token = signSessionToken(user);
    const next = newRefreshToken();
    const expiresAt = new Date(now + SESSION_TTL_MS);

    // Rotate only if the presented token is still current, so two concurrent
    // refreshes with the same token cannot both succeed.
    const rotated = await prisma.sessions.updateMany({
      where: { id: session.id, refreshToken: session.refreshToken, isActive: true },
      data: {
        sessionToken: token,
        refreshToken: next.hash,
        role: user.role,
        expiresAt,
        lastActivity: new Date(now),
      },
    });
    if (rotated.count !== 1) {
      return NextResponse.json(INVALID, { status: 401 });
    }

    const { password: _password, clients, ...userWithoutPassword } = user;
    return NextResponse.json({
      user: userWithoutPassword,
      client: clients,
      token,
      session: {
        id: session.id,
        userId: user.id,
        clientId: user.clientId,
        token,
        refreshToken: next.token,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
