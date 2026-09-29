import { prisma } from '@/lib/prisma';

export async function logMcpEvent(input: {
  eventType: string;
  tenantId?: string;
  userId?: string;
  grantId?: string;
  tool?: string;
  targetIds?: Array<string | number>;
  result: 'ok' | 'error' | 'denied';
  requestId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.audit_logs.create({
      data: {
        id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        eventType: input.eventType,
        severity: input.result === 'ok' ? 'LOW' : 'MEDIUM',
        userId: input.userId,
        clientId: input.tenantId,
        sessionId: input.grantId,
        ipAddress: 'mcp',
        userAgent: 'mcp',
        resource: input.tool ?? 'mcp',
        action: input.eventType,
        details: JSON.stringify({
          grantId: input.grantId,
          tool: input.tool,
          targetIds: input.targetIds,
          result: input.result,
          ...input.details,
        }),
        metadata: JSON.stringify({
          source: 'mcp',
          requestId: input.requestId,
          timestamp: new Date().toISOString(),
        }),
        riskScore: input.result === 'denied' ? 4 : 1,
        tags: ['mcp', input.result],
      },
    });
  } catch {
    // Audit is best-effort; missing columns on drifted databases must not break OAuth.
  }
}
