import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

/**
 * GET /api/auth/verify  (Authorization: Bearer <access token>)
 *
 * Tells the app whether its stored token is still signed in. Uses the same
 * check as every API route, so a logged-out or revoked session is reported as
 * signed out immediately.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth || !auth.sessionId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [user, session] = await Promise.all([
      prisma.users.findUnique({ where: { id: auth.id }, include: { clients: true } }),
      prisma.sessions.findUnique({ where: { id: auth.sessionId }, select: { id: true, expiresAt: true } }),
    ]);

    if (!user || !session) {
      return NextResponse.json({ error: 'User or client not found or inactive' }, { status: 401 });
    }

    const { password: _password, ...userWithoutPassword } = user;
    return NextResponse.json({
      user: userWithoutPassword,
      client: user.clients,
      session: {
        id: session.id,
        userId: user.id,
        clientId: user.clientId,
        token: authHeader.slice(7),
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Session verification error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
