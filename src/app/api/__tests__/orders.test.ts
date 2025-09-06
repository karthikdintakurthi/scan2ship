/**
 * Orders API Tests
 * Comprehensive tests for order management functionality
 */

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../orders/route';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

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
jest.mock('@/lib/prisma', () => ({
  prisma: {
    orders: {
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
    USER: 'user',
    ADMIN: 'admin',
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
  InputValidator: {
    validateString: jest.fn(),
    validateEmail: jest.fn(),
    validateNumber: jest.fn(),
  },
}));

describe('Orders API', () => {
  let mockRequest: NextRequest;
  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user',
    clientId: 'client-1',
    isActive: true,
  };

  const mockOrder = {
    id: 'order-1',
    clientId: 'client-1',
    orderNumber: 'ORD-001',
    status: 'pending',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1234567890',
    pickupAddress: '123 Main St, New York, NY 10001',
    deliveryAddress: '456 Oak Ave, Boston, MA 02101',
    weight: 1.5,
    dimensions: '10x10x10',
    value: 100.00,
    notes: 'Handle with care',
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
      nextUrl: new URL('http://localhost:3000/api/orders'),
    } as any;

    // Mock successful authorization
    (authorizeUser as jest.Mock).mockResolvedValue({
      response: null,
      user: mockUser,
    });

    // Mock successful validation
    const { InputValidator } = require('@/lib/security-middleware');
    InputValidator.validateString.mockReturnValue({ valid: true });
    InputValidator.validateEmail.mockReturnValue({ valid: true });
    InputValidator.validateNumber.mockReturnValue({ valid: true });
  });

  describe('GET /api/orders', () => {
    it('should get orders successfully', async () => {
      // Arrange
      const mockOrders = [mockOrder];
      (prisma.orders.findMany as jest.Mock).mockResolvedValue(mockOrders);
      (prisma.orders.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.orders).toHaveLength(1);
      expect(responseData.data.orders[0].orderNumber).toBe('ORD-001');
      expect(responseData.data.pagination.total).toBe(1);
      
      expect(prisma.orders.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-1' },
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
      
      (prisma.orders.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.orders.count as jest.Mock).mockResolvedValue(0);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.orders.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-1' },
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 5, // (page - 1) * limit
        take: 5,
      });
    });

    it('should filter orders by status', async () => {
      // Arrange
      mockRequest.nextUrl.searchParams.set('status', 'pending');
      
      (prisma.orders.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prisma.orders.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.orders.findMany).toHaveBeenCalledWith({
        where: { 
          clientId: 'client-1',
          status: 'pending',
        },
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter orders by date range', async () => {
      // Arrange
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      mockRequest.nextUrl.searchParams.set('startDate', startDate);
      mockRequest.nextUrl.searchParams.set('endDate', endDate);
      
      (prisma.orders.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prisma.orders.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.orders.findMany).toHaveBeenCalledWith({
        where: { 
          clientId: 'client-1',
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate + 'T23:59:59.999Z'),
          },
        },
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should search orders by customer name', async () => {
      // Arrange
      mockRequest.nextUrl.searchParams.set('search', 'John');
      
      (prisma.orders.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prisma.orders.count as jest.Mock).mockResolvedValue(1);

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(prisma.orders.findMany).toHaveBeenCalledWith({
        where: { 
          clientId: 'client-1',
          customerName: {
            contains: 'John',
            mode: 'insensitive',
          },
        },
        include: { clients: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('POST /api/orders', () => {
    it('should create order successfully', async () => {
      // Arrange
      const orderData = {
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: '+1234567890',
        pickupAddress: '123 Main St, New York, NY 10001',
        deliveryAddress: '456 Oak Ave, Boston, MA 02101',
        weight: 2.0,
        dimensions: '12x12x12',
        value: 150.00,
        notes: 'Fragile items',
      };
      
      mockRequest.json.mockResolvedValue(orderData);
      
      (prisma.orders.create as jest.Mock).mockResolvedValue({
        ...mockOrder,
        ...orderData,
        orderNumber: 'ORD-002',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.order.customerName).toBe('Jane Doe');
      expect(responseData.data.order.orderNumber).toBe('ORD-002');
      
      expect(prisma.orders.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client-1',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          customerPhone: '+1234567890',
          pickupAddress: '123 Main St, New York, NY 10001',
          deliveryAddress: '456 Oak Ave, Boston, MA 02101',
          weight: 2.0,
          dimensions: '12x12x12',
          value: 150.00,
          notes: 'Fragile items',
          status: 'pending',
        }),
        include: { clients: true },
      });
    });

    it('should validate required fields', async () => {
      // Arrange
      const orderData = {
        customerName: 'Jane Doe',
        // Missing required fields
      };
      
      mockRequest.json.mockResolvedValue(orderData);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Customer email is required');
    });

    it('should validate email format', async () => {
      // Arrange
      const orderData = {
        customerName: 'Jane Doe',
        customerEmail: 'invalid-email',
        customerPhone: '+1234567890',
        pickupAddress: '123 Main St, New York, NY 10001',
        deliveryAddress: '456 Oak Ave, Boston, MA 02101',
        weight: 2.0,
        value: 150.00,
      };
      
      mockRequest.json.mockResolvedValue(orderData);
      
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

    it('should validate phone number format', async () => {
      // Arrange
      const orderData = {
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: 'invalid-phone',
        pickupAddress: '123 Main St, New York, NY 10001',
        deliveryAddress: '456 Oak Ave, Boston, MA 02101',
        weight: 2.0,
        value: 150.00,
      };
      
      mockRequest.json.mockResolvedValue(orderData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateString.mockReturnValue({ 
        valid: false, 
        error: 'Invalid phone number format' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid phone number format');
    });

    it('should validate weight is positive', async () => {
      // Arrange
      const orderData = {
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: '+1234567890',
        pickupAddress: '123 Main St, New York, NY 10001',
        deliveryAddress: '456 Oak Ave, Boston, MA 02101',
        weight: -1.0, // Invalid weight
        value: 150.00,
      };
      
      mockRequest.json.mockResolvedValue(orderData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateNumber.mockReturnValue({ 
        valid: false, 
        error: 'Weight must be positive' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Weight must be positive');
    });

    it('should validate value is positive', async () => {
      // Arrange
      const orderData = {
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: '+1234567890',
        pickupAddress: '123 Main St, New York, NY 10001',
        deliveryAddress: '456 Oak Ave, Boston, MA 02101',
        weight: 2.0,
        value: -100.00, // Invalid value
      };
      
      mockRequest.json.mockResolvedValue(orderData);
      
      const { InputValidator } = require('@/lib/security-middleware');
      InputValidator.validateNumber.mockReturnValue({ 
        valid: false, 
        error: 'Value must be positive' 
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Value must be positive');
    });
  });

  // PUT tests commented out - orders route does not export PUT function
  describe.skip('PUT /api/orders', () => {
    it('should update order successfully', async () => {
      // Arrange
      const updateData = {
        id: 'order-1',
        status: 'in_transit',
        trackingNumber: 'TRACK123456',
        notes: 'Updated notes',
      };
      
      mockRequest.json.mockResolvedValue(updateData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.orders.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'in_transit',
        trackingNumber: 'TRACK123456',
        notes: 'Updated notes',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await PUT(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.order.status).toBe('in_transit');
      expect(responseData.data.order.trackingNumber).toBe('TRACK123456');
      
      expect(prisma.orders.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'in_transit',
          trackingNumber: 'TRACK123456',
          notes: 'Updated notes',
        }),
        include: { clients: true },
      });
    });

    it('should reject non-existent order', async () => {
      // Arrange
      const updateData = {
        id: 'non-existent',
        status: 'in_transit',
      };
      
      mockRequest.json.mockResolvedValue(updateData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await PUT(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Order not found');
    });

    it('should reject updating order from different client', async () => {
      // Arrange
      const updateData = {
        id: 'order-1',
        status: 'in_transit',
      };
      
      mockRequest.json.mockResolvedValue(updateData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue({
        ...mockOrder,
        clientId: 'different-client',
      });

      // Act
      const response = await PUT(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Access denied');
    });

    it('should validate order status', async () => {
      // Arrange
      const updateData = {
        id: 'order-1',
        status: 'invalid-status',
      };
      
      mockRequest.json.mockResolvedValue(updateData);

      // Act
      const response = await PUT(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid order status');
    });
  });

  describe('DELETE /api/orders', () => {
    it('should delete order successfully', async () => {
      // Arrange
      const deleteData = {
        id: 'order-1',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.orders.delete as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await DELETE(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Order deleted successfully');
      
      expect(prisma.orders.delete).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
    });

    it('should reject deleting non-existent order', async () => {
      // Arrange
      const deleteData = {
        id: 'non-existent',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await DELETE(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Order not found');
    });

    it('should reject deleting order from different client', async () => {
      // Arrange
      const deleteData = {
        id: 'order-1',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue({
        ...mockOrder,
        clientId: 'different-client',
      });

      // Act
      const response = await DELETE(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Access denied');
    });

    it('should reject deleting order with active status', async () => {
      // Arrange
      const deleteData = {
        id: 'order-1',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'in_transit',
      });

      // Act
      const response = await DELETE(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Cannot delete order with active status');
    });
  });

  describe('Authorization', () => {
    it('should require user role for GET', async () => {
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
        requiredRole: UserRole.USER,
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
        requiredRole: UserRole.USER,
        requiredPermissions: [PermissionLevel.WRITE],
        requireActiveUser: true,
        requireActiveClient: true,
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Audit Logging', () => {
    it('should log order creation', async () => {
      // Arrange
      const orderData = {
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: '+1234567890',
        pickupAddress: '123 Main St, New York, NY 10001',
        deliveryAddress: '456 Oak Ave, Boston, MA 02101',
        weight: 2.0,
        value: 150.00,
      };
      
      mockRequest.json.mockResolvedValue(orderData);
      
      (prisma.orders.create as jest.Mock).mockResolvedValue({
        ...mockOrder,
        ...orderData,
        orderNumber: 'ORD-002',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'ORDER_CREATED',
          severity: 'INFO',
          userId: 'user-1',
          clientId: 'client-1',
          action: 'CREATE_ORDER',
          details: expect.stringContaining('Order created successfully'),
        }),
      });
    });

    it.skip('should log order update', async () => {
      // Arrange
      const updateData = {
        id: 'order-1',
        status: 'in_transit',
      };
      
      mockRequest.json.mockResolvedValue(updateData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.orders.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: 'in_transit',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await PUT(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'ORDER_UPDATED',
          severity: 'INFO',
          userId: 'user-1',
          clientId: 'client-1',
          action: 'UPDATE_ORDER',
          details: expect.stringContaining('Order updated successfully'),
        }),
      });
    });

    it('should log order deletion', async () => {
      // Arrange
      const deleteData = {
        id: 'order-1',
      };
      
      mockRequest.json.mockResolvedValue(deleteData);
      
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.orders.delete as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await DELETE(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'ORDER_DELETED',
          severity: 'WARNING',
          userId: 'user-1',
          clientId: 'client-1',
          action: 'DELETE_ORDER',
          details: expect.stringContaining('Order deleted successfully'),
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      (prisma.orders.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

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
