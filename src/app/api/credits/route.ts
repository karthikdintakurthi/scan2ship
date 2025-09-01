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
    // Use enhanced JWT configuration for verification
    const decoded = enhancedJwtConfig.verifyToken(token);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { clients: true }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

// GET /api/credits - Get client credits
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credits = await CreditService.getClientCredits(user.clientId);
    
    return NextResponse.json({
      success: true,
      data: credits
    });
  } catch (error) {
    console.error('Error getting credits:', error);
    return NextResponse.json(
      { error: 'Failed to get credits' },
      { status: 500 }
    );
  }
}
