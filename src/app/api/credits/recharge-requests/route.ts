import { NextRequest, NextResponse } from 'next/server';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { listRechargeRequests } from '@/lib/application/credit-recharge';

// GET /api/credits/recharge-requests - The caller's tenant's submitted payments and their review status
export async function GET(request: NextRequest) {
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

    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const requests = await listRechargeRequests({ clientId: authResult.user!.clientId });

    return NextResponse.json({
      success: true,
      data: requests.map((recharge) => ({
        id: recharge.id,
        amount: recharge.amount,
        transactionRef: recharge.transactionRef,
        utrNumber: recharge.utrNumber,
        status: recharge.status,
        reviewNote: recharge.reviewNote,
        createdAt: recharge.createdAt,
        reviewedAt: recharge.reviewedAt
      }))
    });
  } catch (error) {
    console.error('❌ [API_CREDITS_RECHARGE_REQUESTS] Error:', error);
    return NextResponse.json({ error: 'Failed to load recharge requests' }, { status: 500 });
  }
}
