import { prisma } from '@/lib/prisma';
import {
  MCP_AUTHORIZATION_CODE_TTL_SECONDS,
  MCP_DEFAULT_SCOPES,
  MCP_REFRESH_TOKEN_TTL_SECONDS,
  mcpIssuer,
  mcpResourceUrl,
} from './config';
import { newId, randomToken, sha256Hex, sha256S256, safeEqual } from './crypto';
import { McpAuthError } from './errors';
import { signMcpAccessToken } from './auth';
import {
  MCP_GRANTABLE_SCOPES,
  MCP_OPTIONAL_SCOPES,
  MCP_POLICY_VERSION,
  MCP_READ_SCOPES,
  intersectScopes,
  parseScopeString,
  scopesAllowedForUser,
  type McpScope,
} from './scopes';
import type { AuthenticatedUser } from '@/lib/auth-middleware';
import { logMcpEvent } from './audit';

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isAllowedRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === 'https:') return true;
  if (url.protocol === 'http:' && LOCALHOST_HOSTS.has(url.hostname)) return true;
  return false;
}

export function authorizationServerMetadata() {
  const issuer = mcpIssuer();
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...MCP_GRANTABLE_SCOPES],
    resource: mcpResourceUrl(),
  };
}

export function protectedResourceMetadata() {
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [mcpIssuer()],
    bearer_methods_supported: ['header'],
    scopes_supported: [...MCP_GRANTABLE_SCOPES],
  };
}

export async function registerOAuthClient(input: {
  name?: string;
  redirectUris: string[];
}) {
  const redirectUris = [...new Set(input.redirectUris.map((uri) => uri.trim()).filter(Boolean))];
  if (redirectUris.length === 0 || redirectUris.some((uri) => !isAllowedRedirectUri(uri))) {
    throw new McpAuthError('invalid_token', 'Invalid redirect_uris', 400);
  }
  const id = `mcp_app_${newId()}`;
  const client = await prisma.mcp_oauth_clients.create({
    data: {
      id,
      name: (input.name || 'MCP client').slice(0, 120),
      redirectUris,
      tokenEndpointAuthMethod: 'none',
    },
  });
  return {
    client_id: client.id,
    client_name: client.name,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };
}

export async function getOAuthClient(clientId: string) {
  return prisma.mcp_oauth_clients.findUnique({ where: { id: clientId } });
}

export async function createAuthorizationCode(input: {
  tenantId: string;
  userId: string;
  oauthClientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: McpScope[];
  resource: string;
}) {
  // Defaults are applied when parsing the request; an empty list here means nothing is permitted.
  const scopes = intersectScopes(input.scopes, MCP_GRANTABLE_SCOPES);
  if (scopes.length === 0) {
    throw new McpAuthError('insufficient_scope', 'No permitted scopes requested', 400);
  }

  const grant = await prisma.mcp_grants.create({
    data: {
      id: `mcp_grant_${newId()}`,
      tenantId: input.tenantId,
      userId: input.userId,
      oauthClientId: input.oauthClientId,
      scopes,
      policyVersion: MCP_POLICY_VERSION,
      updatedAt: new Date(),
    },
  });

  const code = randomToken();
  await prisma.mcp_authorization_codes.create({
    data: {
      id: `mcp_code_${newId()}`,
      grantId: grant.id,
      codeHash: sha256Hex(code),
      codeChallenge: input.codeChallenge,
      redirectUri: input.redirectUri,
      resource: input.resource,
      expiresAt: new Date(Date.now() + MCP_AUTHORIZATION_CODE_TTL_SECONDS * 1000),
    },
  });

  await logMcpEvent({
    eventType: 'MCP_GRANT_CREATED',
    tenantId: input.tenantId,
    userId: input.userId,
    grantId: grant.id,
    result: 'ok',
    details: { scopes },
  });

  return { code, grantId: grant.id, scopes };
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
  resource?: string;
}) {
  const codeHash = sha256Hex(input.code);
  const stored = await prisma.mcp_authorization_codes.findUnique({
    where: { codeHash },
    include: { grant: true },
  });
  if (!stored || stored.consumedAt || stored.expiresAt.getTime() <= Date.now()) {
    throw new McpAuthError('invalid_token', 'Invalid authorization code', 400);
  }
  if (stored.grant.oauthClientId !== input.clientId || stored.grant.revokedAt) {
    throw new McpAuthError('invalid_token', 'Invalid authorization code', 400);
  }
  if (stored.redirectUri !== input.redirectUri) {
    throw new McpAuthError('invalid_token', 'redirect_uri mismatch', 400);
  }
  if (input.resource && input.resource !== stored.resource) {
    throw new McpAuthError('invalid_token', 'resource mismatch', 400);
  }
  if (!safeEqual(sha256S256(input.codeVerifier), stored.codeChallenge)) {
    throw new McpAuthError('invalid_token', 'PKCE verification failed', 400);
  }

  await prisma.mcp_authorization_codes.update({
    where: { id: stored.id },
    data: { consumedAt: new Date() },
  });

  return issueTokens(stored.grant.id, stored.grant.userId, stored.grant.tenantId, stored.grant.oauthClientId, stored.grant.scopes as McpScope[], stored.resource);
}

