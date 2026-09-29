import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { McpPrincipal } from './principal';
import { areMcpWritesEnabled } from './config';
import { executeMcpTool, MCP_TOOL_DEFINITIONS, toolAllowed, toolErrorPayload, type McpToolDefinition } from './tools';

const emptySchema = z.object({});

const TOOL_INPUT: Record<string, z.ZodTypeAny> = {
  get_account_context: emptySchema,
  search_orders: z.object({
    query: z.string().max(80).optional(),
    trackingStatus: z.string().max(40).optional(),
    courierService: z.string().max(80).optional(),
    pickupLocation: z.string().max(120).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  get_order: z.object({ orderId: z.number().int().positive() }),
  get_tracking_status: z.object({
    orderId: z.number().int().positive().optional(),
    trackingId: z.string().max(80).optional(),
  }),
  track_shipment_live: z.object({
    orderId: z.number().int().positive().optional(),
    trackingId: z.string().max(80).optional().describe('Delhivery waybill number'),
  }),
  list_shipping_options: emptySchema,
  quote_shipping: z.object({
    weightGrams: z.number().positive().max(50000),
    packageValueInr: z.number().min(0).max(1_000_000),
    isCod: z.boolean().optional(),
    courierCode: z.string().max(80).optional(),
  }),
  get_credit_balance: emptySchema,
  get_customer_order_history: z.object({
    mobile: z.string().min(10).max(20).describe('Customer or reseller mobile number; the last 10 digits are used'),
  }),
  prepare_shipment: z.object({
    recipient: z.object({
      name: z.string().max(120),
      mobile: z.string().max(20).describe('10-digit Indian mobile, optionally with +91'),
      address: z.string().max(500),
      city: z.string().max(80),
      state: z.string().max(80),
      pincode: z.string().describe('6-digit PIN code'),
      country: z.string().max(60).optional(),
    }),
    package: z.object({
      weightGrams: z.number().positive(),
      packageValueInr: z.number().positive(),
      totalItems: z.number().int().min(1).optional(),
      description: z.string().max(200).optional(),
    }),
    payment: z.object({
      mode: z.enum(['prepaid', 'cod']),
      codAmountInr: z.number().positive().optional().describe('Required for cod'),
    }),
    courierCode: z.string().describe('A courier code from list_shipping_options'),
    pickupLocation: z.string().describe('A pickup location name or value from list_shipping_options'),
    referenceNumber: z
      .string()
      .max(60)
      .optional()
      .describe("The seller's own order reference. Not a tracking number; Scan2Ship appends the customer mobile."),
    trackingNumber: z
      .string()
      .max(40)
      .optional()
      .describe('Optional courier tracking/consignment number. India Post and similar: the number the user has. DTDC: leave empty to use the next unused DTDC number from Settings. Delhivery: not allowed, Delhivery assigns the waybill.'),
    reseller: z.object({ name: z.string().optional(), mobile: z.string().optional() }).optional(),
  }),
  create_shipment: z.object({ previewId: z.string().describe('previewId returned by prepare_shipment') }),
  get_shipment_operation: z.object({ operationId: z.string() }),
  prepare_pickup: z.object({
    pickupDate: z.string().describe('YYYY-MM-DD, today or up to 14 days ahead (India time)'),
    pickupTime: z.string().describe('24-hour HH:MM in IST, later than now if the date is today'),
    expectedPackageCount: z.number().int().min(1),
    pickupLocations: z.array(z.string()).min(1).describe('Pickup location names or values from list_shipping_options'),
  }),
  schedule_pickup: z.object({ previewId: z.string().describe('previewId returned by prepare_pickup') }),
  get_shipping_label: z.object({
    orderId: z.number().int().positive(),
    format: z
      .enum(['standard', 'thermal', 'a5', 'r4'])
      .optional()
      .describe("Label layout; defaults to the account's print mode"),
  }),
};

const READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function annotationsFor(tool: McpToolDefinition) {
  switch (tool.write) {
    case 'preview':
      // Saves a preview only; nothing charged or sent to a carrier
      return { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
    case 'create':
      // Charges credits and may book a real carrier shipment; repeatable per preview
      return { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };
    case 'status':
    default:
      // Live tracking reads from Delhivery, outside Scan2Ship
      return tool.name === 'track_shipment_live' ? { ...READ_ANNOTATIONS, openWorldHint: true } : READ_ANNOTATIONS;
  }
}

export function createMcpServer(principal: McpPrincipal): McpServer {
  const server = new McpServer(
    { name: 'scan2ship', version: '0.1.0' },
    { instructions: 'Customer MCP for one Scan2Ship tenant. Tools cannot select another tenant.' }
  );

  // Only list tools this connection may call, so assistants are not offered tools they cannot use.
  const writesEnabled = areMcpWritesEnabled();
  for (const tool of MCP_TOOL_DEFINITIONS.filter(
    (item) => toolAllowed(item, principal.scopes) && (!item.write || writesEnabled)
  )) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: TOOL_INPUT[tool.name] ?? emptySchema,
        annotations: annotationsFor(tool),
      },
      async (args) => {
        try {
          const result = await executeMcpTool(principal, tool.name, args ?? {});
          return {
            content: [{ type: 'text', text: `${result.text}\n${JSON.stringify(result.structured)}` }],
            structuredContent: result.structured as Record<string, unknown>,
          };
        } catch (error) {
          return toolErrorPayload(error);
        }
      }
    );
  }

  return server;
}
