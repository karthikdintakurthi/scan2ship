import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';

/**
 * POST /api/auth/logout  (Authorization: Bearer <access token>)
 *
 * Ends the session behind the presented token, so that token and its refresh
 * token stop working immediately. The user's other devices stay signed in.
 * Always answers 200, whether or not the token matched a live session, so the
 * endpoint reveals nothing about tokens; an expired token can still be logged out.
 */
export async function POST(request: NextRequest) {
  const securityResponse = await applySecurityMiddleware(request, new NextResponse(), {
    rateLimit: 'auth',
    cors: true,
    securityHeaders: true,
  });
  if (securityResponse) {
    return securityResponse;
  }

  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (token) {
    try {
      await prisma.sessions.updateMany({
        where: { sessionToken: token, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });
    } catch (error) {
      console.error('❌ [LOGOUT] Could not revoke session:', error instanceof Error ? error.message : String(error));
      return NextResponse.json({ error: 'Logout failed, please try again' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
