/**
 * Authentication API Tests - Login
 * Comprehensive tests for user login functionality
 */

import { NextRequest } from 'next/server';
import { POST } from '../auth/login/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Mock NextResponse
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      json: jest.fn().mockResolvedValue(data),
      status: init.status || 200,
      headers: new Map(Object.entries(init.headers || {})),
    })),
    redirect: jest.fn((url, status = 302) => ({
      status,
      headers: new Map([['location', url]]),
    })),
    next: jest.fn(() => ({
      status: 200,
    })),
  },
}));

// Mock dependencies
const mockPrisma = {
  users: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  sessions: {
    create: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  audit_logs: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sessions: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    audit_logs: {
      create: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
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

describe('POST /api/auth/login', () => {
  let mockRequest: NextRequest;
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
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
  });

  describe('Successful Login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockPrisma.sessions.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.sessions.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.sessions.create as jest.Mock).mockResolvedValue({
        id: 'session-1',
        sessionToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });
      (mockPrisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data).toHaveProperty('session');
      expect(responseData.data.user.email).toBe('test@example.com');
      expect(responseData.data.session).toHaveProperty('sessionToken');
      expect(responseData.data.session).toHaveProperty('refreshToken');
      
      expect(mockPrisma.users.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', isActive: true },
        include: { clients: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('ValidPassword123!', 'hashedPassword');
    });

    it('should create session with proper expiration', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockPrisma.sessions.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.sessions.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.sessions.create as jest.Mock).mockResolvedValue({
        id: 'session-1',
        sessionToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });
      (mockPrisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(mockPrisma.sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          clientId: 'client-1',
          role: 'user',
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should log successful login', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockPrisma.sessions.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.sessions.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.sessions.create as jest.Mock).mockResolvedValue({
        id: 'session-1',
        sessionToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });
      (mockPrisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(mockPrisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'USER_LOGIN',
          severity: 'INFO',
          userId: 'user-1',
          clientId: 'client-1',
          action: 'LOGIN_SUCCESS',
          details: expect.stringContaining('User logged in successfully'),
        }),
      });
    });
  });

  describe('Failed Login Attempts', () => {
    it('should reject invalid email', async () => {
      // Arrange
      const loginData = {
        email: 'invalid-email',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
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

    it('should reject invalid password', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'short',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateString.mockReturnValue({ 
        valid: false, 
        error: 'Password must be at least 16 characters long' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Password must be at least 16 characters long');
    });

    it('should reject non-existent user', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid credentials');
    });

    it('should reject wrong password', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid credentials');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });

  describe('Session Management', () => {
    it('should revoke oldest session when max concurrent sessions reached', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      const oldestSession = {
        id: 'old-session',
        userId: 'user-1',
        sessionToken: 'old-token',
        refreshToken: 'old-refresh',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      };
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockPrisma.sessions.count as jest.Mock).mockResolvedValue(3); // At limit
      (mockPrisma.sessions.findFirst as jest.Mock).mockResolvedValue(oldestSession);
      (mockPrisma.sessions.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.sessions.create as jest.Mock).mockResolvedValue({
        id: 'new-session',
        sessionToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });
      (mockPrisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(mockPrisma.sessions.updateMany).toHaveBeenCalledWith({
        where: { id: 'old-session' },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });

    it('should handle session creation errors', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockPrisma.sessions.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.sessions.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.sessions.create as jest.Mock).mockRejectedValue(new Error('Session creation failed'));

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      // Arrange
      const loginData = {
        email: 'invalid-email',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateEmail.mockReturnValue({ 
        valid: false, 
        error: 'Invalid email format' 
      });

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(InputValidator.validateEmail).toHaveBeenCalledWith('invalid-email');
      expect(response.status).toBe(400);
    });

    it('should validate password length', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'short',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateString.mockReturnValue({ 
        valid: false, 
        error: 'Password must be at least 16 characters long' 
      });

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(InputValidator.validateString).toHaveBeenCalledWith('short', {
        required: true,
        minLength: 16,
        maxLength: 128,
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Security Features', () => {
    it('should apply security middleware', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
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

    it('should log failed login attempts', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);
      
      (mockPrisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (mockPrisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(mockPrisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'AUTHENTICATION_FAILURE',
          severity: 'WARNING',
          userId: 'user-1',
          clientId: 'client-1',
          action: 'LOGIN_FAILED',
          details: expect.stringContaining('Invalid password'),
        }),
      });
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

    it('should handle missing email', async () => {
      // Arrange
      const loginData = {
        password: 'ValidPassword123!',
      };
      
      mockRequest.json.mockResolvedValue(loginData);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Email and password are required');
    });

    it('should handle missing password', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
      };
      
      mockRequest.json.mockResolvedValue(loginData);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Email and password are required');
    });
  });
});
