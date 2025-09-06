/**
 * Authentication API Tests - Register User
 * Comprehensive tests for user registration functionality
 */

import { NextRequest } from 'next/server';
import { POST } from '../auth/register-user/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    clients: {
      findFirst: jest.fn(),
    },
    audit_logs: {
      create: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  genSalt: jest.fn(),
}));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn(() => null),
  InputValidator: {
    validateEmail: jest.fn(),
    validateString: jest.fn(),
  },
}));

jest.mock('@/lib/password-validator', () => ({
  validatePassword: jest.fn(),
}));

jest.mock('@/lib/security-config', () => ({
  securityConfig: {
    password: {
      minLength: 16,
      maxLength: 128,
    },
  },
}));

describe('POST /api/auth/register-user', () => {
  let mockRequest: NextRequest;
  const mockClient = {
    id: 'client-1',
    name: 'Test Client',
    email: 'client@example.com',
    isActive: true,
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    clientId: 'client-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock request
    mockRequest = {
      json: jest.fn(),
      headers: new Map(),
    } as any;

    // Mock successful validation
    const { InputValidator } = require('@/lib/security-middleware');
    InputValidator.validateEmail.mockReturnValue({ valid: true });
    InputValidator.validateString.mockReturnValue({ valid: true });
    
    const { validatePassword } = require('@/lib/password-validator');
    validatePassword.mockReturnValue({ isValid: true, errors: [] });
  });

  describe('Successful Registration', () => {
    it('should register user with valid data', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prisma.users.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data.user.email).toBe('test@example.com');
      expect(responseData.data.user.name).toBe('Test User');
      expect(responseData.data.user.role).toBe('user');
      expect(responseData.data.user.clientId).toBe('client-1');
      
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashedPassword',
          role: 'user',
          clientId: 'client-1',
          isActive: true,
        }),
        include: { clients: true },
      });
    });

    it('should hash password securely', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prisma.users.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPassword123!', 'salt123');
    });

    it('should log successful registration', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prisma.users.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'USER_REGISTRATION',
          severity: 'INFO',
          userId: 'user-1',
          clientId: 'client-1',
          action: 'USER_CREATED',
          details: expect.stringContaining('User registered successfully'),
        }),
      });
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid email format', async () => {
      // Arrange
      const registrationData = {
        email: 'invalid-email',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateEmail.mockReturnValue({ 
        valid: false, 
        error: 'Invalid email format' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid email format');
    });

    it('should reject weak password', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      const { validatePassword } = require('@/lib/password-validator');
      validatePassword.mockReturnValue({ 
        isValid: false, 
        errors: ['Password must be at least 16 characters long'] 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Password must be at least 16 characters long');
    });

    it('should reject empty name', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: '',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateString.mockReturnValue({ 
        valid: false, 
        error: 'Name is required' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Name is required');
    });

    it('should reject missing required fields', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        // Missing name and clientId
      };
      
      mockRequest.json.mockResolvedValue(registrationData);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Name and clientId are required');
    });
  });

  describe('Business Logic Errors', () => {
    it('should reject duplicate email', async () => {
      // Arrange
      const registrationData = {
        email: 'existing@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(responseData.error).toBe('User with this email already exists');
    });

    it('should reject invalid client ID', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'invalid-client',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid client ID');
    });

    it('should reject inactive client', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue({
        ...mockClient,
        isActive: false,
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Client is not active');
    });
  });

  describe('Database Errors', () => {
    it('should handle user creation failure', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prisma.users.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle password hashing failure', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockRejectedValue(new Error('Salt generation failed'));

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });

  describe('Security Features', () => {
    it('should apply security middleware', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      const { applySecurityMiddleware } = require('@/lib/security-middleware');
      applySecurityMiddleware.mockReturnValue({
        status: 429,
        json: () => ({ error: 'Rate limit exceeded' }),
      });

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(applySecurityMiddleware).toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it('should validate password strength', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      const { validatePassword } = require('@/lib/password-validator');
      validatePassword.mockReturnValue({ 
        isValid: false, 
        errors: ['Password is too common'] 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(validatePassword).toHaveBeenCalledWith('ValidPassword123!', {
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Password is too common');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      // Arrange
      mockRequest.json.mockRejectedValue(new Error('Invalid JSON'));

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request body');
    });

    it('should handle missing request body', async () => {
      // Arrange
      mockRequest.json.mockResolvedValue(null);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Request body is required');
    });

    it('should handle very long input values', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'A'.repeat(1000), // Very long name
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateString.mockReturnValue({ 
        valid: false, 
        error: 'Name is too long' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Name is too long');
    });

    it('should handle special characters in name', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: '<script>alert("xss")</script>',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(registrationData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateString.mockReturnValue({ 
        valid: false, 
        error: 'Name contains invalid characters' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Name contains invalid characters');
    });
  });
});
