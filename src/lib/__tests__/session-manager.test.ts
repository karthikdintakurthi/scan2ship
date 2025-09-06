/**
 * Session Manager Tests
 * Comprehensive tests for session management security
 */

import {
  createSession,
  validateSession,
  refreshSession,
  revokeSession,
  revokeAllUserSessions,
  cleanupExpiredSessions,
  getUserActiveSessions,
  requiresReauthForSensitive
} from '../session-manager';

// Mock Prisma
const mockPrisma = {
  sessions: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../prisma', () => ({
  prisma: mockPrisma,
}));

describe('Session Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      mockPrisma.sessions.count.mockResolvedValue(2);
      mockPrisma.sessions.findFirst.mockResolvedValue(null);
      mockPrisma.sessions.create.mockResolvedValue(mockSession);

      const result = await createSession(
        'user-1',
        'client-1',
        'user',
        ['read'],
        '192.168.1.1',
        'Mozilla/5.0',
        'US'
      );

      expect(result).toEqual({
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        role: 'user',
        permissions: ['read'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        createdAt: mockSession.createdAt,
        lastActivity: mockSession.lastActivity,
        expiresAt: mockSession.expiresAt,
        isActive: true,
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
      });

      expect(mockPrisma.sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          clientId: 'client-1',
          role: 'user',
          permissions: '["read"]',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          location: 'US',
          isActive: true,
        }),
      });
    });

    it('should revoke oldest session when max concurrent sessions reached', async () => {
      const mockOldestSession = {
        id: 'old-session',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'old-token',
        refreshToken: 'old-refresh',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      const mockNewSession = {
        id: 'new-session',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'new-token',
        refreshToken: 'new-refresh',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      mockPrisma.sessions.count.mockResolvedValue(3);
      mockPrisma.sessions.findFirst.mockResolvedValue(mockOldestSession);
      mockPrisma.sessions.update.mockResolvedValue(mockOldestSession);
      mockPrisma.sessions.create.mockResolvedValue(mockNewSession);

      await createSession(
        'user-1',
        'client-1',
        'user',
        ['read'],
        '192.168.1.1',
        'Mozilla/5.0',
        'US'
      );

      expect(mockPrisma.sessions.update).toHaveBeenCalledWith({
        where: { id: 'old-session' },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });
  });

  describe('validateSession', () => {
    it('should validate active session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      mockPrisma.sessions.findFirst.mockResolvedValue(mockSession);
      mockPrisma.sessions.update.mockResolvedValue(mockSession);

      const result = await validateSession('token-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.isValid).toBe(true);
      expect(result.session).toBeDefined();
      expect(mockPrisma.sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { lastActivity: expect.any(Date) },
      });
    });

    it('should reject non-existent session', async () => {
      mockPrisma.sessions.findFirst.mockResolvedValue(null);

      const result = await validateSession('invalid-token', '192.168.1.1', 'Mozilla/5.0');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session not found');
    });

    it('should reject expired session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        isActive: true,
      };

      mockPrisma.sessions.findFirst.mockResolvedValue(mockSession);
      mockPrisma.sessions.update.mockResolvedValue(mockSession);

      const result = await validateSession('token-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });

    it('should reject session with IP mismatch when binding enabled', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      mockPrisma.sessions.findFirst.mockResolvedValue(mockSession);

      const result = await validateSession('token-1', '192.168.1.2', 'Mozilla/5.0');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('IP address mismatch');
      expect(result.requiresReauth).toBe(true);
    });

    it('should reject session with user agent mismatch when binding enabled', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      mockPrisma.sessions.findFirst.mockResolvedValue(mockSession);

      const result = await validateSession('token-1', '192.168.1.1', 'Chrome/91.0');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('User agent mismatch');
      expect(result.requiresReauth).toBe(true);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      mockPrisma.sessions.findFirst.mockResolvedValue(mockSession);
      mockPrisma.sessions.update.mockResolvedValue(mockSession);

      const result = await refreshSession('refresh-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result.isValid).toBe(true);
      expect(result.session).toBeDefined();
      expect(mockPrisma.sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          lastActivity: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
    });

    it('should reject invalid refresh token', async () => {
      mockPrisma.sessions.findFirst.mockResolvedValue(null);

      const result = await refreshSession('invalid-refresh', '192.168.1.1', 'Mozilla/5.0');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Refresh token not found');
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      mockPrisma.sessions.updateMany.mockResolvedValue({ count: 1 });

      const result = await revokeSession('token-1');

      expect(result).toBe(true);
      expect(mockPrisma.sessions.updateMany).toHaveBeenCalledWith({
        where: { sessionToken: 'token-1' },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });

    it('should handle revoke session error', async () => {
      mockPrisma.sessions.updateMany.mockRejectedValue(new Error('Database error'));

      const result = await revokeSession('token-1');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions successfully', async () => {
      mockPrisma.sessions.updateMany.mockResolvedValue({ count: 3 });

      const result = await revokeAllUserSessions('user-1');

      expect(result).toBe(true);
      expect(mockPrisma.sessions.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions successfully', async () => {
      mockPrisma.sessions.updateMany.mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredSessions();

      expect(result).toBe(5);
      expect(mockPrisma.sessions.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { lastActivity: { lt: expect.any(Date) } },
          ],
          isActive: true,
        },
        data: { isActive: false, revokedAt: expect.any(Date) },
      });
    });
  });

  describe('getUserActiveSessions', () => {
    it('should get user active sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          clientId: 'client-1',
          sessionToken: 'token-1',
          refreshToken: 'refresh-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          location: 'US',
          role: 'user',
          permissions: '["read"]',
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          isActive: true,
        },
      ];

      mockPrisma.sessions.findMany.mockResolvedValue(mockSessions);

      const result = await getUserActiveSessions('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        role: 'user',
        permissions: ['read'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        createdAt: mockSessions[0].createdAt,
        lastActivity: mockSessions[0].lastActivity,
        expiresAt: mockSessions[0].expiresAt,
        isActive: true,
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
      });
    });
  });

  describe('requiresReauthForSensitive', () => {
    it('should return true for sensitive operations with old session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        clientId: 'client-1',
        sessionToken: 'token-1',
        refreshToken: 'refresh-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        location: 'US',
        role: 'user',
        permissions: '["read"]',
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      };

      mockPrisma.sessions.findFirst.mockResolvedValue(mockSession);

      const result = await requiresReauthForSensitive('token-1', 'change-password');

      expect(result).toBe(true);
    });

    it('should return false for non-sensitive operations', async () => {
      const result = await requiresReauthForSensitive('token-1', 'view-profile');

      expect(result).toBe(false);
    });

    it('should return true for non-existent session', async () => {
      mockPrisma.sessions.findFirst.mockResolvedValue(null);

      const result = await requiresReauthForSensitive('invalid-token', 'change-password');

      expect(result).toBe(true);
    });
  });
});
