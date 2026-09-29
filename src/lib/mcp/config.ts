import { MCP_READ_SCOPES, type McpScope } from './scopes';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function mcpPublicBaseUrl(): string {
  const raw =
    process.env.MCP_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  return stripTrailingSlash(raw);
}

export function mcpIssuer(): string {
  return mcpPublicBaseUrl();
}

export function mcpResourceUrl(): string {
  return `${mcpIssuer()}/api/mcp`;
}

export function mcpJwtSecret(): string {
  const secret = process.env.MCP_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('MCP_JWT_SECRET or JWT_SECRET must be at least 32 characters');
  }
  return secret;
}

export function isMcpEnabled(): boolean {
  return process.env.MCP_ENABLED === 'true';
}

export function isTenantAllowedForMcp(tenantId: string): boolean {
  const raw = process.env.MCP_TENANT_ALLOWLIST?.trim();
  if (!raw) return false;
  if (raw === '*') return true;
  return raw.split(',').map((part) => part.trim()).filter(Boolean).includes(tenantId);
}

export function mcpAllowedHosts(): string[] {
  const fromEnv = process.env.MCP_ALLOWED_HOSTS?.split(',').map((h) => h.trim()).filter(Boolean) ?? [];
  if (fromEnv.length > 0) return fromEnv;
  try {
    return [new URL(mcpPublicBaseUrl()).host];
  } catch {
    return [];
  }
}

export const MCP_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const MCP_REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
export const MCP_AUTHORIZATION_CODE_TTL_SECONDS = 10 * 60;

export const MCP_DEFAULT_SCOPES: McpScope[] = [...MCP_READ_SCOPES];

export const MCP_QUOTA = {
  toolWindowMs: 60 * 1000,
  toolMax: 60,
  grantWindowMs: 60 * 1000,
  grantMax: 120,
};
