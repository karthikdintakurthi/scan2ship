import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/lib/credit-service';
import { getAuthenticatedUser } from '@/lib/auth-utils';

// GET /api/credits - Get client credits
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const credits = await CreditService.getClientCredits(auth.client.id);
    
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
