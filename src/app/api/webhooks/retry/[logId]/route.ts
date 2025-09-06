import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/webhook-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// POST /api/webhooks/retry/[logId] - Retry failed webhook
export async function POST(
  request: NextRequest,
  { params }: { params: { logId: string } }
) {
  try {
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
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
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user!, client: authResult.user!.client };
    const { client } = auth;
    const { logId } = params;

    console.log('🔗 [API_WEBHOOKS_RETRY] Retrying webhook log:', logId, 'for client:', client.id);

    const success = await WebhookService.retryWebhook(logId, client.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to retry webhook or webhook log not found' }, { status: 404 });
    }

    console.log('✅ [API_WEBHOOKS_RETRY] Webhook retry initiated successfully:', logId);

    return NextResponse.json({
      success: true,
      message: 'Webhook retry initiated successfully'
    });

  } catch (error) {
    console.error('❌ [API_WEBHOOKS_RETRY] Error retrying webhook:', error);
    return NextResponse.json(
      { error: 'Failed to retry webhook' },
      { status: 500 }
    );
  }
}
