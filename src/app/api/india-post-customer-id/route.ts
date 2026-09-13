import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import {
  INDIA_POST_CUSTOMER_ID_KEY,
  normalizeIndiaPostCustomerId,
  validateIndiaPostCustomerId,
} from '@/lib/india-post-customer-id';

async function withAuth(
  request: NextRequest,
  requiredPermissions: PermissionLevel[]
) {
  const securityResponse = await applySecurityMiddleware(
    request,
    new NextResponse(),
    { rateLimit: 'api', cors: true, securityHeaders: true }
  );
  if (securityResponse) {
    securityHeaders(securityResponse);
    return { response: securityResponse };
  }

  const authResult = await authorizeUser(request, {
    requiredRole: UserRole.CHILD_USER,
    requiredPermissions,
    requireActiveUser: true,
    requireActiveClient: true,
  });

  if (authResult.response) {
    securityHeaders(authResult.response);
    return { response: authResult.response };
  }

  return { user: authResult.user! };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request, [PermissionLevel.READ]);
    if (auth.response) return auth.response;

    const clientId = auth.user!.client.id;
    const row = await prisma.client_config.findUnique({
      where: {
        clientId_key: {
          clientId,
          key: INDIA_POST_CUSTOMER_ID_KEY,
        },
      },
      select: { value: true },
    });

    const response = NextResponse.json({
      success: true,
      customerId: row?.value ?? '',
    });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('❌ [INDIA_POST_CUSTOMER_ID_GET]', error);
    const response = NextResponse.json(
      { error: 'Failed to load India Post Customer ID' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await withAuth(request, [PermissionLevel.WRITE]);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => null);
    const customerId = normalizeIndiaPostCustomerId(body?.customerId);
    const validationError = validateIndiaPostCustomerId(customerId);
    if (validationError) {
      const response = NextResponse.json({ error: validationError }, { status: 400 });
      securityHeaders(response);
      return response;
    }

    const clientId = auth.user!.client.id;
    await prisma.client_config.upsert({
      where: {
        clientId_key: {
          clientId,
          key: INDIA_POST_CUSTOMER_ID_KEY,
        },
      },
      update: {
        value: customerId,
        updatedAt: new Date(),
      },
      create: {
        id: `india-post-cid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        clientId,
        key: INDIA_POST_CUSTOMER_ID_KEY,
        value: customerId,
        type: 'string',
        category: 'india_post',
        description: 'India Post Customer ID printed on waybills',
        isEncrypted: false,
        updatedAt: new Date(),
      },
    });

    const response = NextResponse.json({
      success: true,
      customerId,
      message: 'India Post Customer ID saved',
    });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('❌ [INDIA_POST_CUSTOMER_ID_PUT]', error);
    const response = NextResponse.json(
      { error: 'Failed to save India Post Customer ID' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
