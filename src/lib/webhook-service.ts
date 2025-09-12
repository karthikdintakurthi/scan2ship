import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  orderId?: number;
}

export interface WebhookConfig {
  id: string;
  clientId: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  retryCount: number;
  timeout: number;
  headers?: Record<string, string>;
}

export class WebhookService {
  /**
   * Get all active webhooks for a client
   */
  static async getActiveWebhooks(clientId: string): Promise<WebhookConfig[]> {
    try {
      // Note: The webhooks table expects clientId as Int, but we have string clientIds
      // For now, we'll return an empty array since there are no webhooks configured
      // TODO: Fix the webhooks table schema to use string clientId or implement proper mapping
      console.log(`🔗 [WEBHOOK_SERVICE] Skipping webhook lookup - schema mismatch (clientId: ${clientId})`);
      return [];
      
      // Original code commented out due to schema mismatch:
      // const webhooks = await prisma.webhooks.findMany({
      //   where: {
      //     clientId,
      //     isActive: true
      //   }
      // });
      // 
      // return webhooks.map(webhook => ({
      //   id: webhook.id,
      //   clientId: webhook.clientId,
      //   name: webhook.name,
      //   url: webhook.url,
      //   events: webhook.events,
      //   secret: webhook.secret || undefined,
      //   isActive: webhook.isActive,
      //   retryCount: webhook.retryCount,
      //   timeout: webhook.timeout,
      //   headers: webhook.headers as Record<string, string> || undefined
      // }));
    } catch (error) {
      console.error('❌ [WEBHOOK_SERVICE] Error getting active webhooks:', error);
      return [];
    }
  }

  /**
   * Create a new webhook configuration
   */
  static async createWebhook(config: Omit<WebhookConfig, 'id'>): Promise<WebhookConfig> {
    const webhook = await prisma.webhooks.create({
      data: {
        id: crypto.randomUUID(),
        clientId: config.clientId,
        name: config.name,
        url: config.url,
        events: config.events,
        secret: config.secret,
        isActive: config.isActive,
        retryCount: config.retryCount,
        timeout: config.timeout,
        headers: config.headers || {},
        updatedAt: new Date()
      }
    });

    return {
      id: webhook.id,
      clientId: webhook.clientId,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || undefined,
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      timeout: webhook.timeout,
      headers: webhook.headers as Record<string, string> || undefined
    };
  }

