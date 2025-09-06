import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/webhook-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// GET /api/webhooks/[id] - Get specific webhook
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user!, client: authResult.user!.client };
    const { client } = auth;
    const { id } = params;

    console.log('🔗 [API_WEBHOOKS_GET_ID] Fetching webhook:', id, 'for client:', client.id);

    const webhook = await WebhookService.getWebhook(id, client.id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    console.log('✅ [API_WEBHOOKS_GET_ID] Webhook found:', webhook.id);

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        retryCount: webhook.retryCount,
        timeout: webhook.timeout,
        headers: webhook.headers
        // Don't expose secret in response
      }
    });

  } catch (error) {
    console.error('❌ [API_WEBHOOKS_GET_ID] Error fetching webhook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks/[id] - Update webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { id } = params;
    const updateData = await request.json();

    console.log('🔗 [API_WEBHOOKS_PUT] Updating webhook:', id, 'for client:', client.id);

    // Validate URL format if provided
    if (updateData.url) {
      try {
        new URL(updateData.url);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }

    // Validate events array if provided
    if (updateData.events) {
      if (!Array.isArray(updateData.events) || updateData.events.length === 0) {
        return NextResponse.json({ error: 'Events must be a non-empty array' }, { status: 400 });
      }
    }

    const webhook = await WebhookService.updateWebhook(id, client.id, updateData);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    console.log('✅ [API_WEBHOOKS_PUT] Webhook updated successfully:', webhook.id);

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        retryCount: webhook.retryCount,
        timeout: webhook.timeout,
        headers: webhook.headers
        // Don't expose secret in response
      }
    });

  } catch (error) {
    console.error('❌ [API_WEBHOOKS_PUT] Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      requiredPermissions: [PermissionLevel.DELETE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user!, client: authResult.user!.client };
    const { client } = auth;
    const { id } = params;

    console.log('🔗 [API_WEBHOOKS_DELETE] Deleting webhook:', id, 'for client:', client.id);

    const success = await WebhookService.deleteWebhook(id, client.id);

    if (!success) {
      return NextResponse.json({ error: 'Webhook not found or could not be deleted' }, { status: 404 });
    }

    console.log('✅ [API_WEBHOOKS_DELETE] Webhook deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully'
    });

  } catch (error) {
    console.error('❌ [API_WEBHOOKS_DELETE] Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
