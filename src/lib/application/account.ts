import { prisma } from '@/lib/prisma';
import type { AuthenticatedUser } from '@/lib/auth-middleware';
import type { McpScope } from '@/lib/mcp/scopes';
import { areMcpWritesEnabled } from '@/lib/mcp/config';

export async function getAccountContext(user: AuthenticatedUser, scopes: readonly McpScope[] | readonly string[]) {
  const [client, orderConfig] = await Promise.all([
    prisma.clients.findUnique({
      where: { id: user.clientId },
      select: { id: true, name: true, companyName: true, subscriptionPlan: true, subscriptionStatus: true },
    }),
    prisma.client_order_configs.findUnique({
      where: { clientId: user.clientId },
      select: {
        defaultWeight: true,
        defaultPackageValue: true,
        enableCustomerOrderHistory: true,
        customerOrderHistoryDays: true,
      },
    }),
  ]);

  return {
    tenant: {
      id: user.clientId,
      name: client?.companyName || client?.name || 'Scan2Ship account',
      subscriptionStatus: client?.subscriptionStatus ?? null,
    },
    user: {
      id: user.id,
      role: user.role,
    },
    units: {
      weight: 'grams',
      currency: 'INR',
      credits: 'integer_credits',
    },
    capabilities: {
      searchOrders: scopes.includes('orders:read'),
      getOrder: scopes.includes('orders:read'),
      getTrackingStatus: scopes.includes('tracking:read'),
      trackShipmentLive: scopes.includes('tracking:read'),
      listShippingOptions: scopes.includes('settings:read'),
      quoteShipping: scopes.includes('shipping:quote'),
      getCreditBalance: scopes.includes('credits:read'),
      fullCustomerContact: scopes.includes('customers:read'),
      customerOrderHistory: scopes.includes('customers:read'),
      shippingLabels: scopes.includes('labels:read'),
      createShipments: scopes.includes('shipments:create') && areMcpWritesEnabled(),
      schedulePickups: scopes.includes('pickups:create') && areMcpWritesEnabled(),
    },
    defaults: orderConfig
      ? {
          weightGrams: orderConfig.defaultWeight,
          packageValueInr: orderConfig.defaultPackageValue,
          customerOrderHistoryDays: orderConfig.enableCustomerOrderHistory
            ? orderConfig.customerOrderHistoryDays
            : null,
        }
      : null,
  };
}
