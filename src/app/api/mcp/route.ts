import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateMcpRequest } from '@/lib/mcp/auth';
import { McpAuthError } from '@/lib/mcp/errors';
import { assertAllowedHost, mcpCorsHeaders, mcpUnauthorized, withMcpCors } from '@/lib/mcp/http';
import { createMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: mcpCorsHeaders(request) });
  }

  const hostError = assertAllowedHost(request);
  if (hostError) return withMcpCors(request, hostError);

  let principal;
  try {
    principal = await authenticateMcpRequest(request);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return mcpUnauthorized(request, error.status, error.code, error.message);
    }
    return mcpUnauthorized(request, 401, 'invalid_token', 'Authentication failed');
  }

  const server = createMcpServer(principal);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return withMcpCors(request, await transport.handleRequest(request));
  } finally {
    await server.close().catch(() => undefined);
  }
}

export { handle as GET, handle as POST, handle as DELETE, handle as OPTIONS };
