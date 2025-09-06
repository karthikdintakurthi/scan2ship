/**
 * Authentication Utilities
 * Provides standardized authentication helpers for API endpoints
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt-utils';

/**
 * Get authenticated user from request
 * Returns null if authentication fails
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }

    return {
      userId: user.id,
      user: user,
      client: user.clients
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get authenticated user with role check
 * Returns null if authentication fails or role doesn't match
 */
export async function getAuthenticatedUserWithRole(
  request: NextRequest, 
  allowedRoles: string[]
) {
  const auth = await getAuthenticatedUser(request);
  
  if (!auth || !allowedRoles.includes(auth.user.role)) {
    return null;
  }
  
  return auth;
}

/**
 * Get authenticated admin user
 * Returns null if not admin or authentication fails
 */
export async function getAuthenticatedAdmin(request: NextRequest) {
  return getAuthenticatedUserWithRole(request, ['admin', 'master_admin']);
}
