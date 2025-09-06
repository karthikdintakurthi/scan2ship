/**
 * Simplified Security Middleware
 * Implements basic rate limiting, CORS, and input validation
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const rateLimitConfig = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  upload: { windowMs: 15 * 60 * 1000, maxRequests: 10 }
};

/**
 * Simple rate limiting
 */
export function rateLimit(
  request: NextRequest,
  type: keyof typeof rateLimitConfig = 'api'
): { allowed: boolean; message?: string } {
  const config = rateLimitConfig[type];
  const now = Date.now();
  
  // Get client identifier
  const clientId = getClientIdentifier(request);
  const key = `${type}:${clientId}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return { allowed: true };
  }
  
  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      message: `Too many requests. Please try again in ${Math.ceil((current.resetTime - now) / 1000)} seconds.`
    };
  }
  
  // Increment count
  current.count++;
  return { allowed: true };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from JWT token first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // Simple token check without full JWT verification
      if (token.length > 10) {
        return `user:${token.substring(0, 8)}`;
      }
    } catch (error) {
      // Fall back to IP address
    }
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * CORS configuration
 */
export const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://qa.scan2ship.in'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400
};

/**
 * Simple CORS middleware
 */
export function cors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    
    // For preflight, allow the requesting origin if it's valid
    if (origin && corsConfig.origin.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Allow requests without origin header (e.g., local development, Postman)
      response.headers.set('Access-Control-Allow-Origin', '*');
    } else {
      // Block requests from unauthorized origins
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      );
    }
    
    response.headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
    
    return response;
  }
  
  // Handle actual requests
  if (origin && corsConfig.origin.includes(origin)) {
    return null; // Continue with request
  }
  
  // Allow requests without origin header (e.g., local development, Postman)
  if (!origin) {
    return null; // Continue with request
  }
  
  // Block requests from unauthorized origins
  return NextResponse.json(
    { error: 'Origin not allowed' },
    { status: 403 }
  );
}

/**
 * Basic input validation
 */
export class InputValidator {
  /**
   * Validate and sanitize string input
   */
  static validateString(
    value: any,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
    } = {}
  ): { valid: boolean; value?: string; error?: string } {
    const { required = false, minLength = 0, maxLength = 1000 } = options;
    
    // Check if required
    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: 'This field is required' };
    }
    
    // Skip validation if not required and value is empty, but still sanitize
    if (!required && (value === undefined || value === null || value === '')) {
      return { valid: true, value: '' };
    }
    
    // Always validate and sanitize non-empty values, even if not required
    
    // Ensure it's a string
    if (typeof value !== 'string') {
      return { valid: false, error: 'Value must be a string' };
    }
    
    // Check length
    if (value.length < minLength) {
      return { valid: false, error: `Minimum length is ${minLength} characters` };
    }
    
    if (value.length > maxLength) {
      return { valid: false, error: `Maximum length is ${maxLength} characters` };
    }
    
    // Basic sanitization
    const sanitized = value
      .trim()
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    
    return { valid: true, value: sanitized };
  }
  
  /**
   * Validate email
   */
  static validateEmail(email: any): { valid: boolean; value?: string; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const result = this.validateString(email, {
      required: true,
      maxLength: 254
    });
    
    if (!result.valid) {
      return result;
    }
    
    if (!emailRegex.test(result.value!)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    return { valid: true, value: result.value!.toLowerCase() };
  }
}

/**
 * File upload security configuration
 */
export const fileUploadConfig = {
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain'
  ],
  maxSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5
};

/**
 * File upload validation
 */
export class FileUploadValidator {
  /**
   * Validate file
   */
  static validateFile(file: {
    name: string;
    type: string;
    size: number;
  }): { valid: boolean; error?: string } {
    // Check file extension for additional security
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx'];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File extension '${fileExtension}' is not allowed`
      };
    }
    
    // Check file type
    if (!fileUploadConfig.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type '${file.type}' is not allowed`
      };
    }
    
    // Check file size
    if (file.size > fileUploadConfig.maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${(fileUploadConfig.maxSize / 1024 / 1024).toFixed(2)}MB`
      };
    }
    
    return { valid: true };
  }
}

/**
 * Security headers
 */
export function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

/**
 * Apply security middleware
 */
export function applySecurityMiddleware(
  request: NextRequest,
  response: NextResponse,
  options: {
    rateLimit?: keyof typeof rateLimitConfig;
    cors?: boolean;
    securityHeaders?: boolean;
  } = {}
): NextResponse | null {
  const { rateLimit: rateLimitType = 'api', cors: enableCors = true, securityHeaders: enableSecurityHeaders = true } = options;
  
  // Apply CORS
  if (enableCors) {
    const corsResult = cors(request);
    if (corsResult) {
      return corsResult;
    }
  }
  
  // Skip rate limiting in development/testing mode
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true';
  
  if (!isDevelopment && !disableRateLimit) {
    // Apply rate limiting only in production
    const rateLimitResult = rateLimit(request, rateLimitType);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        { status: 429 }
      );
    }
  } else {
    console.log('🚫 [RATE_LIMIT] Rate limiting disabled for testing/development');
  }
  
  // Apply security headers
  if (enableSecurityHeaders) {
    securityHeaders(response);
  }
  
  return null; // Continue with request
}
