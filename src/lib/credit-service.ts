import { prisma } from './prisma';
import { ClientCreditCostsService } from './client-credit-costs-service';

export interface CreditTransaction {
  id: string;
  clientId: string;
  userId?: string;
  type: 'ADD' | 'DEDUCT' | 'RESET';
  amount: number;
  balance: number;
  description: string;
  feature?: 'ORDER' | 'WHATSAPP' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING' | 'MANUAL';
  orderId?: number;
  createdAt: Date;
}

export interface ClientCredits {
  id: string;
  clientId: string;
  balance: number;
  totalAdded: number;
  totalUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

// Credit costs for different features
export const CREDIT_COSTS = {
  ORDER: 1,
  WHATSAPP: 1,
  IMAGE_PROCESSING: 2,
  TEXT_PROCESSING: 1,
} as const;

export class CreditService {
  /**
   * Get client credits
   */
  static async getClientCredits(clientId: string): Promise<ClientCredits | null> {
    try {
      let credits = await prisma.client_credits.findUnique({
        where: { clientId }
      });

      // Create credits record if it doesn't exist
      if (!credits) {
        credits = await prisma.client_credits.create({
          data: {
            id: `credits-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId,
            balance: 0,
            totalAdded: 0,
            totalUsed: 0,
            updatedAt: new Date()
          }
        });
      }

      return credits;
    } catch (error) {
      console.error('Error getting client credits:', error);
      throw new Error('Failed to get client credits');
    }
  }

  /**
   * Add credits to client
   */
  static async addCredits(
    clientId: string,
    amount: number,
    description: string,
    userId?: string
  ): Promise<ClientCredits> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get or create client credits
        let credits = await tx.client_credits.findUnique({
          where: { clientId }
        });

        if (!credits) {
          credits = await tx.client_credits.create({
            data: {
              id: `credits-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              clientId,
              balance: 0,
              totalAdded: 0,
              totalUsed: 0,
              updatedAt: new Date()
            }
          });
        }

        // Update credits
        const updatedCredits = await tx.client_credits.update({
          where: { clientId },
          data: {
            balance: credits.balance + amount,
            totalAdded: credits.totalAdded + amount,
            updatedAt: new Date()
          }
        });

        // Create transaction record
        await tx.credit_transactions.create({
          data: {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId,
            userId,
            type: 'ADD',
            amount,
            balance: updatedCredits.balance,
            description,
            feature: 'MANUAL',
            createdAt: new Date()
          }
        });

        return updatedCredits;
      });

