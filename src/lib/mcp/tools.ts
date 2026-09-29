import { getAccountContext } from '@/lib/application/account';
import { getCreditBalanceReadOnly } from '@/lib/application/credits';
import { getOrder, getTrackingStatus, searchOrders } from '@/lib/application/orders';
import {
  getOrderInputSchema,
  getTrackingStatusInputSchema,
  quoteShippingInputSchema,
  searchOrdersInputSchema,
} from '@/lib/application/schemas';
import { listShippingOptions, quoteShipping } from '@/lib/application/shipping';
import { consumeMcpQuota, requireScope, touchGrant } from './auth';
import { logMcpEvent } from './audit';
import { McpAuthError, McpToolError } from './errors';
import type { McpPrincipal } from './principal';

export type McpToolDefinition = {
  name: string;
  description: string;
  scope: 'settings:read' | 'orders:read' | 'tracking:read' | 'shipping:quote' | 'credits:read';
};

export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'get_account_context',
    description: 'Return tenant identity, units, and which capabilities this connection may use. Never includes credentials.',
    scope: 'settings:read',
  },
  {
    name: 'search_orders',
    description: 'Search the connected tenant’s orders with optional filters and cursor pagination.',
    scope: 'orders:read',
  },
  {
    name: 'get_order',
    description: 'Return one order the caller can access. Street address is omitted unless customers:read was granted.',
    scope: 'orders:read',
  },
  {
    name: 'get_tracking_status',
    description: 'Return the saved tracking status for a tenant-owned shipment. Does not refresh the carrier.',
    scope: 'tracking:read',
  },
  {
    name: 'list_shipping_options',
    description: 'List permitted pickup locations and active courier services. API keys are never returned.',
    scope: 'settings:read',
  },
  {
    name: 'quote_shipping',
    description: 'Return a configured_estimate from this tenant’s rate table. This is not a live carrier quote.',
    scope: 'shipping:quote',
  },
  {
    name: 'get_credit_balance',
    description: 'Return the remaining integer shipping credit balance. Does not create or change the account.',
    scope: 'credits:read',
  },
];

function summaryFor(name: string, data: unknown): string {
  if (name === 'search_orders' && data && typeof data === 'object' && 'orders' in data) {
    const orders = (data as { orders: unknown[] }).orders;
    return `Found ${orders.length} order(s).`;
  }
  if (name === 'get_order' && data && typeof data === 'object' && 'id' in data) {
    return `Order ${(data as { id: number }).id}.`;
  }
  if (name === 'get_credit_balance' && data && typeof data === 'object' && 'balance' in data) {
    return `Credit balance: ${(data as { balance: number }).balance}.`;
  }
  return JSON.stringify(data);
}

export async function executeMcpTool(
  principal: McpPrincipal,
  name: string,
  rawArgs: unknown
): Promise<{ structured: unknown; text: string }> {
  const tool = MCP_TOOL_DEFINITIONS.find((item) => item.name === name);
  if (!tool) throw new McpToolError('not_found', `Unknown tool: ${name}`);

  requireScope(principal, tool.scope);
  await consumeMcpQuota(principal, name);

  let structured: unknown;
  try {
    switch (name) {
      case 'get_account_context':
        structured = await getAccountContext(principal.user, principal.scopes);
        break;
      case 'search_orders': {
        const input = searchOrdersInputSchema.parse(rawArgs ?? {});
        structured = await searchOrders(principal.user, input);
        break;
      }
      case 'get_order': {
        const input = getOrderInputSchema.parse(rawArgs ?? {});
        structured = await getOrder(principal.user, input.orderId, principal.scopes);
        break;
      }
      case 'get_tracking_status': {
        const input = getTrackingStatusInputSchema.parse(rawArgs ?? {});
        structured = await getTrackingStatus(principal.user, input);
        break;
      }
      case 'list_shipping_options':
        structured = await listShippingOptions(principal.user);
        break;
      case 'quote_shipping': {
        const input = quoteShippingInputSchema.parse(rawArgs ?? {});
        structured = await quoteShipping(principal.user, input);
        break;
      }
      case 'get_credit_balance':
        structured = await getCreditBalanceReadOnly(principal.tenantId);
        break;
      default:
        throw new McpToolError('not_found', `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpToolError || error instanceof McpAuthError) {
      await logMcpEvent({
        eventType: 'MCP_TOOL_DENIED',
        tenantId: principal.tenantId,
        userId: principal.userId,
        grantId: principal.grantId,
        tool: name,
        result: 'denied',
        requestId: principal.requestId,
      });
      throw error;
    }
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      throw new McpToolError('invalid_params', 'Invalid tool arguments');
    }
    throw error;
  }

  await touchGrant(principal.grantId);
  const targetIds =
    structured && typeof structured === 'object' && 'id' in structured
      ? [(structured as { id: number }).id]
      : structured && typeof structured === 'object' && 'orders' in structured
        ? (structured as { orders: Array<{ id: number }> }).orders.map((row) => row.id)
        : undefined;
  await logMcpEvent({
    eventType: 'MCP_TOOL_CALL',
    tenantId: principal.tenantId,
    userId: principal.userId,
    grantId: principal.grantId,
    tool: name,
    targetIds,
    result: 'ok',
    requestId: principal.requestId,
  });

  return { structured, text: summaryFor(name, structured) };
}

export function toolErrorPayload(error: unknown) {
  if (error instanceof McpToolError) {
    return {
      isError: true as const,
      content: [{ type: 'text' as const, text: `${error.code}: ${error.message}` }],
      structuredContent: { error: error.code, message: error.message, retryable: error.retryable },
    };
  }
  if (error instanceof McpAuthError) {
    return {
      isError: true as const,
      content: [{ type: 'text' as const, text: `${error.code}: ${error.message}` }],
      structuredContent: { error: error.code, message: error.message },
    };
  }
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: 'internal: Tool failed' }],
    structuredContent: { error: 'internal', message: 'Tool failed' },
  };
}
