import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeUser, PermissionLevel, UserRole } from '@/lib/auth-middleware';
import { isMcpEnabled, isTenantAllowedForMcp, mcpResourceUrl } from '@/lib/mcp/config';
import {
  approvedScopes,
  createAuthorizationCode,
  getOAuthClient,
  isAllowedRedirectUri,
  optionalScopesForUser,
  parseRequestedScopes,
} from '@/lib/mcp/oauth';
import { SCOPE_DESCRIPTIONS } from '@/lib/mcp/scopes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireUser(request: NextRequest) {
  return authorizeUser(request, {
    requiredRole: UserRole.CHILD_USER,
    requiredPermissions: [PermissionLevel.READ],
    requireActiveUser: true,
    requireActiveClient: true,
  });
}

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;
  const user = authResult.user!;

  const params = request.nextUrl.searchParams;
  const clientId = params.get('client_id') || '';
  const redirectUri = params.get('redirect_uri') || '';
  const client = await getOAuthClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return NextResponse.json({ error: 'Unknown client or redirect_uri' }, { status: 400 });
  }

  const tenant = await prisma.clients.findUnique({
    where: { id: user.clientId },
    select: { companyName: true, name: true },
  });
  const scopes = parseRequestedScopes(params.get('scope'), user);
  return NextResponse.json({
    clientName: client.name,
    tenantName: tenant?.companyName || tenant?.name || user.clientId,
    tenantId: user.clientId,
    enabled: isMcpEnabled() && isTenantAllowedForMcp(user.clientId),
    scopes: scopes.map((scope) => ({ id: scope, description: SCOPE_DESCRIPTIONS[scope] })),
    optionalScopes: optionalScopesForUser(user).map((scope) => ({ id: scope, description: SCOPE_DESCRIPTIONS[scope] })),
  });
}

export async function POST(request: NextRequest) {
  const authResult = await authorizeUser(request, {
    requiredRole: UserRole.CHILD_USER,
    requiredPermissions: [PermissionLevel.READ],
    requireActiveUser: true,
    requireActiveClient: true,
  });
  if (authResult.response) return authResult.response;
  const user = authResult.user!;

  if (!isMcpEnabled() || !isTenantAllowedForMcp(user.clientId)) {
    return NextResponse.json({ error: 'MCP is not enabled for this account' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const clientId = String(body.client_id || '');
  const redirectUri = String(body.redirect_uri || '');
  const codeChallenge = String(body.code_challenge || '');
  const codeChallengeMethod = String(body.code_challenge_method || '');
  const state = typeof body.state === 'string' ? body.state : '';
  const resource = String(body.resource || mcpResourceUrl());

  if (codeChallengeMethod !== 'S256' || codeChallenge.length < 16) {
    return NextResponse.json({ error: 'PKCE S256 is required' }, { status: 400 });
  }
  if (!isAllowedRedirectUri(redirectUri)) {
    return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 });
  }
  if (resource !== mcpResourceUrl()) {
    return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
  }

  const client = await getOAuthClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return NextResponse.json({ error: 'Unknown client or redirect_uri' }, { status: 400 });
  }

  const { code, scopes } = await createAuthorizationCode({
    tenantId: user.clientId,
    userId: user.id,
    oauthClientId: client.id,
    redirectUri,
    codeChallenge,
    scopes: approvedScopes(
      typeof body.scope === 'string' ? body.scope : null,
      Array.isArray(body.optional_scopes) ? body.optional_scopes.filter((item: unknown) => typeof item === 'string') : [],
      user
    ),
    resource,
  });

  const redirect = new URL(redirectUri);
  redirect.searchParams.set('code', code);
  if (state) redirect.searchParams.set('state', state);

  return NextResponse.json({ redirectTo: redirect.toString(), scopes });
}
