import { ROLE_LEVELS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';

export type ProvisioningDecision =
  | { ok: true; clientId: string; role: UserRole }
  | { ok: false; status: 400 | 403; error: string };

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLE_LEVELS, value);
}

/**
 * Decides which tenant and role a new user gets. Tenant admins create users
 * only in their own tenant; platform admins (super_admin and above) may pick
 * the tenant. Nobody can grant a role above their own.
 */
export function resolveUserProvisioning(
  creator: AuthenticatedUser,
  request: { clientId?: unknown; role?: unknown }
): ProvisioningDecision {
  const role = request.role ?? UserRole.USER;
  if (!isUserRole(role)) {
    return { ok: false, status: 400, error: `Invalid role. Allowed roles: ${Object.values(UserRole).join(', ')}` };
  }

  if (ROLE_LEVELS[role] > ROLE_LEVELS[creator.role]) {
    return { ok: false, status: 403, error: `You cannot create a user with role ${role}` };
  }

  const isPlatformAdmin = ROLE_LEVELS[creator.role] >= ROLE_LEVELS[UserRole.SUPER_ADMIN];
  const requestedClientId = request.clientId === undefined || request.clientId === '' ? undefined : request.clientId;

  if (requestedClientId !== undefined && typeof requestedClientId !== 'string') {
    return { ok: false, status: 400, error: 'clientId must be a string' };
  }

  if (!isPlatformAdmin) {
    if (requestedClientId !== undefined && requestedClientId !== creator.clientId) {
      return { ok: false, status: 403, error: 'You can only create users in your own client account' };
    }
    return { ok: true, clientId: creator.clientId, role };
  }

  if (!requestedClientId) {
    return { ok: false, status: 400, error: 'clientId is required' };
  }
  return { ok: true, clientId: requestedClientId, role };
}
