import { prisma } from './prisma';

export interface ClientCreditCost {
  id: string;
  clientId: string;
  feature: 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING';
  cost: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientCreditCostInput {
  clientId: string;
  feature: 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING';
  cost: number;
}

export interface UpdateClientCreditCostInput {
  cost?: number;
  isActive?: boolean;
}

export class ClientCreditCostsService {
  /**
   * Get all credit costs for a client
   */
  static async getClientCreditCosts(clientId: string): Promise<ClientCreditCost[]> {
    try {
      const costs = await prisma.client_credit_costs.findMany({
        where: { clientId, isActive: true },
        orderBy: { feature: 'asc' }
      });

      // If no custom costs exist, create default ones
      if (costs.length === 0) {
        return await this.createDefaultCreditCosts(clientId);
      }

      return costs.map(cost => ({
        ...cost,
        feature: cost.feature as 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING'
      }));
    } catch (error) {
      console.error('Error getting client credit costs:', error);
      throw new Error('Failed to get client credit costs');
    }
  }

  /**
   * Get credit cost for a specific feature
   */
  static async getClientCreditCost(
    clientId: string, 
    feature: 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING'
  ): Promise<number> {
    try {
      const costRecord = await prisma.client_credit_costs.findUnique({
        where: { 
          clientId_feature: { clientId, feature } 
        }
      });

      if (costRecord && costRecord.isActive) {
        return costRecord.cost;
      }

      // Return default cost if no custom cost is set
      return this.getDefaultCost(feature);
    } catch (error) {
      console.error('Error getting client credit cost:', error);
      // Return default cost on error
      return this.getDefaultCost(feature);
    }
  }

  /**
   * Create or update credit cost for a client
   */
  static async upsertClientCreditCost(
    clientId: string,
    feature: 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING',
    cost: number
  ): Promise<ClientCreditCost> {
    try {
      // Validate cost (minimum 0.5 credits)
      if (cost < 0.5) {
        throw new Error('Credit cost must be at least 0.5 credits');
      }

      const result = await prisma.client_credit_costs.upsert({
        where: { 
          clientId_feature: { clientId, feature } 
        },
        update: {
          cost,
          updatedAt: new Date()
        },
        create: {
          id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId,
          feature,
          cost,
          isActive: true,
          updatedAt: new Date()
        }
      });

              return {
          ...result,
          feature: result.feature as 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING'
        };
      } catch (error) {
        console.error('Error upserting client credit cost:', error);
        throw error;
      }
    }

  /**
   * Update credit cost
   */
  static async updateClientCreditCost(
    id: string,
    updates: UpdateClientCreditCostInput
  ): Promise<ClientCreditCost> {
    try {
      if (updates.cost !== undefined && updates.cost < 0.5) {
        throw new Error('Credit cost must be at least 0.5 credits');
      }

      const result = await prisma.client_credit_costs.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

              return {
          ...result,
          feature: result.feature as 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING'
        };
      } catch (error) {
        console.error('Error updating client credit cost:', error);
        throw error;
      }
    }

  /**
   * Delete credit cost (soft delete by setting isActive to false)
   */
  static async deleteClientCreditCost(id: string): Promise<void> {
    try {
      await prisma.client_credit_costs.update({
        where: { id },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error deleting client credit cost:', error);
      throw error;
    }
  }

  /**
   * Create default credit costs for a new client
   */
  private static async createDefaultCreditCosts(clientId: string): Promise<ClientCreditCost[]> {
    try {
      const defaultCosts = [
        { feature: 'ORDER' as const, cost: 1.0 },
        { feature: 'WHATSAPP' as const, cost: 1.0 },
        { feature: 'IMAGE_PROCESSING' as const, cost: 2.0 },
        { feature: 'TEXT_PROCESSING' as const, cost: 1.0 }
      ];

      const createdCosts = await Promise.all(
        defaultCosts.map(async (cost) => {
                  return await prisma.client_credit_costs.create({
          data: {
            id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId,
            feature: cost.feature,
            cost: cost.cost,
            isActive: true,
            updatedAt: new Date()
          }
        });
        })
      );

      return createdCosts.map(cost => ({
        ...cost,
        feature: cost.feature as 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING'
      }));
    } catch (error) {
      console.error('Error creating default credit costs:', error);
      throw error;
    }
  }

  /**
   * Get default cost for a feature
   */
  private static getDefaultCost(feature: 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING'): number {
    const defaultCosts = {
      ORDER: 1.0,
      WHATSAPP: 1.0,
      IMAGE_PROCESSING: 2.0,
      TEXT_PROCESSING: 1.0
    };

    return defaultCosts[feature];
  }

  /**
   * Bulk update credit costs for a client
   */
  static async bulkUpdateClientCreditCosts(
    clientId: string,
    costs: Array<{ feature: 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING'; cost: number }>
  ): Promise<ClientCreditCost[]> {
    try {
      // Validate all costs
      for (const cost of costs) {
        if (cost.cost < 0.5) {
          throw new Error(`Credit cost for ${cost.feature} must be at least 0.5 credits`);
        }
      }

      const results = await Promise.all(
        costs.map(async (cost) => {
          return await this.upsertClientCreditCost(clientId, cost.feature, cost.cost);
        })
      );

      return results;
    } catch (error) {
      console.error('Error bulk updating client credit costs:', error);
      throw error;
    }
  }
}
