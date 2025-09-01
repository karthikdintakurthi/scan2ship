/**
 * Comprehensive Authentication & Authorization Middleware
 * Provides consistent role-based access control and session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// User roles and permissions
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Permission levels
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  [UserRole.USER]: [
    PermissionLevel.READ,
    PermissionLevel.WRITE
  ],
  [UserRole.ADMIN]: [
    PermissionLevel.READ,
    PermissionLevel.WRITE,
    PermissionLevel.DELETE,
    PermissionLevel.ADMIN
  ],
  [UserRole.SUPER_ADMIN]: [
    PermissionLevel.READ,
    PermissionLevel.WRITE,
    PermissionLevel.DELETE,
    PermissionLevel.ADMIN
  ]
};

// Interface for authenticated user
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  clientId: string;
  isActive: boolean;
  client: {
    id: string;
    isActive: boolean;
    subscriptionStatus: string;
    subscriptionExpiresAt: Date | null;
  };
  permissions: PermissionLevel[];
}

// Interface for authorization options
export interface AuthorizationOptions {
  requiredRole?: UserRole;
  requiredPermissions?: PermissionLevel[];
  requireActiveUser?: boolean;
  requireActiveClient?: boolean;
  requireValidSubscription?: boolean;
}

/**
 * Get authenticated user from JWT token
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Use basic JWT verification to match the login endpoint
    const jwt = require('jsonwebtoken');
    let decoded;
    
    try {
      // Verify JWT token with secure configuration
      if (!process.env.JWT_SECRET) {
        console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set');
        throw new Error('JWT_SECRET environment variable is required for secure authentication');
      }
      
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'vanitha-logistics',
        audience: 'vanitha-logistics-users',
        algorithms: ['HS256']
      });
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
    
    if (!decoded || !decoded.userId) {
      return null;
    }
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: {
          select: {
            id: true,
            isActive: true,
            subscriptionStatus: true,
            subscriptionExpiresAt: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Check if client is active
    if (!user.clients || !user.clients.isActive) {
      return null;
    }

    // Get user permissions based on role
    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || [];

    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      clientId: user.clientId,
      isActive: user.isActive,
      client: user.clients,
      permissions
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(user: AuthenticatedUser, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.USER]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.SUPER_ADMIN]: 3
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Check if user has required permissions
 */
export function hasRequiredPermissions(user: AuthenticatedUser, requiredPermissions: PermissionLevel[]): boolean {
  return requiredPermissions.every(permission => user.permissions.includes(permission));
}

/**
 * Check if user's subscription is valid
 */
export function hasValidSubscription(user: AuthenticatedUser): boolean {
  // If subscriptionExpiresAt is null, it means unlimited/never expires
  if (!user.client.subscriptionExpiresAt) {
    return true;
  }
  
  // Check if subscription has expired
  return new Date() < user.client.subscriptionExpiresAt;
}

/**
 * Authorization middleware
 */
export async function authorizeUser(
  request: NextRequest,
  options: AuthorizationOptions = {}
): Promise<{ user: AuthenticatedUser; response?: NextResponse } | { user: null; response: NextResponse }> {
  const {
    requiredRole = UserRole.USER,
    requiredPermissions = [],
    requireActiveUser = true,
    requireActiveClient = true,
    requireValidSubscription = false
  } = options;

  // Get authenticated user
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  // Check if user is active
  if (requireActiveUser && !user.isActive) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'User account is deactivated' },
        { status: 403 }
      )
    };
  }

  // Check if client is active
  if (requireActiveClient && !user.client.isActive) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Client account is deactivated' },
        { status: 403 }
      )
    };
  }

  // Check if user has required role
  if (!hasRequiredRole(user, requiredRole)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: `Insufficient permissions. Required role: ${requiredRole}` },
        { status: 403 }
      )
    };
  }

  // Check if user has required permissions
  if (requiredPermissions.length > 0 && !hasRequiredPermissions(user, requiredPermissions)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}` },
        { status: 403 }
      )
    };
  }

  // Check subscription validity
  if (requireValidSubscription && !hasValidSubscription(user)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Subscription has expired. Please renew to continue.' },
        { status: 403 }
      )
    };
  }

  return { user };
}

/**
 * Admin-only authorization
 */
export async function authorizeAdmin(request: NextRequest): Promise<{ user: AuthenticatedUser; response?: NextResponse } | { user: null; response: NextResponse }> {
  return authorizeUser(request, {
    requiredRole: UserRole.ADMIN,
    requiredPermissions: [PermissionLevel.ADMIN],
    requireActiveUser: true,
    requireActiveClient: true
  });
}

/**
 * Super admin authorization
 */
export async function authorizeSuperAdmin(request: NextRequest): Promise<{ user: AuthenticatedUser; response?: NextResponse } | { user: null; response: NextResponse }> {
  return authorizeUser(request, {
    requiredRole: UserRole.SUPER_ADMIN,
    requiredPermissions: [PermissionLevel.ADMIN],
    requireActiveUser: true,
    requireActiveClient: true
  });
}

/**
 * User authorization with subscription check
 */
export async function authorizeUserWithSubscription(request: NextRequest): Promise<{ user: AuthenticatedUser; response?: NextResponse } | { user: null; response: NextResponse }> {
  return authorizeUser(request, {
    requiredRole: UserRole.USER,
    requireActiveUser: true,
    requireActiveClient: true,
    requireValidSubscription: true
  });
}

/**
 * Check if user can access specific resource
 */
export async function canAccessResource(
  userId: string,
  resourceOwnerId: string,
  userRole: UserRole
): Promise<boolean> {
  // Super admins can access everything
  if (userRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Admins can access resources from their client
  if (userRole === UserRole.ADMIN) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { clientId: true }
    });

    const resourceOwner = await prisma.users.findUnique({
      where: { id: resourceOwnerId },
      select: { clientId: true }
    });

    return user?.clientId === resourceOwner?.clientId;
  }

  // Regular users can only access their own resources
  return userId === resourceOwnerId;
}
