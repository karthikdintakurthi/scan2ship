import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

/** Lifetime of a website access token and of each session extension. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** A session can be refreshed for at most this long after sign-in; then the user signs in again. */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionTokenSubject = {
  id: string;
  clientId: string;
  email: string;
  role: string;
};

/**
 * Website access token. Signed exactly as getAuthenticatedUser verifies it
 * (JWT_SECRET, issuer, audience, HS256), so login and refresh issue the same kind of token.
 */
export function signSessionToken(user: SessionTokenSubject): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { userId: user.id, clientId: user.clientId, email: user.email, role: user.role },
    secret,
    {
      // Unique per token: two logins in the same second must not produce the same
      // token, since each one keys its own session (sessions.sessionToken is unique).
      jwtid: crypto.randomUUID(),
      expiresIn: Math.floor(SESSION_TTL_MS / 1000),
      issuer: process.env.JWT_ISSUER || 'scan2ship-saas',
      audience: process.env.JWT_AUDIENCE || 'scan2ship-users',
      algorithm: 'HS256',
    }
  );
}

/**
 * Opaque refresh token. Only its hash is stored (sessions.refreshToken), so a
 * database read does not reveal usable tokens.
 */
export function newRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return `sha256:${crypto.createHash('sha256').update(token).digest('hex')}`;
}

/**
 * Ends a user's website sessions, e.g. after a password change or reset, or on
 * deactivation. Pass keepSessionId to leave the caller's own device signed in.
 * Their access tokens stop working on the next request.
 */
export async function revokeUserSessions(
  userId: string,
  options: { keepSessionId?: string } = {}
): Promise<number> {
  const result = await prisma.sessions.updateMany({
    where: {
      userId,
      isActive: true,
      ...(options.keepSessionId ? { id: { not: options.keepSessionId } } : {}),
    },
    data: { isActive: false, revokedAt: new Date() },
  });
  return result.count;
}
