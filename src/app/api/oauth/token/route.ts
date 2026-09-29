import { NextRequest } from 'next/server';
import { exchangeAuthorizationCode, rotateRefreshToken } from '@/lib/mcp/oauth';
import { isMcpEnabled } from '@/lib/mcp/config';
import { mcpCorsHeaders, withMcpCors } from '@/lib/mcp/http';
import { McpAuthError } from '@/lib/mcp/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: mcpCorsHeaders(request) });
}

async function readTokenBody(request: NextRequest): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await request.json();
    return Object.fromEntries(Object.entries(json).map(([key, value]) => [key, String(value ?? '')]));
  }
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
}

export async function POST(request: NextRequest) {
  if (!isMcpEnabled()) {
    return withMcpCors(request, Response.json({ error: 'temporarily_unavailable' }, { status: 503 }));
  }

  let body: Record<string, string>;
  try {
    body = await readTokenBody(request);
  } catch {
    return withMcpCors(request, Response.json({ error: 'invalid_request' }, { status: 400 }));
  }

  try {
    if (body.grant_type === 'authorization_code') {
      const tokens = await exchangeAuthorizationCode({
        code: body.code,
        redirectUri: body.redirect_uri,
        clientId: body.client_id,
        codeVerifier: body.code_verifier,
        resource: body.resource || undefined,
      });
      const { refreshTokenId: _ignored, ...payload } = tokens;
      return withMcpCors(request, Response.json(payload));
    }

    if (body.grant_type === 'refresh_token') {
      const tokens = await rotateRefreshToken({
        refreshToken: body.refresh_token,
        clientId: body.client_id,
        resource: body.resource || undefined,
      });
      const { refreshTokenId: _ignored, ...payload } = tokens;
      return withMcpCors(request, Response.json(payload));
    }

    return withMcpCors(request, Response.json({ error: 'unsupported_grant_type' }, { status: 400 }));
  } catch (error) {
    const status = error instanceof McpAuthError ? error.status : 400;
    const code = error instanceof McpAuthError ? 'invalid_grant' : 'invalid_request';
    return withMcpCors(request, Response.json({ error: code }, { status }));
  }
}
