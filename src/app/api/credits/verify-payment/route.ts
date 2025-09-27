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
    
    // Handle both JSON and FormData
    let transactionRef, amount, paymentDetails, utrNumber, extractedAmount;
    
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle FormData (for backward compatibility)
      const formData = await request.formData();
      transactionRef = formData.get('transactionRef') as string;
      amount = parseInt(formData.get('amount') as string);
      utrNumber = formData.get('utrNumber') as string;
      paymentDetails = JSON.parse(formData.get('paymentDetails') as string);
      extractedAmount = formData.get('extractedAmount') ? parseInt(formData.get('extractedAmount') as string) : null;
    } else {
      // Handle JSON
      const body = await request.json();
      transactionRef = body.transactionRef;
      amount = body.amount;
      utrNumber = body.utrNumber;
      paymentDetails = body.paymentDetails;
      extractedAmount = body.extractedAmount || null;
    }

    if (!transactionRef || !amount) {
      return NextResponse.json({ error: 'Transaction reference and amount are required' }, { status: 400 });
    }

    // Validate extracted amount if provided
    if (extractedAmount !== null && extractedAmount !== amount) {
      console.log('⚠️ [API_CREDITS_VERIFY_PAYMENT] Amount mismatch detected:', {
        expectedAmount: amount,
        extractedAmount: extractedAmount,
        clientId: client.id,
        clientName: client.companyName
      });
      return NextResponse.json({ 
        error: `Amount mismatch! Expected: ₹${amount.toLocaleString()}, Found: ₹${extractedAmount.toLocaleString()}. Please verify the payment screenshot.` 
      }, { status: 400 });
    }

    console.log('💰 [API_CREDITS_VERIFY_PAYMENT] Verifying payment:', {
      clientId: client.id,
      transactionRef,
      amount,
      userId: user.id,
      userEmail: user.email,
      clientName: client.companyName
    });

    // Check if payment was already processed
    const existingTransaction = await prisma.credit_transactions.findFirst({
      where: {
        clientId: client.id,
        description: {
          contains: transactionRef
        }
      }
    });

    if (existingTransaction) {
      return NextResponse.json({ 
        error: 'Payment already processed',
        success: true 
      }, { status: 409 });
    }

    // Add credits to client account
    const creditAmount = amount; // 1 credit = 1 rupee
    
    // Create enhanced description with UTR number
    let description = `Credit recharge via UPI - ${transactionRef}`;
    if (utrNumber && utrNumber.trim()) {
      description += ` | UTR: ${utrNumber.trim()}`;
    }
    description += ` | Client: ${client.companyName}`;
    
    const result = await CreditService.addCredits(
      client.id,
      creditAmount,
      description,
      undefined, // userId - don't pass for now to avoid foreign key constraint issues
      client.companyName // clientName
    );

    // CreditService.addCredits returns a ClientCredits object, not a success/error object
    // If we reach here, the transaction was successful



    console.log('✅ [API_CREDITS_VERIFY_PAYMENT] Payment verified and credits added:', {
      clientId: client.id,
      clientName: client.companyName,
      transactionRef,
      amount: creditAmount,
      newBalance: result.balance,
      utrNumber: utrNumber || 'Not provided'
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and credits added successfully',
      transactionRef,
      amount: creditAmount,
      newBalance: result.balance,
      clientDetails: {
        clientId: client.id,
        clientName: client.companyName
      },
      confirmationReceived: {
        utrNumber: utrNumber || null
      }
    });

  } catch (error) {
    console.error('❌ [API_CREDITS_VERIFY_PAYMENT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
