/**
 * Secure JWT Configuration Utility
 * Handles JWT secret validation and provides secure defaults
 */

import { securityConfig } from './security-config';
import { jwtSecretManager } from './jwt-secret-manager';

// Validate JWT secret environment variable
function validateJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    // During build time, use a fallback secret if JWT_SECRET is not set
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('⚠️ JWT_SECRET not set, using fallback for build. Please set JWT_SECRET in production.');
      return 'vanitha-logistics-fallback-jwt-secret-for-build-time-only-64-chars';
    }
    throw new Error('JWT_SECRET environment variable is required for secure authentication');
  }
  
  // Ensure minimum length for security (at least 32 characters)
  if (secret.length < 32) {
    // During build time, use a fallback secret if JWT_SECRET is too short
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('⚠️ JWT_SECRET too short, using fallback for build. Please set JWT_SECRET to at least 32 characters in production.');
      return 'vanitha-logistics-fallback-jwt-secret-for-build-time-only-64-chars';
    }
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }
  
  // Check for common weak secrets
  const weakSecrets = [
    'fallback-secret',
    'your-secret-here',
    'change-me',
    'secret',
    'password',
    '123456',
    'admin',
    'test'
  ];
  
  if (weakSecrets.includes(secret.toLowerCase())) {
    throw new Error('JWT_SECRET cannot use common weak values - please use a strong, unique secret');
  }
  
  return secret;
}

// Get validated JWT secret
export function getJwtSecret(): string {
  return validateJwtSecret();
}

// JWT configuration options using centralized security config
export const jwtConfig = {
  secret: getJwtSecret(),
  options: {
    expiresIn: securityConfig.jwt.expiresIn,
    issuer: securityConfig.jwt.issuer,
    audience: securityConfig.jwt.audience,
    algorithm: securityConfig.jwt.algorithm
  }
};

// Enhanced JWT configuration with operation-based expiry
export const enhancedJwtConfig = {
  // Get primary secret from manager (with build-time safety)
  getSecret: () => {
    try {
      return jwtSecretManager.getPrimarySecret();
    } catch (error) {
      // During build time, return a fallback secret
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return 'vanitha-logistics-fallback-jwt-secret-for-build-time-only-64-chars';
      }
      throw error;
    }
  },
  
  // Get all active secrets for verification (with build-time safety)
  getAllSecrets: () => {
    try {
      return jwtSecretManager.getActiveSecrets();
    } catch (error) {
      // During build time, return a fallback secret
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return ['vanitha-logistics-fallback-jwt-secret-for-build-time-only-64-chars'];
      }
      throw error;
    }
  },
  
  // Generate tokens with operation-specific expiry
  generateToken: (payload: any, operation: 'login' | 'refresh' | 'api' | 'admin' = 'login') => {
    const jwt = require('jsonwebtoken');
    
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
      case 'admin':
        expiresIn = '4h'; // Admin operations (medium expiry)
        break;
      default:
        expiresIn = '8h';
    }
    
    return jwt.sign(payload, jwtSecretManager.getPrimarySecret(), {
      expiresIn,
      issuer: securityConfig.jwt.issuer,
      audience: securityConfig.jwt.audience,
      algorithm: securityConfig.jwt.algorithm
    });
  },
  
  // Verify token against all active secrets
  verifyToken: (token: string, options?: any) => {
    const jwt = require('jsonwebtoken');
    const activeSecrets = jwtSecretManager.getActiveSecrets();
    
    for (const secret of activeSecrets) {
      try {
        return jwt.verify(token, secret, {
          issuer: securityConfig.jwt.issuer,
          audience: securityConfig.jwt.audience,
          algorithms: [securityConfig.jwt.algorithm],
          ...options
        });
      } catch (error) {
        // Continue to next secret
      }
    }
    
    throw new Error('Token verification failed against all active secrets');
  },
  
  // Check if token needs refresh
  shouldRefresh: (token: string): boolean => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      const refreshThreshold = 15 * 60; // 15 minutes
      
      return timeUntilExpiry < refreshThreshold;
    } catch {
      return true;
    }
  },
  
  // Get token expiry information
  getTokenInfo: (token: string) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token) as any;
      
      if (!decoded) {
        return { valid: false, error: 'Invalid token' };
      }
      
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp && decoded.exp < now;
      const timeUntilExpiry = decoded.exp ? decoded.exp - now : 0;
      const needsRefresh = timeUntilExpiry < (15 * 60); // 15 minutes
      
      return {
        valid: true,
        isExpired,
        timeUntilExpiry,
        needsRefresh,
        issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : null,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
        payload: decoded
      };
    } catch (error) {
      return { valid: false, error: 'Failed to decode token' };
    }
  }
};

// Initialize JWT secret manager
export async function initializeJWTSecrets(): Promise<void> {
  try {
    await jwtSecretManager.initialize();
    console.log('✅ JWT secret manager initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize JWT secret manager:', error);
    throw error;
  }
}

// Validate JWT configuration on module load (only in runtime, not build time)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  try {
    getJwtSecret();
  } catch (error) {
    console.error('❌ JWT Configuration Error:', error instanceof Error ? error.message : 'Unknown error');
    // Always fail to start if JWT configuration is invalid - security is critical
    throw error;
  }
}
