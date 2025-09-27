import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// Authentication handled by centralized middleware

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user!, client: authResult.user!.client };

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
