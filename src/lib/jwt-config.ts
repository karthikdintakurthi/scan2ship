/**
 * Secure JWT Configuration Utility
 * Handles JWT secret validation and provides secure defaults
 */

import { securityConfig } from './security-config';

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
