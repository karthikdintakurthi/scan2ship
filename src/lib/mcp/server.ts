import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { McpPrincipal } from './principal';
import { executeMcpTool, MCP_TOOL_DEFINITIONS, toolErrorPayload } from './tools';

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

export function createMcpServer(principal: McpPrincipal): McpServer {
  const server = new McpServer(
    { name: 'scan2ship', version: '0.1.0' },
    { instructions: 'Customer MCP for one Scan2Ship tenant. Tools cannot select another tenant.' }
  );

  // Only list tools this connection may call, so assistants are not offered tools they cannot use.
  for (const tool of MCP_TOOL_DEFINITIONS.filter((item) => principal.scopes.includes(item.scope))) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: TOOL_INPUT[tool.name] ?? emptySchema,
        annotations: READ_ANNOTATIONS,
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
