import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import { enhancedJwtConfig } from '@/lib/jwt-config';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = enhancedJwtConfig.verifyToken(token);
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { clients: true }
    });
    
    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
}

// GET /api/credits/transactions - Get credit transactions
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await CreditService.getCreditTransactionsByOrder(
      user.clientId,
      page,
      limit
    );
    
    return NextResponse.json({
      success: true,
      data: result.orderTransactions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting credit transactions:', error);
    return NextResponse.json(
      { error: 'Failed to get credit transactions' },
      { status: 500 }
    );
  }
}
