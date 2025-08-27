import { prisma } from '@/lib/prisma';

export interface AnalyticsEventData {
  eventType: 'openai_image' | 'openai_address' | 'create_order';
  clientId?: string;
  userId?: string;
  eventData?: any;
}

export interface OrderAnalyticsData {
  orderId: number;
  clientId: string;
  userId?: string;
  creationPattern: 'manual' | 'text_ai' | 'image_ai';
}

export class AnalyticsService {
  /**
   * Track an analytics event
   */
  static async trackEvent(data: AnalyticsEventData): Promise<void> {
    try {
      await prisma.analytics_events.create({
        data: {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          eventType: data.eventType,
          clientId: data.clientId,
          userId: data.userId,
          eventData: data.eventData || {}
        }
      });
      
      console.log('📊 [ANALYTICS] Event tracked:', data.eventType, {
        clientId: data.clientId,
        userId: data.userId
      });
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to track event:', error);
    }
  }

  /**
   * Track order creation with pattern
   */
  static async trackOrderCreation(data: OrderAnalyticsData): Promise<void> {
    try {
      await prisma.order_analytics.create({
        data: {
          id: `order-analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderId: data.orderId,
          clientId: data.clientId,
          userId: data.userId,
          creationPattern: data.creationPattern
        }
      });
      
      console.log('📊 [ANALYTICS] Order creation tracked:', {
        orderId: data.orderId,
        pattern: data.creationPattern,
        clientId: data.clientId
      });
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to track order creation:', error);
    }
  }

  /**
   * Get platform-wide analytics
   */
  static async getPlatformAnalytics() {
    try {
      const [openaiImageCount, openaiAddressCount, createOrderCount] = await Promise.all([
        prisma.analytics_events.count({
          where: { eventType: 'openai_image' }
        }),
        prisma.analytics_events.count({
          where: { eventType: 'openai_address' }
        }),
        prisma.analytics_events.count({
          where: { eventType: 'create_order' }
        })
      ]);

      return {
        openaiImageCount,
        openaiAddressCount,
        createOrderCount
      };
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to get platform analytics:', error);
      return {
        openaiImageCount: 0,
        openaiAddressCount: 0,
        createOrderCount: 0
      };
    }
  }

  /**
   * Get client-specific analytics
   */
  static async getClientAnalytics(clientId: string) {
    try {
      const [openaiImageCount, openaiAddressCount, createOrderCount, orderPatterns] = await Promise.all([
        prisma.analytics_events.count({
          where: { 
            eventType: 'openai_image',
            clientId 
          }
        }),
        prisma.analytics_events.count({
          where: { 
            eventType: 'openai_address',
            clientId 
          }
        }),
        prisma.analytics_events.count({
          where: { 
            eventType: 'create_order',
            clientId 
          }
        }),
        prisma.order_analytics.groupBy({
          by: ['creationPattern'],
          where: { clientId },
          _count: {
            creationPattern: true
          }
        })
      ]);

      // Convert order patterns to object
      const patternCounts = {
        manual: 0,
        text_ai: 0,
        image_ai: 0
      };

      orderPatterns.forEach(pattern => {
        patternCounts[pattern.creationPattern as keyof typeof patternCounts] = pattern._count.creationPattern;
      });

      return {
        openaiImageCount,
        openaiAddressCount,
        createOrderCount,
        orderPatterns: patternCounts
      };
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to get client analytics:', error);
      return {
        openaiImageCount: 0,
        openaiAddressCount: 0,
        createOrderCount: 0,
        orderPatterns: {
          manual: 0,
          text_ai: 0,
          image_ai: 0
        }
      };
    }
  }

  /**
   * Get all clients with their analytics summary
   */
  static async getClientsAnalyticsSummary() {
    try {
      const clients = await prisma.clients.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          companyName: true,
          _count: {
            select: {
              orders: true
            }
          }
        }
      });

      const clientsWithAnalytics = await Promise.all(
        clients.map(async (client) => {
          const analytics = await this.getClientAnalytics(client.id);
          return {
            ...client,
            analytics
          };
        })
      );

      return clientsWithAnalytics;
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to get clients analytics summary:', error);
      return [];
    }
  }
}

export default AnalyticsService;
