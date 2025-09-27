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
    const { imageData, prompt } = body;

    console.log('🖼️ [API_PROCESS_IMAGE] Processing image for client:', client.companyName);

    // Check if client has sufficient credits for image processing
    const imageProcessingCreditCost = CreditService.getCreditCost('IMAGE_PROCESSING');
    const hasSufficientCredits = await CreditService.hasSufficientCredits(client.id, imageProcessingCreditCost);
    
    if (!hasSufficientCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        details: `Image processing requires ${imageProcessingCreditCost} credits. Please contact your administrator to add more credits.`
      }, { status: 402 });
    }

    // Validate required fields
    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // Simulate OpenAI API call for image processing
    // In a real implementation, you would call OpenAI's API here
    console.log('🤖 [API_PROCESS_IMAGE] Calling OpenAI API for image processing...');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate successful OpenAI response
    const processedResult = {
      success: true,
      extractedData: {
        customerName: 'John Doe',
        address: '123 Main Street, City, State 12345',
        phone: '+91-9876543210',
        packageValue: 1500,
        weight: 2.5,
        items: 3
      },
      confidence: 0.95
    };

    // Deduct credits for successful image processing
    try {
      await CreditService.deductImageProcessingCredits(client.id, user.id);
      console.log('💳 [API_PROCESS_IMAGE] Credits deducted for image processing:', imageProcessingCreditCost);
    } catch (creditError) {
      console.error('❌ [API_PROCESS_IMAGE] Failed to deduct credits:', creditError);
      return NextResponse.json(
        { error: 'Failed to process credits' },
        { status: 500 }
      );
    }

    console.log('✅ [API_PROCESS_IMAGE] Image processing completed successfully');

    return NextResponse.json({
      success: true,
      data: processedResult,
      message: 'Image processed successfully'
    });

  } catch (error) {
    console.error('❌ [API_PROCESS_IMAGE] Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
