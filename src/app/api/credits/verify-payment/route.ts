import { NextRequest, NextResponse } from 'next/server';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { RechargeRequestError, submitRechargeRequest, type RechargeSubmission } from '@/lib/application/credit-recharge';

/**
 * Records a UPI payment for review. Credits are added only when a platform
 * admin approves the request in the admin credits page.
 */
export async function POST(request: NextRequest) {
  try {
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );

    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Child users cannot access the wallet
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }
    const user = authResult.user!;

    let submission: RechargeSubmission;
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const paymentDetails = formData.get('paymentDetails');
      submission = {
        transactionRef: formData.get('transactionRef'),
        amount: formData.get('amount'),
        utrNumber: formData.get('utrNumber'),
        paymentDetails: typeof paymentDetails === 'string' ? JSON.parse(paymentDetails) : undefined
      };
    } else {
      submission = (await request.json()) ?? {};
    }

    const recharge = await submitRechargeRequest(user, submission);

    console.log('💰 [API_CREDITS_VERIFY_PAYMENT] Recharge request submitted for review:', {
      requestId: recharge.id,
      clientId: recharge.clientId,
      amount: recharge.amount
    });

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Payment submitted. Credits will be added after an administrator verifies it.',
      requestId: recharge.id,
      amount: recharge.amount,
      transactionRef: recharge.transactionRef
    }, { status: 202 });

  } catch (error) {
    if (error instanceof RechargeRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('❌ [API_CREDITS_VERIFY_PAYMENT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit payment' },
      { status: 500 }
    );
  }
}
