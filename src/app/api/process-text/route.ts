import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { CreditService } from '@/lib/credit-service';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('🔐 [AUTH] No authorization header or invalid format');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('🔐 [AUTH] Token extracted, length:', token.length);

  try {
    const decoded = jwt.verify(token, enhancedJwtConfig.getSecret()) as any;
    console.log('🔐 [AUTH] JWT decoded successfully, userId:', decoded.userId);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    console.log('🔐 [AUTH] User lookup result:', user ? 'Found' : 'Not found');
    if (user) {
      console.log('🔐 [AUTH] User active:', user.isActive, 'Client active:', user.clients?.isActive);
    }

    if (!user || !user.isActive || !user.clients.isActive) {
      console.log('🔐 [AUTH] User validation failed:', { 
        userExists: !!user, 
        userActive: user?.isActive, 
        clientActive: user?.clients?.isActive 
      });
      return null;
    }

    console.log('🔐 [AUTH] Authentication successful for user:', user.email, 'Client:', user.clients.companyName);
    return {
      user: user,
      client: user.clients
    };
  } catch (error) {
    console.log('🔐 [AUTH] JWT verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client, user } = auth;
    const body = await request.json();
    const { text, prompt } = body;

    console.log('📝 [API_PROCESS_TEXT] Processing text for client:', client.companyName);

    // Check if client has sufficient credits for text processing
    const textProcessingCreditCost = CreditService.getCreditCost('TEXT_PROCESSING');
    const hasSufficientCredits = await CreditService.hasSufficientCredits(client.id, textProcessingCreditCost);
    
    if (!hasSufficientCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        details: `Text processing requires ${textProcessingCreditCost} credits. Please contact your administrator to add more credits.`
      }, { status: 402 });
    }

    // Validate required fields
    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    // Simulate OpenAI API call for text processing
    // In a real implementation, you would call OpenAI's API here
    console.log('🤖 [API_PROCESS_TEXT] Calling OpenAI API for text processing...');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate successful OpenAI response
    const processedResult = {
      success: true,
      extractedData: {
        customerName: 'Jane Smith',
        address: '456 Oak Avenue, Town, State 67890',
        phone: '+91-8765432109',
        packageValue: 2500,
        weight: 1.8,
        items: 2
      },
      confidence: 0.92,
      suggestions: [
        'Consider adding insurance for high-value items',
        'Package appears to be fragile, use appropriate packaging'
      ]
    };

    // Deduct credits for successful text processing
    try {
      await CreditService.deductTextProcessingCredits(client.id, user.id);
      console.log('💳 [API_PROCESS_TEXT] Credits deducted for text processing:', textProcessingCreditCost);
    } catch (creditError) {
      console.error('❌ [API_PROCESS_TEXT] Failed to deduct credits:', creditError);
      return NextResponse.json(
        { error: 'Failed to process credits' },
        { status: 500 }
      );
    }

    console.log('✅ [API_PROCESS_TEXT] Text processing completed successfully');

    return NextResponse.json({
      success: true,
      data: processedResult,
      message: 'Text processed successfully'
    });

  } catch (error) {
    console.error('❌ [API_PROCESS_TEXT] Error processing text:', error);
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    );
  }
}
