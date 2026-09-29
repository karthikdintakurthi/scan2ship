import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { ClientCreditCostsService } from './client-credit-costs-service';

export interface CreditTransaction {
  id: string;
  clientId: string;
  userId?: string;
  type: 'ADD' | 'DEDUCT' | 'RESET' | 'REFUND';
  amount: number;
  balance: number;
  description: string;
  feature?: 'ORDER' | 'IMAGE_PROCESSING' | 'TEXT_PROCESSING' | 'MANUAL';
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

export interface CreditCharge extends ClientCredits {
  transactionId: string;
}

export class InsufficientCreditsError extends Error {
  constructor(public readonly required: number) {
    super('Insufficient credits');
    this.name = 'InsufficientCreditsError';
  }
}

function assertPositiveCreditAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`Credit amount must be a positive integer, got ${amount}`);
  }
}

function newTransactionId() {
  return `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Credit costs for different features
export const CREDIT_COSTS = {
  ORDER: 1,
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
    userId?: string,
    clientName?: string
  ): Promise<ClientCredits> {
    assertPositiveCreditAmount(amount);
    try {
      const { credits } = await prisma.$transaction((tx) =>
        CreditService.addCreditsInTransaction(tx, clientId, amount, description, { userId, clientName })
      );
      return credits;
    } catch (error) {
      console.error('Error adding credits:', error);
      throw new Error('Failed to add credits');
    }
  }

  /**
   * Add credits as part of a caller's transaction, e.g. approving a recharge
   * request, so the approval and the balance change commit together.
   */
  static async addCreditsInTransaction(
    tx: Prisma.TransactionClient,
    clientId: string,
    amount: number,
    description: string,
    { userId, clientName, utrNumber }: { userId?: string; clientName?: string; utrNumber?: string | null } = {}
  ): Promise<{ credits: ClientCredits; transactionId: string }> {
    assertPositiveCreditAmount(amount);

    // Single atomic increment so concurrent additions are never lost
    const credits = await tx.client_credits.upsert({
      where: { clientId },
      create: {
        id: `credits-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        balance: amount,
        totalAdded: amount,
        totalUsed: 0,
        updatedAt: new Date()
      },
      update: {
        balance: { increment: amount },
        totalAdded: { increment: amount },
        updatedAt: new Date()
      }
    });

    const transactionId = newTransactionId();
    await tx.credit_transactions.create({
      data: {
        id: transactionId,
        clientId,
        clientName: clientName || 'Unknown Client',
        userId,
        type: 'ADD',
        amount,
        balance: credits.balance,
        description,
        feature: 'MANUAL',
        utrNumber: utrNumber ?? undefined,
        createdAt: new Date()
      }
    });

    return { credits, transactionId };
  }

  /**
   * Deduct credits from client. Throws InsufficientCreditsError when the
   * balance is too low; the check and the decrement are one conditional update.
   */
  static async deductCredits(
    clientId: string,
    amount: number,
    description: string,
    feature: keyof typeof CREDIT_COSTS,
    userId?: string,
    orderId?: number,
    clientName?: string
  ): Promise<CreditCharge> {
    assertPositiveCreditAmount(amount);
    try {
      return await prisma.$transaction(async (tx) => {
        const { count } = await tx.client_credits.updateMany({
          where: { clientId, balance: { gte: amount } },
          data: {
            balance: { decrement: amount },
            totalUsed: { increment: amount },
            updatedAt: new Date()
          }
        });

        if (count === 0) {
          throw new InsufficientCreditsError(amount);
        }

        // Row is locked by the update above until commit, so this reads our own result
        const updatedCredits = await tx.client_credits.findUniqueOrThrow({ where: { clientId } });
        const transactionId = newTransactionId();

        await tx.credit_transactions.create({
          data: {
            id: transactionId,
            clientId,
            clientName: clientName || 'Unknown Client',
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

        return { ...updatedCredits, transactionId };
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) throw error;
      console.error('Error deducting credits:', error);
      throw new Error('Failed to deduct credits');
    }
  }

  /**
   * Return credits taken by a charge whose work did not complete.
   */
  static async refundCredits(
    clientId: string,
    amount: number,
    description: string,
    feature: keyof typeof CREDIT_COSTS,
    userId?: string,
    orderId?: number
  ): Promise<ClientCredits> {
    assertPositiveCreditAmount(amount);
    return prisma.$transaction(async (tx) => {
      const updatedCredits = await tx.client_credits.update({
        where: { clientId },
        data: {
          balance: { increment: amount },
          totalUsed: { decrement: amount },
          updatedAt: new Date()
        }
      });

      await tx.credit_transactions.create({
        data: {
          id: newTransactionId(),
          clientId,
          clientName: 'Unknown Client',
          userId,
          type: 'REFUND',
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
  }

  /**
   * Link a charge made before its order existed to the order.
   */
  static async attachOrderToTransaction(transactionId: string, orderId: number): Promise<void> {
    await prisma.credit_transactions.update({
      where: { id: transactionId },
      data: { orderId }
    });
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
    userId?: string,
    clientName?: string
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
            clientName: clientName || 'Unknown Client',
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

      // Get only ADD and RESET transactions for the client (recharge history)
      const allTransactions = await prisma.credit_transactions.findMany({
        where: { 
          clientId,
          type: {
            in: ['ADD', 'RESET', 'credit', 'admin_credit', 'admin_reset']
          }
        },
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
        let orderRef = 'Manual Transaction';
        
        // For recharge history, group by transaction type for better organization
        if (transaction.type === 'ADD') {
          orderId = 'admin_recharge';
          orderRef = 'Admin Credit Addition';
        } else if (transaction.type === 'RESET') {
          orderId = 'admin_reset';
          orderRef = 'Admin Balance Reset';
        } else if (transaction.type === 'credit' || transaction.type === 'admin_credit') {
          orderId = 'credit_recharge';
          orderRef = 'Credit Recharge';
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