      return result;
    } catch (error) {
      console.error('Error adding credits:', error);
      throw new Error('Failed to add credits');
    }
  }

  /**
   * Deduct credits from client
   */
  static async deductCredits(
    clientId: string,
    amount: number,
    description: string,
    feature: keyof typeof CREDIT_COSTS,
    userId?: string,
    orderId?: number
  ): Promise<ClientCredits> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get client credits
        const credits = await tx.client_credits.findUnique({
          where: { clientId }
        });

        if (!credits) {
          throw new Error('Client credits not found');
        }

        if (credits.balance < amount) {
          throw new Error('Insufficient credits');
        }

        // Update credits
        const updatedCredits = await tx.client_credits.update({
          where: { clientId },
          data: {
            balance: credits.balance - amount,
            totalUsed: credits.totalUsed + amount,
            updatedAt: new Date()
          }
        });

        // Create transaction record
        await tx.credit_transactions.create({
          data: {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId,
            userId,
            type: 'DEDUCT',
            amount,
            balance: updatedCredits.balance,
            description,
            feature,
            orderId,
            createdAt: new Date()
          }
        });

        return updatedCredits;
      });

      return result;
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw new Error('Failed to deduct credits');
    }
  }

  /**
   * Deduct credits for a specific feature (automatically gets client-specific cost)
   */
  static async deductCreditsForFeature(
    clientId: string,
    feature: keyof typeof CREDIT_COSTS,
    description: string,
    userId?: string,
    orderId?: number
  ): Promise<ClientCredits> {
    try {
      // Get client-specific credit cost for this feature
      const cost = await ClientCreditCostsService.getClientCreditCost(clientId, feature);
      
      // Use the deductCredits method with the calculated cost
      return await this.deductCredits(clientId, cost, description, feature, userId, orderId);
    } catch (error) {
      console.error('Error deducting credits for feature:', error);
      throw error;
    }
  }

  /**
   * Reset client credits
   */
  static async resetCredits(
    clientId: string,
    newBalance: number,
    description: string,
    userId?: string
  ): Promise<ClientCredits> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get or create client credits
        let credits = await tx.client_credits.findUnique({
          where: { clientId }
        });

        if (!credits) {
          credits = await tx.client_credits.create({
            data: {
              id: `credits-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              clientId,
              balance: 0,
              totalAdded: 0,
              totalUsed: 0,
              updatedAt: new Date()
            }
          });
        }

        const difference = newBalance - credits.balance;

        // Update credits
        const updatedCredits = await tx.client_credits.update({
          where: { clientId },
          data: {
            balance: newBalance,
            totalAdded: credits.totalAdded + (difference > 0 ? difference : 0),
            totalUsed: credits.totalUsed + (difference < 0 ? Math.abs(difference) : 0),
            updatedAt: new Date()
          }
        });

        // Create transaction record
        await tx.credit_transactions.create({
          data: {
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId,
            userId,
            type: 'RESET',
            amount: difference,
            balance: updatedCredits.balance,
            description,
            feature: 'MANUAL',
            createdAt: new Date()
          }
        });

        return updatedCredits;
      });

      return result;
    } catch (error) {
      console.error('Error resetting credits:', error);
      throw new Error('Failed to reset credits');
    }
  }

  /**
   * Get credit transactions for a client
   */
  static async getCreditTransactions(
    clientId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: CreditTransaction[]; pagination: any }> {
    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.credit_transactions.findMany({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            users: {
              select: {
                name: true,
                email: true
              }
            },
            orders: {
              select: {
                id: true,
                reference_number: true
              }
            }
          }
        }),
        prisma.credit_transactions.count({
          where: { clientId }
        })
      ]);

      return {
        transactions: transactions as CreditTransaction[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting credit transactions:', error);
      throw new Error('Failed to get credit transactions');
    }
  }

  /**
   * Get credit transactions grouped by order
   */
  static async getCreditTransactionsByOrder(
    clientId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orderTransactions: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * limit;

      // Get all transactions for the client
      const allTransactions = await prisma.credit_transactions.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              name: true,
              email: true
            }
          },
          orders: {
            select: {
              id: true,
              reference_number: true
            }
          }
        }
      });

      // Group transactions by order
      const orderGroups = new Map();
      
      allTransactions.forEach(transaction => {
        let orderId = transaction.orderId || 'manual';
        let orderRef = transaction.orders?.reference_number || 'Manual Transaction';
        
        // Special handling for AI processing transactions without order ID
        if (!transaction.orderId && (transaction.feature === 'IMAGE_PROCESSING' || transaction.feature === 'TEXT_PROCESSING')) {
          orderId = transaction.feature === 'IMAGE_PROCESSING' ? 'image_processing' : 'text_processing';
          orderRef = 'AI Usage in Order reference';
        }
        
        if (!orderGroups.has(orderId)) {
          orderGroups.set(orderId, {
            orderId,
            orderReference: orderRef,
            totalCredits: 0,
            transactions: [],
            createdAt: transaction.createdAt,
            lastUpdated: transaction.createdAt
          });
        }
        
        const group = orderGroups.get(orderId);
        group.transactions.push(transaction);
        
        // For deductions, we subtract the amount (negative impact)
        // For additions, we add the amount (positive impact)
        if (transaction.type === 'DEDUCT') {
          group.totalCredits -= transaction.amount;
        } else if (transaction.type === 'ADD') {
          group.totalCredits += transaction.amount;
        } else if (transaction.type === 'RESET') {
          group.totalCredits += transaction.amount;
        }
        
        if (transaction.createdAt > group.lastUpdated) {
          group.lastUpdated = transaction.createdAt;
        }
      });

      // Convert to array and sort by last updated
      const orderTransactions = Array.from(orderGroups.values())
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

      // Apply pagination
      const total = orderTransactions.length;
      const paginatedTransactions = orderTransactions.slice(skip, skip + limit);

      return {
        orderTransactions: paginatedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting credit transactions by order:', error);
      throw new Error('Failed to get credit transactions by order');
    }
  }

  /**
   * Check if client has sufficient credits
   */
  static async hasSufficientCredits(
    clientId: string,
    amount: number
  ): Promise<boolean> {
    try {
      const credits = await this.getClientCredits(clientId);
      return credits ? credits.balance >= amount : false;
    } catch (error) {
      console.error('Error checking credit sufficiency:', error);
      return false;
    }
  }

  /**
   * Get credit cost for a feature
   */
  static getCreditCost(feature: keyof typeof CREDIT_COSTS): number {
    return CREDIT_COSTS[feature];
  }

  /**
   * Deduct credits for order creation
   */
  static async deductOrderCredits(
    clientId: string,
    userId?: string,
    orderId?: number
  ): Promise<void> {
    const cost = this.getCreditCost('ORDER');
    await this.deductCredits(
      clientId,
      cost,
      'Order creation',
      'ORDER',
      userId,
      orderId
    );
  }

  /**
   * Deduct credits for WhatsApp message
   */
  static async deductWhatsAppCredits(
    clientId: string,
    userId?: string,
    orderId?: number
  ): Promise<void> {
    const cost = this.getCreditCost('WHATSAPP');
    await this.deductCredits(
      clientId,
      cost,
      'WhatsApp message sent',
      'WHATSAPP',
      userId,
      orderId
    );
  }

  /**
   * Deduct credits for image processing
   */
  static async deductImageProcessingCredits(
    clientId: string,
    userId?: string,
    orderId?: number
  ): Promise<void> {
    const cost = this.getCreditCost('IMAGE_PROCESSING');
    await this.deductCredits(
      clientId,
      cost,
      'AI Usage in Order reference',
      'IMAGE_PROCESSING',
      userId,
      orderId
    );
  }

  /**
   * Deduct credits for text processing
   */
  static async deductTextProcessingCredits(
    clientId: string,
    userId?: string,
    orderId?: number
  ): Promise<void> {
    const cost = this.getCreditCost('TEXT_PROCESSING');
    await this.deductCredits(
      clientId,
      cost,
      'AI Usage in Order reference',
      'TEXT_PROCESSING',
      userId,
      orderId
    );
  }
}
