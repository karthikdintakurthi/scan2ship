import { authorizationServerMetadata } from '@/lib/mcp/oauth';
import { assertAllowedHost, mcpCorsHeaders, withMcpCors } from '@/lib/mcp/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: mcpCorsHeaders(request) });
}

export async function GET(request: Request) {
  const hostError = assertAllowedHost(request);
  if (hostError) return withMcpCors(request, hostError);
  return withMcpCors(
    request,
    new Response(JSON.stringify(authorizationServerMetadata()), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  );
}
