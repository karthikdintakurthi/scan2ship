import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated admin user
async function getAuthenticatedAdminUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { clients: true }
    });
    
    // Check if user is master admin
    if (user && user.role === 'master_admin') {
      return user;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// GET /api/admin/credits/[clientId]/transactions - Get client credit transactions (admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getAuthenticatedAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    
    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await CreditService.getCreditTransactionsByOrder(
      clientId,
      page,
      limit
    );
    
    return NextResponse.json({
      success: true,
      data: result.orderTransactions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting client credit transactions:', error);
    return NextResponse.json(
      { error: 'Failed to get client credit transactions' },
      { status: 500 }
    );
  }
}
