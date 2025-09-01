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
    throw new Error('JWT_SECRET environment variable is required for secure authentication');
  }
  
  // Ensure minimum length for security (at least 32 characters)
  if (secret.length < 32) {
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
  // Get primary secret from manager
  getSecret: () => jwtSecretManager.getPrimarySecret(),
  
  // Get all active secrets for verification
  getAllSecrets: () => jwtSecretManager.getActiveSecrets(),
  
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

// Validate JWT configuration on module load
try {
  getJwtSecret();
} catch (error) {
  console.error('❌ JWT Configuration Error:', error instanceof Error ? error.message : 'Unknown error');
  // In production, this should cause the application to fail to start
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}
