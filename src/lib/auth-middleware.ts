/**
 * Comprehensive Authentication & Authorization Middleware
 * Provides consistent role-based access control and session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// User roles and permissions
export enum UserRole {
  CHILD_USER = 'child_user',
  USER = 'user',
  CLIENT_ADMIN = 'client_admin',
  SUPER_ADMIN = 'super_admin',
  MASTER_ADMIN = 'master_admin'
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
  [UserRole.CHILD_USER]: [
    PermissionLevel.READ,
    PermissionLevel.WRITE,
    PermissionLevel.DELETE  // Child users can manage their own data only
  ],
  [UserRole.USER]: [
    PermissionLevel.READ,
    PermissionLevel.WRITE,
    PermissionLevel.DELETE  // Regular users can manage all client data
  ],
  [UserRole.CLIENT_ADMIN]: [
    PermissionLevel.READ,
    PermissionLevel.WRITE,
    PermissionLevel.DELETE,
    PermissionLevel.ADMIN  // Client admins can manage users and all client data
  ],
  [UserRole.SUPER_ADMIN]: [
    PermissionLevel.READ,
    PermissionLevel.WRITE,
    PermissionLevel.DELETE,
    PermissionLevel.ADMIN
  ],
  [UserRole.MASTER_ADMIN]: [
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
  parentUserId?: string;
  createdBy?: string;
  client: {
    id: string;
    isActive: boolean;
    subscriptionStatus: string;
    subscriptionExpiresAt: Date | null;
  };
  permissions: PermissionLevel[];
  subGroups?: string[];
  pickupLocations?: string[];
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
    console.log('🔍 [GET_AUTH_USER] Starting authentication');
    
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth-token')?.value;
    
    console.log('🔍 [GET_AUTH_USER] Token sources - Header:', !!authHeader, 'Cookie:', !!cookieToken);
    
    let token: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('🔍 [GET_AUTH_USER] Using Bearer token from header');
    } else if (cookieToken) {
      token = cookieToken;
      console.log('🔍 [GET_AUTH_USER] Using token from cookie');
    } else {
      console.log('🚫 [GET_AUTH_USER] No token found in header or cookie');
      return null;
    }
    
    // Validate token format before verification
    if (!token || token.trim() === '') {
      console.error('🚨 JWT ERROR: Empty or null token');
      return null;
    }
    
    // Check if token has proper JWT format (3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('🚨 JWT ERROR: Invalid token format - expected 3 parts, got:', tokenParts.length);
      console.error('Token preview:', token.substring(0, 20) + '...');
      return null;
    }
    
    // Use basic JWT verification to match the login endpoint
    const jwt = require('jsonwebtoken');
    let decoded;
    
    try {
      console.log('🔍 [JWT_VERIFY] Starting JWT verification');
      
      // Verify JWT token with secure configuration
      if (!process.env.JWT_SECRET) {
        console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set');
        throw new Error('JWT_SECRET environment variable is required for secure authentication');
      }
      
      // Try multiple JWT verification strategies for backward compatibility
      let verificationError;
      
      // Strategy 1: Try scan2ship JWT verification with issuer/audience
      try {
        console.log('🔍 [JWT_VERIFY] Trying Strategy 1: scan2ship verification');
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          issuer: process.env.JWT_ISSUER || 'scan2ship-saas',
          audience: process.env.JWT_AUDIENCE || 'scan2ship-users',
          algorithms: ['HS256']
        });
        console.log('✅ [JWT_VERIFY] Strategy 1 successful');
      } catch (error) {
        console.log('❌ [JWT_VERIFY] Strategy 1 failed:', error.message);
        verificationError = error;
        
        // Strategy 2: Try without issuer/audience validation (for old tokens)
        try {
          console.log('🔍 [JWT_VERIFY] Trying Strategy 2: no issuer/audience');
          decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']
          });
          console.log('✅ [JWT_VERIFY] Strategy 2 successful');
        } catch (error2) {
          console.log('❌ [JWT_VERIFY] Strategy 2 failed:', error2.message);
          // Strategy 3: Try with old hardcoded values for backward compatibility
          try {
            console.log('🔍 [JWT_VERIFY] Trying Strategy 3: vanitha-logistics');
            decoded = jwt.verify(token, process.env.JWT_SECRET, {
              issuer: 'vanitha-logistics',
              audience: 'vanitha-logistics-users',
              algorithms: ['HS256']
            });
            console.log('✅ [JWT_VERIFY] Strategy 3 successful');
          } catch (error3) {
            console.log('❌ [JWT_VERIFY] All strategies failed');
            // All strategies failed
            throw verificationError; // Throw the first error
          }
        }
      }
    } catch (error) {
      console.error('🚨 JWT verification error:', error);
      console.error('Token preview:', token.substring(0, 50) + '...');
      console.error('Token length:', token.length);
      return null;
    }
    
    if (!decoded || !decoded.userId) {
      console.log('🚫 [JWT_VERIFY] No decoded token or userId found');
      return null;
    }
    
    console.log('✅ [JWT_VERIFY] JWT decoded successfully, userId:', decoded.userId);
    
    // Get user and client data from database
    console.log('🔍 [DB_QUERY] Fetching user from database');
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
        },
        userSubGroups: {
          include: {
            subGroups: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        userPickupLocations: {
          include: {
            pickup_locations: {
              select: {
                id: true,
                label: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('🚫 [DB_QUERY] User not found in database for userId:', decoded.userId);
      return null;
    }
    
    if (!user.isActive) {
      console.log('🚫 [DB_QUERY] User found but is not active:', user.email);
      return null;
    }
    
    console.log('✅ [DB_QUERY] User found and active:', user.email, user.role);

    // Check if client is active
    if (!user.clients || !user.clients.isActive) {
      return null;
    }

    // Get user permissions based on role
    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
    
    console.log(`🔍 [AUTH] User role from DB: ${user.role}`);
    console.log(`🔍 [AUTH] Cast role to enum: ${user.role as UserRole}`);
    console.log(`🔍 [AUTH] Available roles: ${Object.values(UserRole).join(', ')}`);
    console.log(`🔍 [AUTH] User permissions: ${permissions.join(', ')}`);

    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      clientId: user.clientId,
      isActive: user.isActive,
      parentUserId: user.parentUserId || undefined,
      createdBy: user.createdBy || undefined,
      client: user.clients,
      permissions,
      subGroups: user.userSubGroups?.map(usg => usg.subGroups.id) || [],
      pickupLocations: user.userPickupLocations?.map(upl => upl.pickup_locations.id) || []
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
    [UserRole.CHILD_USER]: 1,
    [UserRole.USER]: 2,
    [UserRole.CLIENT_ADMIN]: 3,
    [UserRole.SUPER_ADMIN]: 4,
    [UserRole.MASTER_ADMIN]: 5
  };

  const userRoleLevel = roleHierarchy[user.role];
  const requiredRoleLevel = roleHierarchy[requiredRole];

  console.log(`🔒 [ROLE_CHECK] User role: ${user.role}, level: ${userRoleLevel}`);
  console.log(`🔒 [ROLE_CHECK] Required role: ${requiredRole}, level: ${requiredRoleLevel}`);
  console.log(`🔒 [ROLE_CHECK] Comparison: ${userRoleLevel} >= ${requiredRoleLevel} = ${userRoleLevel >= requiredRoleLevel}`);

  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if user has required permissions
 */
