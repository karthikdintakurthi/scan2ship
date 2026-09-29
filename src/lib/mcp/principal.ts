import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import type { McpScope } from './scopes';

export type McpPrincipal = {
  requestId: string;
  tenantId: string;
  userId: string;
  grantId: string;
  oauthClientId: string;
  scopes: McpScope[];
  role: UserRole;
  user: AuthenticatedUser;
};

export function userFromGrant(row: {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  clientId: string;
  parentUserId?: string | null;
  createdBy?: string | null;
  clients: {
    id: string;
    isActive: boolean;
    subscriptionStatus: string;
    subscriptionExpiresAt: Date | null;
  };
}): AuthenticatedUser {
  const role = (Object.values(UserRole) as string[]).includes(row.role)
    ? (row.role as UserRole)
    : UserRole.CHILD_USER;

  return {
    id: row.id,
    email: row.email,
    role,
    clientId: row.clientId,
    isActive: row.isActive,
    parentUserId: row.parentUserId ?? undefined,
    createdBy: row.createdBy ?? undefined,
    client: {
      id: row.clients.id,
      isActive: row.clients.isActive,
      subscriptionStatus: row.clients.subscriptionStatus,
      subscriptionExpiresAt: row.clients.subscriptionExpiresAt,
    },
    permissions: ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS[UserRole.CHILD_USER],
  };
}
