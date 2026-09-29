import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser, PermissionLevel, UserRole } from '@/lib/auth-middleware';
import { listGrantsForUser, revokeGrant } from '@/lib/mcp/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await authorizeUser(request, {
    requiredRole: UserRole.CHILD_USER,
    requiredPermissions: [PermissionLevel.READ],
    requireActiveUser: true,
    requireActiveClient: true,
  });
  if (authResult.response) return authResult.response;
  const user = authResult.user!;

  const grants = await listGrantsForUser(user.id, user.clientId);
  return NextResponse.json({
    connections: grants.map((grant) => ({
      id: grant.id,
      name: grant.oauthClient.name,
      scopes: grant.scopes,
      createdAt: grant.createdAt,
      lastUsedAt: grant.lastUsedAt,
      revokedAt: grant.revokedAt,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const authResult = await authorizeUser(request, {
    requiredRole: UserRole.CHILD_USER,
    requiredPermissions: [PermissionLevel.READ],
    requireActiveUser: true,
    requireActiveClient: true,
  });
  if (authResult.response) return authResult.response;
  const user = authResult.user!;

  const grantId = new URL(request.url).searchParams.get('id');
  if (!grantId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const revoked = await revokeGrant(grantId, user.id, user.clientId);
  if (!revoked) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
