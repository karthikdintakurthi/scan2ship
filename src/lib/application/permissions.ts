import { NextResponse } from 'next/server';
import { UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';

/**
 * Tenant actions a role may perform. PermissionLevel (READ/WRITE/DELETE) is
 * too coarse: every tenant role holds WRITE, so it cannot separate a child
 * user creating an order from one changing tenant settings. Record/resource
 * scoping (tenant, sub-group, pickup assignment) still applies on top of this.
 */
export const ACTIONS = [
  'orders:read',
  'orders:create',
  'orders:update',
  'orders:delete',
  'shipments:book',
  'tracking:refresh',
  'customers:read',
  'labels:read',
  'shipping:quote',
  'settings:read',
  'settings:write',
  'pickups:book',
  'credits:read',
  'credits:recharge',
  'integrations:manage',
  'users:manage',
  'api_keys:manage',
] as const;

export type Action = (typeof ACTIONS)[number];

const CHILD_USER_ACTIONS: Action[] = [
  'orders:read',
  'orders:create',
  'orders:update',
  'orders:delete',
  'shipments:book',
  'tracking:refresh',
  'customers:read',
  'labels:read',
  'shipping:quote',
  'settings:read',
];

const USER_ACTIONS: Action[] = [
  ...CHILD_USER_ACTIONS,
  'settings:write',
  'pickups:book',
  'credits:read',
  'credits:recharge',
  'integrations:manage',
];

const CLIENT_ADMIN_ACTIONS: Action[] = [...USER_ACTIONS, 'users:manage', 'api_keys:manage'];

export const ROLE_ACTIONS: Record<UserRole, ReadonlySet<Action>> = {
  [UserRole.CHILD_USER]: new Set(CHILD_USER_ACTIONS),
  [UserRole.USER]: new Set(USER_ACTIONS),
  [UserRole.CLIENT_ADMIN]: new Set(CLIENT_ADMIN_ACTIONS),
  // Platform admins act within a tenant with the tenant's full action set;
  // platform-only operations stay behind SUPER_ADMIN/MASTER_ADMIN role checks.
  [UserRole.SUPER_ADMIN]: new Set(CLIENT_ADMIN_ACTIONS),
  [UserRole.MASTER_ADMIN]: new Set(CLIENT_ADMIN_ACTIONS),
};

/** Unknown roles can do nothing. */
export function can(user: Pick<AuthenticatedUser, 'role'>, action: Action): boolean {
  return ROLE_ACTIONS[user.role as UserRole]?.has(action) ?? false;
}

/** 403 response for a route handler when the user's role lacks the action, otherwise null. */
export function forbiddenUnless(user: Pick<AuthenticatedUser, 'role'>, action: Action): NextResponse | null {
  if (can(user, action)) return null;
  return NextResponse.json({ error: 'Your role does not allow this action' }, { status: 403 });
}