  /**
   * Update webhook configuration
   */
  static async updateWebhook(id: string, clientId: string, updates: Partial<Omit<WebhookConfig, 'id' | 'clientId'>>): Promise<WebhookConfig> {
    const webhook = await prisma.webhooks.update({
      where: {
        id,
        clientId // Ensure client isolation
      },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return {
      id: webhook.id,
      clientId: webhook.clientId,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || undefined,
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      timeout: webhook.timeout,
      headers: webhook.headers as Record<string, string> || undefined
    };
  }

  /**
   * Delete webhook configuration
   */
  static async deleteWebhook(id: string, clientId: string): Promise<boolean> {
    try {
      await prisma.webhooks.delete({
        where: {
          id,
          clientId // Ensure client isolation
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      return false;
    }
  }

  /**
   * Get webhook by ID
   */
  static async getWebhook(id: string, clientId: string): Promise<WebhookConfig | null> {
    const webhook = await prisma.webhooks.findUnique({
      where: {
        id,
        clientId // Ensure client isolation
      }
    });

    if (!webhook) return null;

    return {
      id: webhook.id,
      clientId: webhook.clientId,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || undefined,
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      timeout: webhook.timeout,
      headers: webhook.headers as Record<string, string> || undefined
    };
  }

  /**
   * Trigger webhooks for a specific event
   */
  static async triggerWebhooks(event: string, data: any, clientId: string, orderId?: number): Promise<void> {
    console.log(`🔗 [WEBHOOK_SERVICE] Triggering webhooks for event: ${event}, clientId: ${clientId}`);
    
    const webhooks = await this.getActiveWebhooks(clientId);
    const relevantWebhooks = webhooks.filter(webhook => 
      webhook.events.includes(event) || webhook.events.includes('*')
    );

    console.log(`🔗 [WEBHOOK_SERVICE] Found ${relevantWebhooks.length} webhooks for event: ${event}`);

    // Trigger webhooks in parallel
    const webhookPromises = relevantWebhooks.map(webhook => 
      this.sendWebhook(webhook, event, data, orderId)
    );

    await Promise.allSettled(webhookPromises);
  }

  /**
   * Send webhook to a specific endpoint
   */
  private static async sendWebhook(
    webhook: WebhookConfig, 
    event: string, 
    data: any, 
    orderId?: number
  ): Promise<void> {
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      orderId
    };

    // Generate signature if secret is provided
    let signature: string | undefined;
    if (webhook.secret) {
      const payloadString = JSON.stringify(payload);
      signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(payloadString)
        .digest('hex');
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Scan2Ship-Webhook/1.0',
      ...webhook.headers
    };

    if (signature) {
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    // Log webhook attempt
    const logId = crypto.randomUUID();
    await this.logWebhookAttempt(logId, webhook.id, event, orderId, 'pending');

    try {
      console.log(`🔗 [WEBHOOK_SERVICE] Sending webhook to ${webhook.url} for event: ${event}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      
      if (response.ok) {
        console.log(`✅ [WEBHOOK_SERVICE] Webhook sent successfully to ${webhook.url}`);
        await this.logWebhookAttempt(logId, webhook.id, event, orderId, 'success', response.status, responseText);
      } else {
        console.warn(`⚠️ [WEBHOOK_SERVICE] Webhook failed with status ${response.status} to ${webhook.url}`);
        await this.logWebhookAttempt(logId, webhook.id, event, orderId, 'failed', response.status, responseText);
      }
    } catch (error) {
      console.error(`❌ [WEBHOOK_SERVICE] Webhook error for ${webhook.url}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logWebhookAttempt(logId, webhook.id, event, orderId, 'failed', undefined, undefined, errorMessage);
    }
  }

  /**
   * Log webhook attempt
   */
  private static async logWebhookAttempt(
    logId: string,
    webhookId: string,
    eventType: string,
    orderId: number | undefined,
    status: 'success' | 'failed' | 'pending',
    responseCode?: number,
    responseBody?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.webhook_logs.create({
        data: {
          id: logId,
          webhookId,
          eventType,
          orderId,
          status,
          responseCode,
          responseBody: responseBody?.substring(0, 1000), // Limit response body length
          errorMessage,
          attemptCount: 1
        }
      });
    } catch (error) {
      console.error('Failed to log webhook attempt:', error);
    }
  }

  /**
   * Get webhook logs for a webhook
   */
  static async getWebhookLogs(webhookId: string, clientId: string, limit: number = 50): Promise<any[]> {
    // Verify webhook belongs to client
    const webhook = await prisma.webhooks.findUnique({
      where: { id: webhookId, clientId }
    });

    if (!webhook) {
      throw new Error('Webhook not found or access denied');
    }

    return await prisma.webhook_logs.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Retry failed webhook
   */
  static async retryWebhook(logId: string, clientId: string): Promise<boolean> {
    try {
      const log = await prisma.webhook_logs.findUnique({
        where: { id: logId },
        include: { webhooks: true }
      });

      if (!log || log.webhooks.clientId !== clientId) {
        throw new Error('Webhook log not found or access denied');
      }

      if (log.status === 'success') {
        throw new Error('Webhook already succeeded');
      }

      // Get webhook configuration
      const webhook = await this.getWebhook(log.webhookId, clientId);
      if (!webhook) {
        throw new Error('Webhook configuration not found');
      }

      // Retry the webhook
      await this.sendWebhook(webhook, log.eventType, {}, log.orderId || undefined);
      
      return true;
    } catch (error) {
      console.error('Failed to retry webhook:', error);
      return false;
    }
  }
}
