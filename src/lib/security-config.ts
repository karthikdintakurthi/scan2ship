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
  
  // Enhanced Password Policy (Temporarily Relaxed)
  password: {
    minLength: 8, // Temporarily reduced from 16
    requireUppercase: false, // Temporarily disabled
    requireLowercase: true,
    requireNumbers: false, // Temporarily disabled
    requireSpecialChars: false, // Temporarily disabled
    maxLength: 128,
    maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
    historyCount: 8,
    lockoutAttempts: 3,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    requireMfa: false, // Temporarily disabled
    // Additional security requirements (temporarily relaxed)
    preventCommonPasswords: false, // Temporarily disabled
    preventUserInfo: false, // Temporarily disabled
    preventSequentialChars: false, // Temporarily disabled
    preventRepeatedChars: false, // Temporarily disabled
    maxConsecutiveChars: 10, // Increased from 2
    preventKeyboardPatterns: false, // Temporarily disabled
    preventDictionaryWords: false, // Temporarily disabled
    minUniqueChars: 4, // Reduced from 12
    preventLeakedPasswords: false, // Temporarily disabled
    requireComplexity: false, // Temporarily disabled
    minEntropy: 20, // Reduced from 80
    preventSimilarPasswords: false, // Temporarily disabled
    maxSimilarityThreshold: 0.9 // Increased from 0.7
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Enhanced Session Management
  session: {
    maxConcurrentSessions: 3,
    idleTimeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 4 * 60 * 60 * 1000, // 4 hours (reduced from 8)
    // Additional security measures
    regenerateOnLogin: true,
    regenerateOnRoleChange: true,
    regenerateOnSuspiciousActivity: true,
    requireReauthForSensitive: true,
    trackSessionLocation: true,
    enableSessionBinding: true,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    rolling: true,
    renewThreshold: 30 * 60 * 1000, // 30 minutes before expiry
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
  
  // Enhanced File Upload Security
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json'
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.json'],
    scanForMalware: true,
    quarantineSuspicious: true,
    maxFilesPerRequest: 3,
    uploadPath: './uploads',
    tempPath: './temp',
    // Additional security measures
    scanFileContent: true,
    validateFileHeaders: true,
    preventExecutableUploads: true,
    maxFileNameLength: 255,
    sanitizeFileName: true,
    requireVirusScan: true,
    blockPasswordProtectedFiles: true,
    validateImageDimensions: true,
    maxImageWidth: 4096,
    maxImageHeight: 4096,
    stripMetadata: true,
    generateThumbnails: true,
    watermarkImages: false,
    encryptSensitiveFiles: true,
    auditFileAccess: true,
    rateLimitPerUser: 10, // files per hour
    rateLimitPerIP: 50, // files per hour
    quarantinePath: './quarantine',
    backupPath: './backups'
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
