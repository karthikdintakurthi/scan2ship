import type { AuthenticatedUser } from '@/lib/auth-middleware';
import { can, type Action } from '@/lib/application/permissions';

export const MCP_SCOPES = [
  'orders:read',
  'tracking:read',
  'shipping:quote',
  'settings:read',
  'credits:read',
  'customers:read',
  'labels:read',
  'shipments:create',
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

export const MCP_READ_SCOPES: McpScope[] = [
  'orders:read',
  'tracking:read',
  'shipping:quote',
  'settings:read',
  'credits:read',
];

/** Customer PII and label downloads are granted only when the user ticks them at consent. */
export const MCP_OPTIONAL_SCOPES: McpScope[] = ['customers:read', 'labels:read', 'shipments:create'];

export const MCP_GRANTABLE_SCOPES: McpScope[] = [...MCP_READ_SCOPES, ...MCP_OPTIONAL_SCOPES];

export const MCP_POLICY_VERSION = 3;

/** The tenant action a user must hold for a scope to be granted or used. */
export const SCOPE_ACTION: Record<McpScope, Action> = {
  'orders:read': 'orders:read',
  'tracking:read': 'orders:read',
  'shipping:quote': 'shipping:quote',
  'settings:read': 'settings:read',
  'credits:read': 'credits:read',
  'customers:read': 'customers:read',
  'labels:read': 'labels:read',
  'shipments:create': 'shipments:book',
};

/** A scope never grants more than the connecting user's role allows. */
export function scopesAllowedForUser(scopes: readonly McpScope[], user: Pick<AuthenticatedUser, 'role'>): McpScope[] {
  return scopes.filter((scope) => can(user, SCOPE_ACTION[scope]));
}

const SCOPE_SET = new Set<string>(MCP_SCOPES);

export function isMcpScope(value: string): value is McpScope {
  return SCOPE_SET.has(value);
}

export function parseScopeString(value: string | null | undefined): McpScope[] {
  if (!value) return [];
  const unique = new Set<McpScope>();
  for (const part of value.split(/[\s,]+/)) {
    const trimmed = part.trim();
    if (isMcpScope(trimmed)) unique.add(trimmed);
  }
  return [...unique];
}

export function intersectScopes(requested: McpScope[], allowed: readonly McpScope[]): McpScope[] {
  const allow = new Set(allowed);
  return requested.filter((scope) => allow.has(scope));
}

export function hasScope(granted: readonly string[], required: McpScope): boolean {
  return granted.includes(required);
}

export const SCOPE_DESCRIPTIONS: Record<McpScope, string> = {
  'orders:read': 'Search and view your orders',
  'tracking:read': 'Read saved shipment tracking status',
  'shipping:quote': 'Estimate shipping from your configured rates',
  'settings:read': 'See account capabilities and permitted pickup locations',
  'credits:read': 'See your remaining shipping credit balance',
  'customers:read': "See customers' full phone numbers and addresses, and look up a customer's order history",
  'labels:read': 'Open printable shipping labels through links that expire after 10 minutes',
  'shipments:create': 'Create orders and book shipments. Each order uses credits, and the assistant must show you a preview and get your confirmation first',
};
