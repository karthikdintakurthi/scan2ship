import { NextRequest, NextResponse } from 'next/server'
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { findAccessibleOrder, parseOrderId } from '@/lib/application/policy';
import { renderWaybill, type LabelFormat } from '@/lib/labels/render-waybill'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
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
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user!, client: authResult.user!.client };

    const { id } = await params
    const orderId = parseOrderId(id)
    if (orderId === null) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Check for print format query parameters
    const url = new URL(request.url)
    const isThermal = url.searchParams.get('thermal') === 'true'
    const isA5 = url.searchParams.get('a5') === 'true'
    const isR4 = url.searchParams.get('r4') === 'true'
    
    // Get order details with client information and logo config. Applies tenant and
    // child-user sub-group rules; missing and inaccessible orders both return 404.
    const order = await findAccessibleOrder(auth.user, orderId, {
      include: {
        clients: {
          include: {
            client_order_configs: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const format: LabelFormat = isThermal ? 'thermal' : isA5 ? 'a5' : isR4 ? 'r4' : 'standard'
    const { html: htmlContent, filename } = await renderWaybill(order, format)

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error in universal waybill generation:', error)
    return NextResponse.json({ 
      error: 'Failed to generate waybill',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
