import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { consumeFixedWindow } from '@/lib/persistent-rate-limiter';
import {
  MCP_ACCESS_TOKEN_TTL_SECONDS,
  MCP_QUOTA,
  isMcpEnabled,
  isTenantAllowedForMcp,
  mcpIssuer,
  mcpJwtSecret,
  mcpResourceUrl,
} from './config';
import { sha256Hex } from './crypto';
import { McpAuthError } from './errors';
import { userFromGrant, type McpPrincipal } from './principal';
import { hasScope, isMcpScope, parseScopeString, scopesAllowedForUser, type McpScope } from './scopes';

type AccessClaims = {
  sub: string;
  tid: string;
  gid: string;
  cid: string;
  scope: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
};

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export function signMcpAccessToken(input: {
  userId: string;
  tenantId: string;
  grantId: string;
  oauthClientId: string;
  scopes: readonly McpScope[];
}): string {
  return jwt.sign(
    {
      sub: input.userId,
      tid: input.tenantId,
      gid: input.grantId,
      cid: input.oauthClientId,
      scope: input.scopes.join(' '),
      jti: sha256Hex(`${input.grantId}:${Date.now()}:${Math.random()}`).slice(0, 32),
    },
    mcpJwtSecret(),
    {
      algorithm: 'HS256',
      issuer: mcpIssuer(),
      audience: mcpResourceUrl(),
      expiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS,
    }
  );
}

export async function authenticateMcpRequest(request: Request): Promise<McpPrincipal> {
  if (!isMcpEnabled()) {
    throw new McpAuthError('disabled', 'MCP is disabled', 503);
  }

  const token = bearerToken(request);
  if (!token) {
    throw new McpAuthError('invalid_token', 'Missing bearer token');
  }

  let claims: AccessClaims;
  try {
    claims = jwt.verify(token, mcpJwtSecret(), {
      algorithms: ['HS256'],
      issuer: mcpIssuer(),
      audience: mcpResourceUrl(),
    }) as AccessClaims;
  } catch {
    throw new McpAuthError('invalid_token', 'Invalid or expired token');
  }

  if (!claims.sub || !claims.tid || !claims.gid) {
    throw new McpAuthError('invalid_token', 'Invalid token claims');
  }
  if (!isTenantAllowedForMcp(claims.tid)) {
    throw new McpAuthError('tenant_not_allowed', 'Tenant is not enabled for MCP', 403);
  }

  const grant = await prisma.mcp_grants.findUnique({
    where: { id: claims.gid },
    include: {
      users: { include: { clients: true } },
    },
  });

  if (
    !grant ||
    grant.revokedAt ||
    grant.userId !== claims.sub ||
    grant.tenantId !== claims.tid ||
    !grant.users.isActive ||
    !grant.users.clients.isActive ||
    grant.users.clientId !== grant.tenantId
  ) {
    throw new McpAuthError('invalid_token', 'Grant is not active');
  }

  const user = userFromGrant(grant.users);
  if (!user) {
    throw new McpAuthError('invalid_token', 'Grant is not active');
  }

  // Re-apply the role ceiling on every call so a demoted user loses scopes immediately.
  const scopes = scopesAllowedForUser(
    parseScopeString(claims.scope).filter((scope) => grant.scopes.includes(scope)),
    user
  );
  return {
    requestId: claims.jti,
    tenantId: grant.tenantId,
    userId: grant.userId,
    grantId: grant.id,
    oauthClientId: grant.oauthClientId,
    scopes,
    role: user.role,
    user,
  };
}

export function requireScope(principal: McpPrincipal, scope: McpScope) {
  if (!hasScope(principal.scopes, scope) || !isMcpScope(scope)) {
    throw new McpAuthError('insufficient_scope', `Missing scope ${scope}`, 403);
  }
}

export async function consumeMcpQuota(principal: McpPrincipal, tool: string) {
  const [toolLimit, grantLimit] = await Promise.all([
    consumeFixedWindow(`mcp:tool:${principal.grantId}:${tool}`, MCP_QUOTA.toolWindowMs, MCP_QUOTA.toolMax),
    consumeFixedWindow(`mcp:grant:${principal.grantId}`, MCP_QUOTA.grantWindowMs, MCP_QUOTA.grantMax),
  ]);
  if (!toolLimit.allowed || !grantLimit.allowed) {
    throw new McpAuthError('disabled', 'Rate limit exceeded', 429);
  }
}

export async function touchGrant(grantId: string) {
  try {
    await prisma.mcp_grants.update({
      where: { id: grantId },
      data: { lastUsedAt: new Date(), updatedAt: new Date() },
    });
  } catch {
    // Usage stamp is best-effort.
  }
}
