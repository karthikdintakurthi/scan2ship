/**
 * Authentication API Tests - Refresh Token
 * Comprehensive tests for token refresh functionality
 */

import { NextRequest } from 'next/server';
import { POST } from '../auth/refresh/route';
import { prisma } from '@/lib/prisma';
import { enhancedJwtConfig } from '@/lib/jwt-config';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    audit_logs: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/jwt-config', () => ({
  enhancedJwtConfig: {
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
  },
}));

describe('POST /api/auth/refresh', () => {
  let mockRequest: NextRequest;
  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    clientId: 'client-1',
    sessionToken: 'old-token',
    refreshToken: 'refresh-token',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    location: 'US',
    role: 'user',
    permissions: '["read"]',
    createdAt: new Date(),
    lastActivity: new Date(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    isActive: true,
  };

  const mockDecodedToken = {
    userId: 'user-1',
    clientId: 'client-1',
    sessionId: 'session-1',
    role: 'user',
    permissions: ['read'],
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock request
    mockRequest = {
      json: jest.fn(),
      headers: new Map(),
    } as any;
  });

  describe('Successful Token Refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (enhancedJwtConfig.generateToken as jest.Mock).mockReturnValue('new-session-token');
      (prisma.sessions.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        sessionToken: 'new-session-token',
        lastActivity: new Date(),
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('sessionToken');
      expect(responseData.data.sessionToken).toBe('new-session-token');
      expect(responseData.data).toHaveProperty('expiresAt');
      
      expect(enhancedJwtConfig.verifyToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(prisma.sessions.findFirst).toHaveBeenCalledWith({
        where: { 
          refreshToken: 'valid-refresh-token',
          isActive: true,
        },
        include: { users: true, clients: true },
      });
    });

    it('should update session last activity', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (enhancedJwtConfig.generateToken as jest.Mock).mockReturnValue('new-session-token');
      (prisma.sessions.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        sessionToken: 'new-session-token',
        lastActivity: new Date(),
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          sessionToken: 'new-session-token',
          lastActivity: expect.any(Date),
        },
      });
    });

    it('should log successful token refresh', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (enhancedJwtConfig.generateToken as jest.Mock).mockReturnValue('new-session-token');
      (prisma.sessions.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        sessionToken: 'new-session-token',
        lastActivity: new Date(),
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'TOKEN_REFRESH',
          severity: 'INFO',
          userId: 'user-1',
          clientId: 'client-1',
          sessionId: 'session-1',
          action: 'TOKEN_REFRESHED',
          details: expect.stringContaining('Token refreshed successfully'),
        }),
      });
    });
  });

  describe('Failed Token Refresh', () => {
    it('should reject missing refresh token', async () => {
      // Arrange
      const refreshData = {};
      
      mockRequest.json.mockResolvedValue(refreshData);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Refresh token is required');
    });

    it('should reject invalid refresh token', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'invalid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'expired-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid refresh token');
    });

    it('should reject non-existent session', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Session not found');
    });

    it('should reject inactive session', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue({
        ...mockSession,
        isActive: false,
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Session not found');
    });

    it('should reject expired session', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Session expired');
    });
  });

  describe('Token Generation', () => {
    it('should generate new session token with correct payload', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (enhancedJwtConfig.generateToken as jest.Mock).mockReturnValue('new-session-token');
      (prisma.sessions.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        sessionToken: 'new-session-token',
        lastActivity: new Date(),
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(enhancedJwtConfig.generateToken).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          clientId: 'client-1',
          sessionId: 'session-1',
          role: 'user',
          permissions: ['read'],
          type: 'session',
        },
        'login'
      );
    });

    it('should handle token generation failure', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (enhancedJwtConfig.generateToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });

  describe('Database Errors', () => {
    it('should handle session update failure', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (enhancedJwtConfig.generateToken as jest.Mock).mockReturnValue('new-session-token');
      (prisma.sessions.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle session lookup failure', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);
      (prisma.sessions.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });

  describe('Security Features', () => {
    it('should validate token type', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue({
        ...mockDecodedToken,
        type: 'session', // Wrong type
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid token type');
    });

    it('should validate token permissions', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockReturnValue({
        ...mockDecodedToken,
        permissions: null, // Invalid permissions
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid token permissions');
    });

    it('should log failed refresh attempts', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'invalid-refresh-token',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'TOKEN_REFRESH_FAILURE',
          severity: 'WARNING',
          action: 'INVALID_REFRESH_TOKEN',
          details: expect.stringContaining('Invalid refresh token'),
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

    it('should handle empty refresh token', async () => {
      // Arrange
      const refreshData = {
        refreshToken: '',
      };
      
      mockRequest.json.mockResolvedValue(refreshData);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Refresh token is required');
    });

    it('should handle very long refresh token', async () => {
      // Arrange
      const refreshData = {
        refreshToken: 'A'.repeat(10000), // Very long token
      };
      
      mockRequest.json.mockResolvedValue(refreshData);
      
      (enhancedJwtConfig.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token too long');
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid refresh token');
    });
  });
});
