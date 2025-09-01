/**
 * JWT Authentication Middleware
 * Provides secure JWT verification with role-based access control
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { jwtConfig } from './jwt-config';
import { prisma } from './prisma';

export interface AuthenticatedUser {
  userId: string;
  clientId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Verify JWT token with enhanced security
 */
export function verifyJWT(token: string): AuthResult {
  try {
    // Basic token format validation
    if (!token || typeof token !== 'string') {
      return {
        success: false,
        error: 'Invalid token format',
        statusCode: 401
      };
    }

    // Verify JWT with secure configuration
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.options.issuer,
      audience: jwtConfig.options.audience,
      algorithms: [jwtConfig.options.algorithm]
    }) as AuthenticatedUser;

    // Validate required fields
    if (!decoded.userId || !decoded.clientId || !decoded.email || !decoded.role) {
      return {
        success: false,
        error: 'Invalid token payload',
        statusCode: 401
      };
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return {
        success: false,
        error: 'Token expired',
        statusCode: 401
      };
    }

    // Check if token is too old (refresh threshold)
    const refreshThreshold = now - (8 * 60 * 60); // 8 hours ago
    if (decoded.iat && decoded.iat < refreshThreshold) {
      return {
        success: false,
        error: 'Token too old, please refresh',
        statusCode: 401
      };
    }

    return {
      success: true,
      user: decoded
    };

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Token expired',
        statusCode: 401
      };
    } else if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid token',
        statusCode: 401
      };
    } else if (error instanceof jwt.NotBeforeError) {
      return {
        success: false,
        error: 'Token not yet valid',
        statusCode: 401
      };
    } else {
      return {
        success: false,
        error: 'Token verification failed',
        statusCode: 500
      };
    }
  }
}

/**
 * Authenticate user from request headers
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No authorization header or invalid format',
        statusCode: 401
      };
    }

    const token = authHeader.substring(7);
    const authResult = verifyJWT(token);
    
    if (!authResult.success || !authResult.user) {
      return authResult;
    }

    // Verify user exists and is active in database
    const user = await prisma.users.findUnique({
      where: { id: authResult.user.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        error: 'User not found or inactive',
        statusCode: 401
      };
    }

    if (!user.clients || !user.clients.isActive) {
      return {
        success: false,
        error: 'Client account is inactive',
        statusCode: 401
      };
    }

    // Update user data with latest from database
    authResult.user.role = user.role;
    authResult.user.email = user.email;

    return authResult;

  } catch (error) {
    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 500
    };
  }
}

/**
 * Authenticate admin user (admin or master_admin role)
 */
export async function authenticateAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateUser(request);
  
  if (!authResult.success) {
    return authResult;
  }

  if (!authResult.user || (authResult.user.role !== 'admin' && authResult.user.role !== 'master_admin')) {
    return {
      success: false,
      error: 'Insufficient privileges',
      statusCode: 403
    };
  }

  return authResult;
}

/**
 * Authenticate master admin user only
 */
export async function authenticateMasterAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateUser(request);
  
  if (!authResult.success) {
    return authResult;
  }

  if (!authResult.user || authResult.user.role !== 'master_admin') {
    return {
      success: false,
      error: 'Master admin privileges required',
      statusCode: 403
    };
  }

  return authResult;
}

/**
 * Generate JWT token with role-based expiry
 */
export function generateJWT(payload: {
  userId: string;
  clientId: string;
  email: string;
  role: string;
}, operation: 'login' | 'refresh' | 'api' = 'login'): string {
  
  // Different expiry times based on operation
  let expiresIn: string;
  switch (operation) {
    case 'login':
      expiresIn = '8h'; // Standard login session
      break;
    case 'refresh':
      expiresIn = '24h'; // Refresh token (longer expiry)
      break;
    case 'api':
      expiresIn = '1h'; // API operations (shorter expiry)
      break;
    default:
      expiresIn = '8h';
  }

  return jwt.sign(payload, jwtConfig.secret, {
    ...jwtConfig.options,
    expiresIn
  });
}

/**
 * Refresh JWT token if it's close to expiry
 */
export function shouldRefreshToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    const refreshThreshold = 15 * 60; // 15 minutes
    
    return timeUntilExpiry < refreshThreshold;
  } catch {
    return true;
  }
}
