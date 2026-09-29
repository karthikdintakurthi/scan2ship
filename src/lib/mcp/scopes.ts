export const MCP_SCOPES = [
  'orders:read',
  'tracking:read',
  'shipping:quote',
  'settings:read',
  'credits:read',
  'customers:read',
  'labels:read',
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

export const MCP_READ_SCOPES: McpScope[] = [
  'orders:read',
  'tracking:read',
  'shipping:quote',
  'settings:read',
  'credits:read',
];

export const MCP_POLICY_VERSION = 1;

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
  'customers:read': 'See full recipient contact details',
  'labels:read': 'Download shipping labels',
};
