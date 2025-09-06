/**
 * Admin API Tests - Users Management
 * Comprehensive tests for admin user management functionality
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../admin/users/route';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    clients: {
      findFirst: jest.fn(),
    },
    audit_logs: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  authorizeUser: jest.fn(),
  UserRole: {
    ADMIN: 'admin',
    MASTER_ADMIN: 'master_admin',
  },
  PermissionLevel: {
    READ: 'READ',
    WRITE: 'WRITE',
    DELETE: 'DELETE',
  },
}));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn(() => null),
  securityHeaders: jest.fn((response) => response),
}));

jest.mock('@/lib/password-validator', () => ({
  validatePassword: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  genSalt: jest.fn(),
}));

describe('Admin Users API', () => {
  let mockRequest: NextRequest;
  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    clientId: 'client-1',
    isActive: true,
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user',
    clientId: 'client-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    clients: {
      id: 'client-1',
      name: 'Test Client',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock request
    mockRequest = {
      json: jest.fn(),
      headers: new Map(),
      nextUrl: new URL('http://localhost:3000/api/admin/users'),
    } as any;

    // Mock successful authorization
    (authorizeUser as jest.Mock).mockResolvedValue({
      response: null,
      user: mockAdminUser,
    });
  });

  describe('GET /api/admin/users', () => {
    it('should get all users successfully', async () => {
      // Arrange
      const mockUsers = [mockUser];
      (prisma.users.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.users.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.users).toHaveLength(1);
      expect(responseData.data.users[0].email).toBe('user@example.com');
      expect(responseData.data.pagination.total).toBe(1);
      
      expect(prisma.users.findMany).toHaveBeenCalledWith({
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      mockRequest.nextUrl.searchParams.set('page', '2');
      mockRequest.nextUrl.searchParams.set('limit', '5');
      
      (prisma.users.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.users.count as jest.Mock).mockResolvedValue(0);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.users.findMany).toHaveBeenCalledWith({
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 5, // (page - 1) * limit
        take: 5,
      });
    });

    it('should filter users by client', async () => {
      // Arrange
      mockRequest.nextUrl.searchParams.set('clientId', 'client-1');
      
      (prisma.users.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.users.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.users.findMany).toHaveBeenCalledWith({
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        where: { clientId: 'client-1' },
      });
    });

    it('should filter users by role', async () => {
      // Arrange
      mockRequest.nextUrl.searchParams.set('role', 'user');
      
      (prisma.users.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.users.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.users.findMany).toHaveBeenCalledWith({
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        where: { role: 'user' },
      });
    });

    it('should filter users by status', async () => {
      // Arrange
      mockRequest.nextUrl.searchParams.set('isActive', 'true');
      
      (prisma.users.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.users.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.users.findMany).toHaveBeenCalledWith({
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        where: { isActive: true },
      });
    });

    it('should reject unauthorized access', async () => {
      // Arrange
      (authorizeUser as jest.Mock).mockResolvedValue({
        response: {
          status: 403,
          json: () => ({ error: 'Insufficient permissions' }),
        },
        user: null,
      });

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create user successfully', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'ValidPassword123!',
        name: 'New User',
        role: 'user',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(userData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue({
        id: 'client-1',
        name: 'Test Client',
        isActive: true,
      });
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      
      const bcrypt = require('bcryptjs');
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      
      (prisma.users.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'newuser@example.com',
        name: 'New User',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      const { validatePassword } = require('@/lib/password-validator');
      validatePassword.mockReturnValue({ isValid: true, errors: [] });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.user.email).toBe('newuser@example.com');
      expect(responseData.data.user.name).toBe('New User');
      
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'hashedPassword',
          role: 'user',
          clientId: 'client-1',
          isActive: true,
        }),
        include: { clients: true },
      });
    });

    it('should reject duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'ValidPassword123!',
        name: 'New User',
        role: 'user',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(userData);
      
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
      const userData = {
        email: 'newuser@example.com',
        password: 'ValidPassword123!',
        name: 'New User',
        role: 'user',
        clientId: 'invalid-client',
      };
      
      mockRequest.json.mockResolvedValue(userData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid client ID');
    });

    it('should reject weak password', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'weak',
        name: 'New User',
        role: 'user',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(userData);
      
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
  });

  describe('PUT /api/admin/users', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateData = {
        id: 'user-1',
        name: 'Updated User',
        role: 'admin',
        isActive: true,
      };
      
      mockRequest.json.mockResolvedValue(updateData);
      
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.users.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: 'Updated User',
        role: 'admin',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await PUT(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.user.name).toBe('Updated User');
      expect(responseData.data.user.role).toBe('admin');
      
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          name: 'Updated User',
          role: 'admin',
          isActive: true,
        }),
        include: { clients: true },
      });
    });

    it('should reject non-existent user', async () => {
      // Arrange
      const updateData = {
        id: 'non-existent',
        name: 'Updated User',
      };
      
      mockRequest.json.mockResolvedValue(updateData);
      
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await PUT(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('User not found');
    });

    it('should reject invalid role', async () => {
      // Arrange
      const updateData = {
        id: 'user-1',
        role: 'invalid-role',
      };
      
      mockRequest.json.mockResolvedValue(updateData);

      // Act
      const response = await PUT(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid role');
    });
  });

  describe('DELETE /api/admin/users', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const deleteData = {
        id: 'user-1',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.users.delete as jest.Mock).mockResolvedValue(mockUser);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await DELETE(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('User deleted successfully');
      
      expect(prisma.users.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should reject deleting non-existent user', async () => {
      // Arrange
      const deleteData = {
        id: 'non-existent',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await DELETE(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('User not found');
    });

    it('should reject deleting own account', async () => {
      // Arrange
      const deleteData = {
        id: 'admin-1', // Same as mockAdminUser.id
      };
      
      mockRequest.json.mockResolvedValue(deleteData);

      // Act
      const response = await DELETE(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Cannot delete your own account');
    });
  });

  describe('Authorization', () => {
    it('should require admin role for GET', async () => {
      // Arrange
      (authorizeUser as jest.Mock).mockResolvedValue({
        response: {
          status: 403,
          json: () => ({ error: 'Insufficient permissions' }),
        },
        user: null,
      });

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(authorizeUser).toHaveBeenCalledWith(mockRequest, {
        requiredRole: UserRole.ADMIN,
        requiredPermissions: [PermissionLevel.READ],
        requireActiveUser: true,
        requireActiveClient: true,
      });
      expect(response.status).toBe(403);
    });

    it('should require write permission for POST', async () => {
      // Arrange
      (authorizeUser as jest.Mock).mockResolvedValue({
        response: {
          status: 403,
          json: () => ({ error: 'Insufficient permissions' }),
        },
        user: null,
      });

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(authorizeUser).toHaveBeenCalledWith(mockRequest, {
        requiredRole: UserRole.ADMIN,
        requiredPermissions: [PermissionLevel.WRITE],
        requireActiveUser: true,
        requireActiveClient: true,
      });
      expect(response.status).toBe(403);
    });

    it('should require write permission for PUT', async () => {
      // Arrange
      (authorizeUser as jest.Mock).mockResolvedValue({
        response: {
          status: 403,
          json: () => ({ error: 'Insufficient permissions' }),
        },
        user: null,
      });

      // Act
      const response = await PUT(mockRequest);

      // Assert
      expect(authorizeUser).toHaveBeenCalledWith(mockRequest, {
        requiredRole: UserRole.ADMIN,
        requiredPermissions: [PermissionLevel.WRITE],
        requireActiveUser: true,
        requireActiveClient: true,
      });
      expect(response.status).toBe(403);
    });

    it('should require delete permission for DELETE', async () => {
      // Arrange
      (authorizeUser as jest.Mock).mockResolvedValue({
        response: {
          status: 403,
          json: () => ({ error: 'Insufficient permissions' }),
        },
        user: null,
      });

      // Act
      const response = await DELETE(mockRequest);

      // Assert
      expect(authorizeUser).toHaveBeenCalledWith(mockRequest, {
        requiredRole: UserRole.ADMIN,
        requiredPermissions: [PermissionLevel.DELETE],
        requireActiveUser: true,
        requireActiveClient: true,
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Audit Logging', () => {
    it('should log user creation', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'ValidPassword123!',
        name: 'New User',
        role: 'user',
        clientId: 'client-1',
      };
      
      mockRequest.json.mockResolvedValue(userData);
      
      (prisma.clients.findFirst as jest.Mock).mockResolvedValue({
        id: 'client-1',
        name: 'Test Client',
        isActive: true,
      });
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      
      const bcrypt = require('bcryptjs');
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      
      (prisma.users.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'newuser@example.com',
        name: 'New User',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      const { validatePassword } = require('@/lib/password-validator');
      validatePassword.mockReturnValue({ isValid: true, errors: [] });

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'USER_CREATED',
          severity: 'INFO',
          userId: 'admin-1',
          clientId: 'client-1',
          action: 'CREATE_USER',
          details: expect.stringContaining('User created successfully'),
        }),
      });
    });

    it('should log user update', async () => {
      // Arrange
      const updateData = {
        id: 'user-1',
        name: 'Updated User',
      };
      
      mockRequest.json.mockResolvedValue(updateData);
      
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.users.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: 'Updated User',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await PUT(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'USER_UPDATED',
          severity: 'INFO',
          userId: 'admin-1',
          clientId: 'client-1',
          action: 'UPDATE_USER',
          details: expect.stringContaining('User updated successfully'),
        }),
      });
    });

    it('should log user deletion', async () => {
      // Arrange
      const deleteData = {
        id: 'user-1',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.users.delete as jest.Mock).mockResolvedValue(mockUser);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await DELETE(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'USER_DELETED',
          severity: 'WARNING',
          userId: 'admin-1',
          clientId: 'client-1',
          action: 'DELETE_USER',
          details: expect.stringContaining('User deleted successfully'),
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      (prisma.users.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await GET(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

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
  });
});
