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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
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
