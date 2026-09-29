import { NextRequest, NextResponse } from 'next/server';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeSuperAdmin } from '@/lib/auth-middleware';
import { RechargeRequestError, reviewRechargeRequest } from '@/lib/application/credit-recharge';

// POST /api/admin/credits/recharge-requests/[id] - { action: 'approve' | 'reject', note? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { action, note } = (await request.json()) ?? {};

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const result = await reviewRechargeRequest(authResult.user!, id, action, note);

    return NextResponse.json({
      success: true,
      request: result.request,
      newBalance: result.credits?.balance ?? null
    });
  } catch (error) {
    if (error instanceof RechargeRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('❌ [API_ADMIN_RECHARGE_REVIEW] Error:', error);
    return NextResponse.json({ error: 'Failed to review recharge request' }, { status: 500 });
  }
}
