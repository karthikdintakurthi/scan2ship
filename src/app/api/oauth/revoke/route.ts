import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sha256Hex } from '@/lib/mcp/crypto';
import { mcpCorsHeaders, withMcpCors } from '@/lib/mcp/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: mcpCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) {
    return withMcpCors(request, NextResponse.json({ error: 'invalid_request' }, { status: 400 }));
  }

  const tokenHash = sha256Hex(token);
  const stored = await prisma.mcp_refresh_tokens.findUnique({
    where: { tokenHash },
    include: { grant: true },
  });
  if (stored && !stored.revokedAt) {
    await prisma.mcp_refresh_tokens.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    await prisma.mcp_grants.update({
      where: { id: stored.grantId },
      data: { revokedAt: new Date(), updatedAt: new Date() },
    });
  }

  return withMcpCors(request, NextResponse.json({ revoked: true }));
}
