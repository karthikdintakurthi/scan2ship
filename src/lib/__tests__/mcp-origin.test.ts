/**
 * @jest-environment node
 *
 * The MCP endpoint rejects browser requests from unexpected origins (the MCP
 * transport spec's DNS-rebinding defence) and only lets allowed origins read
 * responses. Server-side clients send no Origin and are unaffected.
 */
process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = '*';
process.env.MCP_PUBLIC_BASE_URL = 'https://beta.scan2ship.in';
process.env.MCP_ALLOWED_ORIGINS = 'http://localhost:6274';

// jest.setup replaces these with simplified stubs; this test needs real header semantics
const primitives = require('next/dist/compiled/@edge-runtime/primitives');
Object.assign(global, { Request: primitives.Request, Response: primitives.Response, Headers: primitives.Headers });

jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/mcp/auth', () => ({ authenticateMcpRequest: jest.fn() }));

import { authenticateMcpRequest } from '@/lib/mcp/auth';
import { McpAuthError } from '@/lib/mcp/errors';
import { mcpCorsHeaders } from '@/lib/mcp/http';
import { POST, OPTIONS } from '@/app/api/mcp/route';

const authenticate = authenticateMcpRequest as jest.Mock;

function mcpRequest(method: string, origin?: string) {
  return new Request('https://beta.scan2ship.in/api/mcp', {
    method,
    headers: {
      host: 'beta.scan2ship.in',
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(origin ? { origin } : {}),
    },
    ...(method === 'POST' ? { body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }) } : {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authenticate.mockRejectedValue(new McpAuthError('invalid_token', 'Missing token'));
});

describe('MCP origin checks', () => {
  it.each(['https://evil.example', 'http://beta.scan2ship.in', 'null'])('rejects %s before authenticating', async (origin) => {
    const response = await POST(mcpRequest('POST', origin));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'invalid_origin' });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('rejects a preflight from another origin', async () => {
    expect((await OPTIONS(mcpRequest('OPTIONS', 'https://evil.example'))).status).toBe(403);
  });

  it.each(['https://beta.scan2ship.in', 'https://claude.ai', 'https://claude.com', 'http://localhost:6274'])(
    'lets %s through and reflects it',
    async (origin) => {
      const preflight = await OPTIONS(mcpRequest('OPTIONS', origin));
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('access-control-allow-origin')).toBe(origin);

      const response = await POST(mcpRequest('POST', origin));
      expect(response.status).toBe(401);
      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
      expect(authenticate).toHaveBeenCalled();
    }
  );

  it('does not affect server-side clients that send no Origin', async () => {
    const response = await POST(mcpRequest('POST'));
    expect(response.status).toBe(401);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('never grants CORS to an unlisted origin on the shared OAuth endpoints', () => {
    const headers = mcpCorsHeaders(mcpRequest('POST', 'https://evil.example')) as Record<string, string>;
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers.Vary).toBe('Origin');
  });
});
