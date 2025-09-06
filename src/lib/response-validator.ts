/**
 * API Response Validation System
 * Provides comprehensive response validation and sanitization
 */

import { sanitizeString, sanitizeJSON } from './input-sanitizer';
import { logSecurity, LogCategory } from './logger';

export enum ResponseType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  REDIRECT = 'REDIRECT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
  allowedValues?: any[];
}

interface ResponseValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: any;
  warnings: string[];
}

/**
 * Validate API response data
 */
export function validateResponse(
  data: any,
  rules: ValidationRule[],
  responseType: ResponseType = ResponseType.SUCCESS
): ResponseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitizedData = data;

  try {
    // Sanitize the entire response if it's an object
    if (typeof data === 'object' && data !== null) {
      sanitizedData = sanitizeJSON(data);
    }

    // Apply validation rules
    for (const rule of rules) {
      const fieldValue = getNestedValue(sanitizedData, rule.field);
      
      // Check if required field is present
      if (rule.required && (fieldValue === undefined || fieldValue === null)) {
        errors.push(`Required field '${rule.field}' is missing`);
        continue;
      }

      // Skip validation if field is not present and not required
      if (fieldValue === undefined || fieldValue === null) {
        continue;
      }

      // Type validation
      if (!validateType(fieldValue, rule.type)) {
        errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
        continue;
      }

      // String-specific validations
      if (rule.type === 'string') {
        const stringValue = String(fieldValue);
        
        if (rule.minLength && stringValue.length < rule.minLength) {
          errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters long`);
        }
        
        if (rule.maxLength && stringValue.length > rule.maxLength) {
          errors.push(`Field '${rule.field}' must be no more than ${rule.maxLength} characters long`);
        }
        
        if (rule.pattern && !rule.pattern.test(stringValue)) {
          errors.push(`Field '${rule.field}' does not match required pattern`);
        }
        
        if (rule.allowedValues && !rule.allowedValues.includes(stringValue)) {
          errors.push(`Field '${rule.field}' must be one of: ${rule.allowedValues.join(', ')}`);
        }
        
        // Sanitize string fields
        if (rule.sanitize) {
          setNestedValue(sanitizedData, rule.field, sanitizeString(stringValue));
        }
      }

      // Array-specific validations
      if (rule.type === 'array' && Array.isArray(fieldValue)) {
        if (rule.minLength && fieldValue.length < rule.minLength) {
          errors.push(`Field '${rule.field}' must contain at least ${rule.minLength} items`);
        }
        
        if (rule.maxLength && fieldValue.length > rule.maxLength) {
          errors.push(`Field '${rule.field}' must contain no more than ${rule.maxLength} items`);
        }
      }
    }

    // Additional security validations
    const securityWarnings = performSecurityValidations(sanitizedData);
    warnings.push(...securityWarnings);

    // Log validation results
    if (errors.length > 0) {
      logSecurity('Response validation failed', {
        responseType,
        errors,
        fieldCount: rules.length
      }, LogCategory.API);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData,
      warnings
    };

  } catch (error) {
    logSecurity('Response validation error', {
      error: error instanceof Error ? error.message : String(error),
      responseType
    }, LogCategory.API);

    return {
      isValid: false,
      errors: ['Response validation failed due to internal error'],
      sanitizedData: data,
      warnings: []
    };
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Validate data type
 */
function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Perform security validations
 */
function performSecurityValidations(data: any): string[] {
  const warnings: string[] = [];

  try {
    const dataString = JSON.stringify(data);

    // Check for potential XSS
    if (dataString.includes('<script') || dataString.includes('javascript:')) {
      warnings.push('Potential XSS content detected in response');
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
      /(\b(exec|execute|script|javascript|vbscript)\b)/i,
      /(\b(0x[0-9a-f]+)\b)/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(dataString)) {
        warnings.push('Potential SQL injection pattern detected in response');
        break;
      }
    }

    // Check for sensitive data exposure
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /credential/i
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(dataString)) {
        warnings.push('Potential sensitive data exposure in response');
        break;
      }
    }

  } catch (error) {
    warnings.push('Unable to perform security validations on response data');
  }

  return warnings;
}

/**
 * Create standardized API response
 */
export function createStandardResponse(
  data: any,
  responseType: ResponseType = ResponseType.SUCCESS,
  message?: string,
  statusCode: number = 200
): {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp: string;
  statusCode: number;
} {
  const baseResponse = {
    success: responseType === ResponseType.SUCCESS,
    timestamp: new Date().toISOString(),
    statusCode
  };

  if (responseType === ResponseType.SUCCESS) {
    return {
      ...baseResponse,
      data,
      message: message || 'Success'
    };
  } else {
    return {
      ...baseResponse,
      error: message || 'An error occurred',
      ...(data && { data })
    };
  }
}

/**
 * Validate error response
 */
export function validateErrorResponse(error: any): {
  isValid: boolean;
  sanitizedError: any;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitizedError = error;

  try {
    // Ensure error is an object
    if (typeof error !== 'object' || error === null) {
      sanitizedError = { message: String(error) };
    }

    // Sanitize error message
    if (sanitizedError.message) {
      sanitizedError.message = sanitizeString(String(sanitizedError.message));
    }

    // Remove sensitive information
    const sensitiveFields = ['stack', 'details', 'innerError', 'cause'];
    for (const field of sensitiveFields) {
      if (sanitizedError[field]) {
        delete sanitizedError[field];
      }
    }

    // Ensure required fields
    if (!sanitizedError.message) {
      sanitizedError.message = 'An error occurred';
    }

    if (!sanitizedError.code) {
      sanitizedError.code = 'INTERNAL_ERROR';
    }

  } catch (validationError) {
    errors.push('Failed to validate error response');
    sanitizedError = { message: 'An error occurred', code: 'VALIDATION_ERROR' };
  }

  return {
    isValid: errors.length === 0,
    sanitizedError,
    errors
  };
}

/**
 * Common validation rules for different response types
 */
export const CommonValidationRules = {
  success: [
    { field: 'success', type: 'boolean' as const, required: true },
    { field: 'data', type: 'object' as const, required: false },
    { field: 'message', type: 'string' as const, required: false, maxLength: 500, sanitize: true },
    { field: 'timestamp', type: 'string' as const, required: true }
  ],
  error: [
    { field: 'success', type: 'boolean' as const, required: true },
    { field: 'error', type: 'string' as const, required: true, maxLength: 1000, sanitize: true },
    { field: 'code', type: 'string' as const, required: false, maxLength: 100, sanitize: true },
    { field: 'timestamp', type: 'string' as const, required: true }
  ],
  user: [
    { field: 'id', type: 'string' as const, required: true, maxLength: 100 },
    { field: 'email', type: 'string' as const, required: true, maxLength: 255, sanitize: true },
    { field: 'name', type: 'string' as const, required: false, maxLength: 255, sanitize: true },
    { field: 'role', type: 'string' as const, required: true, allowedValues: ['user', 'admin', 'master_admin'] }
  ],
  order: [
    { field: 'id', type: 'number' as const, required: true },
    { field: 'status', type: 'string' as const, required: true, maxLength: 50, sanitize: true },
    { field: 'createdAt', type: 'string' as const, required: true },
    { field: 'updatedAt', type: 'string' as const, required: true }
  ]
};
