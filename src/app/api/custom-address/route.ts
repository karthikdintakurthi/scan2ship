import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

/** GET - Fetch current user's custom from address config */
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
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    const customFrom = await prisma.user_custom_from_address.findUnique({
      where: { userId: user.id }
    });

    const data = customFrom
      ? {
          overwriteFromAddress: customFrom.overwriteFromAddress,
          courierServiceCode: customFrom.courierServiceCode ?? '',
          customAddress: customFrom.customAddress ?? ''
        }
      : {
          overwriteFromAddress: false,
          courierServiceCode: '',
          customAddress: ''
        };

    const response = NextResponse.json({ success: true, data });
    securityHeaders(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isDev = process.env.NODE_ENV !== 'production';
    console.error('❌ [API_CUSTOM_ADDRESS_GET] Error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch custom address', ...(isDev && { detail: message }) },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

/** PUT - Save current user's custom from address config */
export async function PUT(request: NextRequest) {
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
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const body = await request.json();
    const overwriteFromAddress = Boolean(body.overwriteFromAddress);
    const courierServiceCode =
      typeof body.courierServiceCode === 'string' ? body.courierServiceCode.trim() || null : null;
    const customAddress =
      typeof body.customAddress === 'string' ? body.customAddress.trim() || null : null;

    await prisma.user_custom_from_address.upsert({
      where: { userId: user.id },
      create: {
        id: `cfa_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        userId: user.id,
        overwriteFromAddress,
        courierServiceCode,
        customAddress,
        updatedAt: new Date()
      },
      update: {
        overwriteFromAddress,
        courierServiceCode,
        customAddress,
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Custom address saved successfully'
    });
    securityHeaders(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isDev = process.env.NODE_ENV !== 'production';
    console.error('❌ [API_CUSTOM_ADDRESS_PUT] Error:', error);
    const response = NextResponse.json(
      { error: 'Failed to save custom address', ...(isDev && { detail: message }) },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
