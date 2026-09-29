import { NextRequest, NextResponse } from 'next/server';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeSuperAdmin } from '@/lib/auth-middleware';
import { listRechargeRequests, RECHARGE_STATUSES, type RechargeStatus } from '@/lib/application/credit-recharge';

// GET /api/admin/credits/recharge-requests?status=pending - Recharge requests across tenants for review
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

    const authResult = await authorizeSuperAdmin(request);
    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const status = new URL(request.url).searchParams.get('status') ?? undefined;
    if (status && !(RECHARGE_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: `status must be one of ${RECHARGE_STATUSES.join(', ')}` }, { status: 400 });
    }

    const requests = await listRechargeRequests({ status: status as RechargeStatus | undefined });
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('❌ [API_ADMIN_RECHARGE_REQUESTS] Error:', error);
    return NextResponse.json({ error: 'Failed to load recharge requests' }, { status: 500 });
  }
}
