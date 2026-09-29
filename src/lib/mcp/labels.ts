import jwt from 'jsonwebtoken';
import { isLabelFormat, type LabelFormat } from '@/lib/labels/render-waybill';
import { mcpIssuer, mcpJwtSecret, mcpPublicBaseUrl, mcpResourceUrl } from './config';
import { newId } from './crypto';
import { McpAuthError } from './errors';
import type { McpPrincipal } from './principal';

export const LABEL_LINK_TTL_SECONDS = 10 * 60;

type LabelClaims = {
  sub: string;
  tid: string;
  gid: string;
  scope: string;
  jti: string;
  oid: number;
  fmt: string;
};

/** Distinct audience so a label link can never be used as an MCP access token, or vice versa. */
function labelAudience(): string {
  return `${mcpResourceUrl()}/labels`;
}

/**
 * Short-lived link to one order's label. It carries the grant, not the order's
 * data; opening it re-checks the grant, user, role, and order access.
 */
export function createLabelLink(principal: McpPrincipal, orderId: number, format: LabelFormat) {
  const token = jwt.sign(
    { sub: principal.userId, tid: principal.tenantId, gid: principal.grantId, scope: 'labels:read', jti: newId(), oid: orderId, fmt: format },
    mcpJwtSecret(),
    { algorithm: 'HS256', issuer: mcpIssuer(), audience: labelAudience(), expiresIn: LABEL_LINK_TTL_SECONDS }
  );
  return {
    url: `${mcpPublicBaseUrl()}/api/mcp/labels/${token}`,
    expiresAt: new Date(Date.now() + LABEL_LINK_TTL_SECONDS * 1000).toISOString(),
  };
}

export function verifyLabelToken(token: string): LabelClaims & { format: LabelFormat } {
  let claims: LabelClaims;
  try {
    claims = jwt.verify(token, mcpJwtSecret(), {
      algorithms: ['HS256'],
      issuer: mcpIssuer(),
      audience: labelAudience(),
    }) as LabelClaims;
  } catch {
    throw new McpAuthError('invalid_token', 'Link expired or invalid', 401);
  }
  if (!Number.isSafeInteger(claims.oid) || claims.oid <= 0 || !isLabelFormat(claims.fmt)) {
    throw new McpAuthError('invalid_token', 'Link expired or invalid', 401);
  }
  return { ...claims, format: claims.fmt };
}
