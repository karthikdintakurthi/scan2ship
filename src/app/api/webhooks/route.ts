import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/webhook-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// GET /api/webhooks - List all webhooks for a client
export async function GET(request: NextRequest) {
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

    console.log('🔗 [API_WEBHOOKS_GET] Fetching webhooks for client:', client.id);

    const webhooks = await WebhookService.getActiveWebhooks(client.id);

    console.log(`✅ [API_WEBHOOKS_GET] Found ${webhooks.length} webhooks for client: ${client.id}`);

    return NextResponse.json({
      success: true,
      webhooks: webhooks.map(webhook => ({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        retryCount: webhook.retryCount,
        timeout: webhook.timeout,
        headers: webhook.headers
        // Don't expose secret in response
      }))
    });

  } catch (error) {
    console.error('❌ [API_WEBHOOKS_GET] Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
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
    const webhookData = await request.json();

    console.log('🔗 [API_WEBHOOKS_POST] Creating webhook for client:', client.id);

    // Validate required fields
    const requiredFields = ['name', 'url', 'events'];
    for (const field of requiredFields) {
      if (!webhookData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate URL format
    try {
      new URL(webhookData.url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Validate events array
    if (!Array.isArray(webhookData.events) || webhookData.events.length === 0) {
      return NextResponse.json({ error: 'Events must be a non-empty array' }, { status: 400 });
    }

    // Create webhook
    const webhook = await WebhookService.createWebhook({
      clientId: client.id,
      name: webhookData.name,
      url: webhookData.url,
      events: webhookData.events,
      secret: webhookData.secret || undefined,
      isActive: webhookData.isActive !== false, // Default to true
      retryCount: webhookData.retryCount || 3,
      timeout: webhookData.timeout || 30000,
      headers: webhookData.headers || undefined
    });

    console.log('✅ [API_WEBHOOKS_POST] Webhook created successfully:', webhook.id);

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
    console.error('❌ [API_WEBHOOKS_POST] Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