export async function rotateRefreshToken(input: { refreshToken: string; clientId: string; resource?: string }) {
  const tokenHash = sha256Hex(input.refreshToken);
  const stored = await prisma.mcp_refresh_tokens.findUnique({
    where: { tokenHash },
    include: { grant: true },
  });
  if (!stored) {
    throw new McpAuthError('invalid_token', 'Invalid refresh token', 400);
  }
  if (stored.revokedAt || stored.grant.revokedAt || stored.grant.oauthClientId !== input.clientId) {
    await prisma.mcp_refresh_tokens.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.mcp_grants.update({
      where: { id: stored.grantId },
      data: { revokedAt: new Date(), updatedAt: new Date() },
    });
    throw new McpAuthError('invalid_token', 'Refresh token reuse detected', 400);
  }
  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new McpAuthError('invalid_token', 'Refresh token expired', 400);
  }

  const next = await issueTokens(
    stored.grant.id,
    stored.grant.userId,
    stored.grant.tenantId,
    stored.grant.oauthClientId,
    stored.grant.scopes as McpScope[],
    input.resource || mcpResourceUrl(),
    stored.familyId
  );

  await prisma.mcp_refresh_tokens.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedById: next.refreshTokenId },
  });

  return next;
}

async function issueTokens(
  grantId: string,
  userId: string,
  tenantId: string,
  oauthClientId: string,
  scopes: McpScope[],
  audience: string,
  familyId = `mcp_fam_${newId()}`
) {
  if (audience !== mcpResourceUrl()) {
    throw new McpAuthError('invalid_token', 'Invalid resource', 400);
  }
  const refresh = randomToken();
  const refreshRow = await prisma.mcp_refresh_tokens.create({
    data: {
      id: `mcp_rt_${newId()}`,
      grantId,
      tokenHash: sha256Hex(refresh),
      familyId,
      expiresAt: new Date(Date.now() + MCP_REFRESH_TOKEN_TTL_SECONDS * 1000),
    },
  });
  const accessToken = signMcpAccessToken({ userId, tenantId, grantId, oauthClientId, scopes });
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 15 * 60,
    refresh_token: refresh,
    scope: scopes.join(' '),
    refreshTokenId: refreshRow.id,
  };
}

export async function revokeGrant(grantId: string, userId: string, tenantId: string) {
  const grant = await prisma.mcp_grants.findFirst({
    where: { id: grantId, userId, tenantId },
  });
  if (!grant) return false;
  if (!grant.revokedAt) {
    await prisma.mcp_grants.update({
      where: { id: grantId },
      data: { revokedAt: new Date(), updatedAt: new Date() },
    });
    await prisma.mcp_refresh_tokens.updateMany({
      where: { grantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logMcpEvent({
      eventType: 'MCP_GRANT_REVOKED',
      tenantId,
      userId,
      grantId,
      result: 'ok',
    });
  }
  return true;
}

export async function listGrantsForUser(userId: string, tenantId: string) {
  return prisma.mcp_grants.findMany({
    where: { userId, tenantId },
    include: { oauthClient: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Requested scopes (or the defaults), limited to the basic read scopes and the user's role.
 * Optional scopes are never granted from the request alone; see approvedScopes.
 */
export function parseRequestedScopes(scope: string | null, user: Pick<AuthenticatedUser, 'role'>): McpScope[] {
  const parsed = parseScopeString(scope);
  return scopesAllowedForUser(intersectScopes(parsed.length ? parsed : MCP_DEFAULT_SCOPES, MCP_READ_SCOPES), user);
}

/** Optional scopes (customer PII, labels) this user could tick at consent. */
export function optionalScopesForUser(user: Pick<AuthenticatedUser, 'role'>): McpScope[] {
  return scopesAllowedForUser(MCP_OPTIONAL_SCOPES, user);
}

/** Basic requested scopes plus the optional scopes the user explicitly ticked. */
export function approvedScopes(
  scope: string | null,
  tickedOptional: readonly string[],
  user: Pick<AuthenticatedUser, 'role'>
): McpScope[] {
  const optional = optionalScopesForUser(user).filter((item) => tickedOptional.includes(item));
  return [...new Set([...parseRequestedScopes(scope, user), ...optional])];
}
