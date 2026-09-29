import { getAccountContext } from '@/lib/application/account';
import { getCreditBalanceReadOnly } from '@/lib/application/credits';
import {
  getCustomerOrderHistory,
  getOrder,
  getTrackingStatus,
  resolveShippingLabel,
  searchOrders,
} from '@/lib/application/orders';
import {
  createShipmentInputSchema,
  customerOrderHistoryInputSchema,
  getShipmentOperationInputSchema,
  prepareShipmentInputSchema,
  getOrderInputSchema,
  getShippingLabelInputSchema,
  getTrackingStatusInputSchema,
  quoteShippingInputSchema,
  searchOrdersInputSchema,
} from '@/lib/application/schemas';
import { listShippingOptions, quoteShipping } from '@/lib/application/shipping';
import { createShipment, getShipmentOperation, prepareShipment } from '@/lib/application/shipments';
import { consumeMcpQuota, requireScope, touchGrant } from './auth';
import { logMcpEvent } from './audit';
import { McpAuthError, McpToolError } from './errors';
import { createLabelLink } from './labels';
import type { McpPrincipal } from './principal';
import type { McpScope } from './scopes';

export type McpToolDefinition = {
  name: string;
  description: string;
  scope: McpScope;
  /** Changes data; listed only while MCP_WRITES_ENABLED is on */
  write?: 'preview' | 'create' | 'status';
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
  {
    name: 'get_customer_order_history',
    description:
      "Return a customer's recent orders (up to 25) by their 10-digit mobile number, matching customer or reseller mobile. Uses the account's own history window; returns enabled=false if the account has history turned off. Includes full contact details.",
    scope: 'customers:read',
  },
  {
    name: 'get_shipping_label',
    description:
      "Return a link to one order's printable shipping label. The link expires after 10 minutes and stops working if the connection is revoked. Share the link with the user; do not fetch it.",
    scope: 'labels:read',
  },
  {
    name: 'prepare_shipment',
    description:
      'Validate a new order and return a preview with its credit cost. Nothing is charged or booked. Use list_shipping_options for valid courier codes and pickup locations. Show the preview to the user and wait for their explicit confirmation before calling create_shipment.',
    scope: 'shipments:create',
    write: 'preview',
  },
  {
    name: 'create_shipment',
    description:
      'Create the order for a preview the user has explicitly confirmed. Uses credits and, for Delhivery, books a real waybill. Calling it again with the same previewId never creates a second order; it returns the first outcome.',
    scope: 'shipments:create',
    write: 'create',
  },
  {
    name: 'get_shipment_operation',
    description: 'Return the status of a prepared or created shipment by its previewId/operationId.',
    scope: 'shipments:create',
    write: 'status',
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
  if (name === 'get_customer_order_history' && data && typeof data === 'object' && 'count' in data) {
    const history = data as { enabled: boolean; count: number; days: number; truncated: boolean };
    if (!history.enabled) return 'Customer order history is turned off for this account.';
    return `Found ${history.count}${history.truncated ? '+' : ''} order(s) in the last ${history.days} days.`;
  }
  if (name === 'get_shipping_label' && data && typeof data === 'object' && 'url' in data) {
    const label = data as { orderId: number; url: string; expiresAt: string };
    return `Label for order ${label.orderId}: ${label.url} (expires ${label.expiresAt}).`;
  }
  if (name === 'prepare_shipment' && data && typeof data === 'object' && 'previewId' in data) {
    const preview = data as { previewId: string; cost: { credits: number; sufficient: boolean } };
    return `Preview ${preview.previewId} ready (${preview.cost.credits} credit${preview.cost.credits === 1 ? '' : 's'}${preview.cost.sufficient ? '' : ', insufficient balance'}). Confirm with the user before creating it.`;
  }
  if ((name === 'create_shipment' || name === 'get_shipment_operation') && data && typeof data === 'object' && 'status' in data) {
    const op = data as { status: string; orderId: number | null; error: string | null };
    if (op.status === 'succeeded') return `Order ${op.orderId} created.`;
    return `Shipment ${op.status}${op.error ? `: ${op.error}` : ''}.`;
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
      case 'get_customer_order_history': {
        const input = customerOrderHistoryInputSchema.parse(rawArgs ?? {});
        structured = await getCustomerOrderHistory(principal.user, input);
        break;
      }
      case 'prepare_shipment': {
        const input = prepareShipmentInputSchema.parse(rawArgs ?? {});
        structured = await prepareShipment(principal, input);
        break;
      }
      case 'create_shipment': {
        const input = createShipmentInputSchema.parse(rawArgs ?? {});
        structured = await createShipment(principal, input.previewId);
        break;
      }
      case 'get_shipment_operation': {
        const input = getShipmentOperationInputSchema.parse(rawArgs ?? {});
        structured = await getShipmentOperation(principal, input.operationId);
        break;
      }
      case 'get_shipping_label': {
        const input = getShippingLabelInputSchema.parse(rawArgs ?? {});
        const label = await resolveShippingLabel(principal.user, input.orderId, input.format);
        const link = createLabelLink(principal, label.orderId, label.format);
        structured = {
          orderId: label.orderId,
          trackingId: label.trackingId,
          format: label.format,
          contentType: 'text/html',
          url: link.url,
          expiresAt: link.expiresAt,
          instructions: 'Open the link in a browser and print. It expires after 10 minutes.',
        };
        break;
      }
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
      : structured && typeof structured === 'object' && 'orderId' in structured
        ? [(structured as { orderId: number }).orderId]
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
