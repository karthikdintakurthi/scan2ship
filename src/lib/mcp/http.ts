import { mcpAllowedHosts, mcpResourceUrl } from './config';

export function mcpCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id',
    'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Session-Id',
    'Access-Control-Max-Age': '86400',
    ...(origin ? { Vary: 'Origin' } : {}),
  };
}

export function withMcpCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(mcpCorsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function mcpUnauthorized(request: Request, status: number, error: string, description: string): Response {
  const metadata = `${new URL(mcpResourceUrl()).origin}/.well-known/oauth-protected-resource/api/mcp`;
  return withMcpCors(
    request,
    new Response(JSON.stringify({ error, error_description: description }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="Scan2Ship MCP", resource_metadata="${metadata}", error="${error}"`,
      },
    })
  );
}

export function assertAllowedHost(request: Request): Response | null {
  const allowed = mcpAllowedHosts();
  if (allowed.length === 0) return null;
  const forwarded = request.headers.get('x-forwarded-host');
  const host = (forwarded || request.headers.get('host') || '').split(',')[0].trim().toLowerCase();
  const allowedLower = allowed.map((value) => value.toLowerCase());
  if (!host || !allowedLower.includes(host)) {
    return new Response(JSON.stringify({ error: 'invalid_host' }), {
      status: 421,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
