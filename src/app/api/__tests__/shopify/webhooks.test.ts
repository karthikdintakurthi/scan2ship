/**
 * Shopify Webhooks API Tests
 * Comprehensive tests for Shopify webhook processing
 */

import { NextRequest } from 'next/server';
import { POST } from '../shopify/webhooks/route';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    shopify_integrations: {
      findFirst: jest.fn(),
    },
    shopify_orders: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orders: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    audit_logs: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn(() => null),
}));

jest.mock('@/lib/input-sanitizer', () => ({
  sanitizeString: jest.fn((input) => input),
  sanitizeJSON: jest.fn((input) => input),
}));

describe('POST /api/shopify/webhooks', () => {
  let mockRequest: NextRequest;
  const mockIntegration = {
    id: 'integration-1',
    shop: 'test-shop.myshopify.com',
    accessToken: 'access-token-123',
    isActive: true,
  };

  const mockShopifyOrder = {
    id: 'shopify-order-1',
    shopifyOrderId: '123456789',
    shop: 'test-shop.myshopify.com',
    status: 'pending',
    data: { id: 123456789, status: 'pending' },
  };

  const mockScan2ShipOrder = {
    id: 'scan2ship-order-1',
    clientId: 'client-1',
    status: 'pending',
    shopifyOrderId: '123456789',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock request
    mockRequest = {
      json: jest.fn(),
      headers: new Map(),
    } as any;
  });

  describe('Order Creation Webhook', () => {
    it('should process order creation webhook successfully', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
        email: 'customer@example.com',
        total_price: '29.99',
        currency: 'USD',
        financial_status: 'pending',
        fulfillment_status: null,
        line_items: [
          {
            id: 987654321,
            title: 'Test Product',
            quantity: 1,
            price: '29.99',
          },
        ],
        shipping_address: {
          first_name: 'John',
          last_name: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          province: 'NY',
          zip: '10001',
          country: 'United States',
        },
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shopify_orders.create as jest.Mock).mockResolvedValue({
        id: 'shopify-order-1',
        shopifyOrderId: '123456789',
        shop: 'test-shop.myshopify.com',
        status: 'pending',
        data: webhookPayload,
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Webhook processed successfully');
      
      expect(prisma.shopify_orders.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopifyOrderId: '123456789',
          shop: 'test-shop.myshopify.com',
          status: 'pending',
          data: webhookPayload,
        }),
      });
    });

    it('should handle duplicate order creation', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
        email: 'customer@example.com',
        total_price: '29.99',
        currency: 'USD',
        financial_status: 'pending',
        fulfillment_status: null,
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(mockShopifyOrder);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Order already exists, skipping');
    });
  });

  describe('Order Update Webhook', () => {
    it('should process order update webhook successfully', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
        email: 'customer@example.com',
        total_price: '29.99',
        currency: 'USD',
        financial_status: 'paid',
        fulfillment_status: 'fulfilled',
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/updated');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(mockShopifyOrder);
      (prisma.shopify_orders.update as jest.Mock).mockResolvedValue({
        ...mockShopifyOrder,
        status: 'fulfilled',
        data: webhookPayload,
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Webhook processed successfully');
      
      expect(prisma.shopify_orders.update).toHaveBeenCalledWith({
        where: { id: 'shopify-order-1' },
        data: expect.objectContaining({
          status: 'fulfilled',
          data: webhookPayload,
        }),
      });
    });
  });

  describe('Fulfillment Creation Webhook', () => {
    it('should process fulfillment creation webhook successfully', async () => {
      // Arrange
      const webhookPayload = {
        id: 987654321,
        order_id: 123456789,
        status: 'success',
        tracking_number: 'TRACK123456',
        tracking_company: 'UPS',
        line_items: [
          {
            id: 111222333,
            quantity: 1,
          },
        ],
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'fulfillments/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(mockShopifyOrder);
      (prisma.orders.findFirst as jest.Mock).mockResolvedValue(mockScan2ShipOrder);
      (prisma.orders.update as jest.Mock).mockResolvedValue({
        ...mockScan2ShipOrder,
        status: 'fulfilled',
        trackingNumber: 'TRACK123456',
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Mock fetch for Shopify API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ fulfillment: { id: 987654321 } }),
      });

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Webhook processed successfully');
      
      expect(prisma.orders.update).toHaveBeenCalledWith({
        where: { id: 'scan2ship-order-1' },
        data: expect.objectContaining({
          status: 'fulfilled',
          trackingNumber: 'TRACK123456',
        }),
      });
    });
  });

  describe('Security Validation', () => {
    it('should reject webhook with invalid signature', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
      };

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', 'invalid-signature');
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid webhook signature');
    });

    it('should reject webhook from unknown shop', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'unknown-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Shop integration not found');
    });

    it('should reject webhook with missing required headers', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
      };

      mockRequest.json.mockResolvedValue(webhookPayload);
      // Missing required headers

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Missing required webhook headers');
    });

    it('should reject webhook with invalid topic', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'invalid/topic');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Unsupported webhook topic');
    });
  });

  describe('Data Validation', () => {
    it('should validate order data structure', async () => {
      // Arrange
      const invalidPayload = {
        // Missing required fields
        invalid_field: 'invalid',
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(invalidPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(invalidPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);

      // Act
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid order data');
    });

    it('should sanitize webhook payload', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
        email: 'customer@example.com',
        note: '<script>alert("xss")</script>',
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shopify_orders.create as jest.Mock).mockResolvedValue({
        id: 'shopify-order-1',
        shopifyOrderId: '123456789',
        shop: 'test-shop.myshopify.com',
        status: 'pending',
        data: webhookPayload,
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      const { sanitizeJSON } = require('@/lib/input-sanitizer');
      sanitizeJSON.mockReturnValue({
        ...webhookPayload,
        note: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      });

      // Act
      await POST(mockRequest);

      // Assert
      expect(sanitizeJSON).toHaveBeenCalledWith(webhookPayload);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
        email: 'customer@example.com',
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shopify_orders.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await POST(mockRequest);
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

  describe('Audit Logging', () => {
    it('should log successful webhook processing', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
        email: 'customer@example.com',
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shopify_orders.create as jest.Mock).mockResolvedValue({
        id: 'shopify-order-1',
        shopifyOrderId: '123456789',
        shop: 'test-shop.myshopify.com',
        status: 'pending',
        data: webhookPayload,
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'WEBHOOK_PROCESSED',
          severity: 'INFO',
          action: 'SHOPIFY_WEBHOOK',
          details: expect.stringContaining('Webhook processed successfully'),
          metadata: expect.stringContaining('orders/create'),
        }),
      });
    });

    it('should log failed webhook processing', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
      };

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', 'invalid-signature');
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      await POST(mockRequest);

      // Assert
      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'WEBHOOK_FAILURE',
          severity: 'WARNING',
          action: 'INVALID_SIGNATURE',
          details: expect.stringContaining('Invalid webhook signature'),
        }),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large webhook payloads', async () => {
      // Arrange
      const largePayload = {
        id: 123456789,
        order_number: 1001,
        line_items: Array(1000).fill({
          id: 987654321,
          title: 'Test Product',
          quantity: 1,
          price: '29.99',
        }),
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(largePayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(largePayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shopify_orders.create as jest.Mock).mockResolvedValue({
        id: 'shopify-order-1',
        shopifyOrderId: '123456789',
        shop: 'test-shop.myshopify.com',
        status: 'pending',
        data: largePayload,
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should handle webhook with special characters', async () => {
      // Arrange
      const webhookPayload = {
        id: 123456789,
        order_number: 1001,
        email: 'customer@example.com',
        note: 'Order with special chars: àáâãäåæçèéêë',
      };

      const hmac = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      mockRequest.json.mockResolvedValue(webhookPayload);
      mockRequest.headers.set('x-shopify-hmac-sha256', hmac);
      mockRequest.headers.set('x-shopify-topic', 'orders/create');
      mockRequest.headers.set('x-shopify-shop-domain', 'test-shop.myshopify.com');

      (prisma.shopify_integrations.findFirst as jest.Mock).mockResolvedValue(mockIntegration);
      (prisma.shopify_orders.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shopify_orders.create as jest.Mock).mockResolvedValue({
        id: 'shopify-order-1',
        shopifyOrderId: '123456789',
        shop: 'test-shop.myshopify.com',
        status: 'pending',
        data: webhookPayload,
      });
      (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
