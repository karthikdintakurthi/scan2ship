import { NextRequest } from 'next/server';
import { registerOAuthClient } from '@/lib/mcp/oauth';
import { isMcpEnabled } from '@/lib/mcp/config';
import { mcpCorsHeaders, withMcpCors } from '@/lib/mcp/http';
import { McpAuthError } from '@/lib/mcp/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: mcpCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  if (!isMcpEnabled()) {
    return withMcpCors(request, Response.json({ error: 'temporarily_unavailable' }, { status: 503 }));
  }

  let body: { client_name?: string; redirect_uris?: unknown };
  try {
    body = await request.json();
  } catch {
    return withMcpCors(request, Response.json({ error: 'invalid_client_metadata' }, { status: 400 }));
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((value): value is string => typeof value === 'string')
    : [];

  try {
    const created = await registerOAuthClient({ name: body.client_name, redirectUris });
    return withMcpCors(request, Response.json(created, { status: 201 }));
  } catch (error) {
    const status = error instanceof McpAuthError ? error.status : 400;
    return withMcpCors(request, Response.json({ error: 'invalid_client_metadata' }, { status }));
  }
}
