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

// GET /api/admin/credits/[clientId] - Get client credits (admin)
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

    const credits = await CreditService.getClientCredits(clientId);
    
    return NextResponse.json({
      success: true,
      data: {
        credits,
        client: {
          id: client.id,
          companyName: client.companyName,
          email: client.email
        }
      }
    });
  } catch (error) {
    console.error('Error getting client credits:', error);
    return NextResponse.json(
      { error: 'Failed to get client credits' },
      { status: 500 }
    );
  }
}

// POST /api/admin/credits/[clientId] - Add credits to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getAuthenticatedAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await request.json();
    const { amount, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updatedCredits = await CreditService.addCredits(
      clientId,
      amount,
      description,
      user.id
    );
    
    return NextResponse.json({
      success: true,
      data: updatedCredits,
      message: `Successfully added ${amount} credits to ${client.companyName}`
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json(
      { error: 'Failed to add credits' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/credits/[clientId] - Reset client credits
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getAuthenticatedAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await request.json();
    const { newBalance, description } = body;

    if (newBalance === undefined || newBalance < 0) {
      return NextResponse.json(
        { error: 'Invalid balance' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updatedCredits = await CreditService.resetCredits(
      clientId,
      newBalance,
      description,
      user.id
    );
    
    return NextResponse.json({
      success: true,
      data: updatedCredits,
      message: `Successfully reset credits for ${client.companyName} to ${newBalance}`
    });
  } catch (error) {
    console.error('Error resetting credits:', error);
    return NextResponse.json(
      { error: 'Failed to reset credits' },
      { status: 500 }
    );
  }
}
