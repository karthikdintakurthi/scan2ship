/**
 * Security Configuration
 * Centralized security settings and validations
 */

export const securityConfig = {
  // JWT Configuration
  jwt: {
    algorithm: 'HS256' as const,
    expiresIn: '8h', // Reduced from 24h for better security
    issuer: 'vanitha-logistics',
    audience: 'vanitha-logistics-users',
    refreshThreshold: 15 * 60 * 1000, // 15 minutes before expiry
  },
  
  // Password Policy
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Session Management
  session: {
    maxConcurrentSessions: 3,
    idleTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] // Replace with actual domain
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  
  // Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
  
  // File Upload Security
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    scanForMalware: true, // Implement malware scanning
  },
  
  // API Security
  api: {
    requireApiKey: false, // Set to true for external APIs
    apiKeyHeader: 'X-API-Key',
    maxRequestSize: '10mb',
  }
};

// Security validation functions
export const securityValidators = {
  // Validate password strength
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < securityConfig.password.minLength) {
      errors.push(`Password must be at least ${securityConfig.password.minLength} characters long`);
    }
    
    if (securityConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (securityConfig.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (securityConfig.password.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (securityConfig.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Validate JWT token format
  validateJwtToken(token: string): boolean {
    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  },
  
  // Sanitize user input
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim()
      .substring(0, 1000); // Limit length
  }
};

// Export default configuration
export default securityConfig;