export function hasRequiredPermissions(user: AuthenticatedUser, requiredPermissions: PermissionLevel[]): boolean {
  const hasAllPermissions = requiredPermissions.every(permission => user.permissions.includes(permission));
  
  console.log(`🔒 [PERMISSION_CHECK] User permissions: ${user.permissions.join(', ')}`);
  console.log(`🔒 [PERMISSION_CHECK] Required permissions: ${requiredPermissions.join(', ')}`);
  console.log(`🔒 [PERMISSION_CHECK] Has all permissions: ${hasAllPermissions}`);
  
  return hasAllPermissions;
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
  
  console.log('🔍 [AUTHORIZE_USER] User from getAuthenticatedUser:', user ? 'User found' : 'User not found');
  
  if (!user) {
    console.log('🚫 [AUTHORIZE_USER] No user found, returning 401');
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    };
  }
  
  console.log('✅ [AUTHORIZE_USER] User found, proceeding with authorization checks');

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
    console.log(`🔒 [AUTHORIZATION] Role check failed: user.role=${user.role}, requiredRole=${requiredRole}`);
    console.log(`🔒 [AUTHORIZATION] User permissions: ${user.permissions.join(', ')}`);
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

  // Check subscription validity - Fixed syntax error
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

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: AuthenticatedUser): boolean {
  console.log('🔍 [CAN_MANAGE_USERS] User role:', user.role, 'Type:', typeof user.role);
  console.log('🔍 [CAN_MANAGE_USERS] CLIENT_ADMIN:', UserRole.CLIENT_ADMIN, 'Type:', typeof UserRole.CLIENT_ADMIN);
  console.log('🔍 [CAN_MANAGE_USERS] Role comparison:', user.role === UserRole.CLIENT_ADMIN);
  
  const result = user.role === UserRole.CLIENT_ADMIN || 
         user.role === UserRole.SUPER_ADMIN || 
         user.role === UserRole.MASTER_ADMIN;
  
  console.log('🔍 [CAN_MANAGE_USERS] Result:', result);
  return result;
}

/**
 * Check if user can access all client data
 */
export function canAccessAllClientData(user: AuthenticatedUser): boolean {
  return user.role === UserRole.USER || 
         user.role === UserRole.CLIENT_ADMIN || 
         user.role === UserRole.SUPER_ADMIN || 
         user.role === UserRole.MASTER_ADMIN;
}

/**
 * Check if user can only access their own data
 */
export function canOnlyAccessOwnData(user: AuthenticatedUser): boolean {
  return user.role === UserRole.CHILD_USER;
}

/**
 * Check if user can access wallet/credits
 */
export function canAccessWallet(user: AuthenticatedUser): boolean {
  return user.role !== UserRole.CHILD_USER;
}

/**
 * Check if user can create child users
 */
export function canCreateChildUsers(user: AuthenticatedUser): boolean {
  return user.role === UserRole.CLIENT_ADMIN || 
         user.role === UserRole.SUPER_ADMIN || 
         user.role === UserRole.MASTER_ADMIN;
}

/**
 * Check if user can manage sub-groups
 */
export function canManageSubGroups(user: AuthenticatedUser): boolean {
  return user.role === UserRole.CLIENT_ADMIN || 
         user.role === UserRole.SUPER_ADMIN || 
         user.role === UserRole.MASTER_ADMIN;
}

