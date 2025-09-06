import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { CreditService } from '@/lib/credit-service';

// Helper function to get authenticated user and client
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }

    return {
      user: user,
      client: user.clients
    };
  } catch (error) {
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
