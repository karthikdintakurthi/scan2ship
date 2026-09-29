import { findAccessibleOrder } from '@/lib/application/policy';
import { renderWaybill } from '@/lib/labels/render-waybill';
import { logMcpEvent } from '@/lib/mcp/audit';
import { principalFromClaims, requireScope } from '@/lib/mcp/auth';
import { McpAuthError } from '@/lib/mcp/errors';
import { assertAllowedHost } from '@/lib/mcp/http';
import { verifyLabelToken } from '@/lib/mcp/labels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
};

function plain(status: number, message: string): Response {
  return new Response(message, { status, headers: { ...PRIVATE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' } });
}

/**
 * GET /api/mcp/labels/<signed token>
 *
 * Opens a label link issued by the get_shipping_label tool. The link alone is
 * not enough: the grant, user, tenant allowlist, role, labels:read scope, and
 * order access are all re-checked, so revoking the connection kills its links.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const hostError = assertAllowedHost(request);
  if (hostError) return hostError;

  const { token } = await params;
  let claims;
  let principal;
  try {
    claims = verifyLabelToken(token);
    principal = await principalFromClaims(claims);
    requireScope(principal, 'labels:read');
  } catch (error) {
    if (error instanceof McpAuthError) {
      return plain(error.status === 503 ? 503 : 401, 'This label link has expired or is no longer valid. Ask your assistant for a new one.');
    }
    return plain(500, 'Could not open this label.');
  }

  const order = await findAccessibleOrder(principal.user, claims.oid, {
    include: { clients: { include: { client_order_configs: true } } },
  });
  if (!order) {
    return plain(404, 'Label not found.');
  }

  try {
    const { html, filename } = await renderWaybill(order, claims.format);
    await logMcpEvent({
      eventType: 'MCP_LABEL_OPENED',
      tenantId: principal.tenantId,
      userId: principal.userId,
      grantId: principal.grantId,
      tool: 'get_shipping_label',
      targetIds: [order.id],
      result: 'ok',
      requestId: claims.jti,
    });
    return new Response(html, {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch {
    return plain(500, 'Could not render this label.');
  }
}
