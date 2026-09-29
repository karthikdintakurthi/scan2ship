import type { Prisma, shipment_operations } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import { getCreditBalanceReadOnly } from '@/lib/application/credits';
import { createOrder, validateOrderInput } from '@/lib/application/order-creation';
import { listShippingOptions } from '@/lib/application/shipping';
import { isDtdcCourier, peekNextDtdcSlip } from '@/lib/application/dtdc-slips';
import type { PrepareShipmentInput } from '@/lib/application/schemas';
import { areMcpWritesEnabled, mcpDailyShipmentLimit } from '@/lib/mcp/config';
import { newId, sha256Hex } from '@/lib/mcp/crypto';
import { McpToolError } from '@/lib/mcp/errors';
import type { McpPrincipal } from '@/lib/mcp/principal';

/** How long a preview can be confirmed before it must be prepared again. */
export const PREVIEW_TTL_MS = 15 * 60 * 1000;

/** A creation still marked "creating" after this long probably died mid-request. */
const STALE_CREATING_MS = 2 * 60 * 1000;

const CHANNEL = 'mcp';

/** Payload marker: take the next unused DTDC number when the order is created. */
const AUTO_DTDC_SLIP = '_assignNextDtdcSlip';

function requireWritesEnabled(principal: McpPrincipal) {
  if (!areMcpWritesEnabled()) {
    throw new McpToolError('forbidden', 'Creating shipments through the assistant is turned off');
  }
  if (principal.writesPaused) {
    throw new McpToolError('forbidden', 'Scan2Ship is in read-only maintenance; creating shipments is paused', true);
  }
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Orders created (or being created) through MCP today count toward the daily limit. */
function countTodaysCreations(tenantId: string) {
  return prisma.shipment_operations.count({
    where: {
      tenantId,
      channel: CHANNEL,
      type: 'shipment',
      status: { in: ['creating', 'succeeded', 'reconciliation_required'] },
      createdAt: { gte: startOfUtcDay() },
    },
  });
}

async function assertUnderDailyLimit(tenantId: string) {
  const limit = mcpDailyShipmentLimit();
  const used = await countTodaysCreations(tenantId);
  if (used >= limit) {
    throw new McpToolError(
      'rate_limited',
      `This account has reached its limit of ${limit} assistant-created orders today. Create further orders on the Scan2Ship website.`
    );
  }
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Validates a shipment and saves a preview without charging credits or
 * contacting the carrier. The assistant must show the preview to the user and
 * call createShipment only after the user confirms.
 */
export async function prepareShipment(principal: McpPrincipal, input: PrepareShipmentInput) {
  requireWritesEnabled(principal);
  await assertUnderDailyLimit(principal.tenantId);

  const options = await listShippingOptions(principal.user);
  const courier = options.courierServices.find((row) => sameText(row.code, input.courierCode));
  if (!courier) {
    throw new McpToolError(
      'invalid_params',
      `Unknown or inactive courier "${input.courierCode}". Available: ${options.courierServices.map((row) => row.code).join(', ') || 'none'}`
    );
  }
  const pickup = options.pickupLocations.find(
    (row) => sameText(row.value, input.pickupLocation) || sameText(row.name, input.pickupLocation)
  );
  if (!pickup) {
    throw new McpToolError(
      'invalid_params',
      `Pickup location "${input.pickupLocation}" is not available to you. Available: ${options.pickupLocations.map((row) => row.name).join(', ') || 'none'}`
    );
  }
  if (courier.minWeightGrams && input.package.weightGrams < courier.minWeightGrams) {
    throw new McpToolError('invalid_params', `${courier.name} needs at least ${courier.minWeightGrams} g`);
  }
  if (courier.maxWeightGrams && input.package.weightGrams > courier.maxWeightGrams) {
    throw new McpToolError('invalid_params', `${courier.name} allows at most ${courier.maxWeightGrams} g`);
  }

  const bookedWithCarrier = sameText(courier.code, 'delhivery');
  if (input.trackingNumber && bookedWithCarrier) {
    throw new McpToolError(
      'invalid_params',
      'Delhivery assigns the waybill when the order is created; do not pass a trackingNumber for Delhivery'
    );
  }

  // Tracking numbers depend on the courier: Delhivery assigns a waybill on
  // creation; DTDC takes the user's number or the account's next unused slip;
  // other couriers use the number the user gives, or none.
  const autoDtdcSlip = isDtdcCourier(courier.code) && !input.trackingNumber;
  const nextDtdcSlip = autoDtdcSlip ? await peekNextDtdcSlip(principal.tenantId, courier.code) : null;

  const isCod = input.payment.mode === 'cod';
  // Website-shaped order input, exactly what createOrder receives on confirmation
  const orderData: Record<string, unknown> = {
    name: input.recipient.name,
    mobile: input.recipient.mobile,
    address: input.recipient.address,
    city: input.recipient.city,
    state: input.recipient.state,
    country: input.recipient.country,
    pincode: input.recipient.pincode,
    courier_service: courier.code,
    pickup_location: pickup.value,
    package_value: input.package.packageValueInr,
    weight: input.package.weightGrams,
    total_items: input.package.totalItems,
    is_cod: isCod,
    cod_amount: isCod ? input.payment.codAmountInr : null,
    ...(input.package.description ? { product_description: input.package.description } : {}),
    ...(input.referenceNumber ? { reference_number: input.referenceNumber } : {}),
    // Couriers without a carrier booking use the tracking number the user supplies
    ...(input.trackingNumber ? { tracking_id: input.trackingNumber } : {}),
    ...(autoDtdcSlip ? { [AUTO_DTDC_SLIP]: true } : {}),
    ...(input.reseller?.name ? { reseller_name: input.reseller.name } : {}),
    ...(input.reseller?.mobile ? { reseller_mobile: input.reseller.mobile } : {}),
  };

  const invalid = validateOrderInput(orderData);
  if (invalid && !invalid.ok) {
    throw new McpToolError('invalid_params', String(invalid.body.error));
  }

  const creditCost = CreditService.getCreditCost('ORDER');
  const { balance } = await getCreditBalanceReadOnly(principal.tenantId);
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const operation = await prisma.shipment_operations.create({
    data: {
      id: `ship_${newId()}`,
      tenantId: principal.tenantId,
      userId: principal.userId,
      grantId: principal.grantId,
      channel: CHANNEL,
      type: 'shipment',
      status: 'previewed',
      payload: orderData as Prisma.InputJsonValue,
      payloadHash: sha256Hex(JSON.stringify(orderData)),
      creditCost,
      expiresAt,
    },
  });

  return {
    previewId: operation.id,
    expiresAt: expiresAt.toISOString(),
    preview: {
      recipient: input.recipient,
      package: {
        weightGrams: input.package.weightGrams,
        packageValueInr: input.package.packageValueInr,
        totalItems: input.package.totalItems,
        description: input.package.description ?? null,
      },
      payment: isCod ? { mode: 'cod', codAmountInr: input.payment.codAmountInr } : { mode: 'prepaid' },
      courier: { code: courier.code, name: courier.name },
      pickupLocation: pickup.name,
      referenceNumber: input.referenceNumber ?? null,
      trackingNumber: bookedWithCarrier
        ? 'assigned by Delhivery on creation'
        : autoDtdcSlip
          ? nextDtdcSlip
            ? `${nextDtdcSlip} (next unused DTDC number; taken when the order is created)`
            : 'none: no unused DTDC numbers in Settings, so the order will have no tracking number'
          : input.trackingNumber ?? null,
      bookedWithCarrier,
    },
    cost: { credits: creditCost, currentBalance: balance, sufficient: balance >= creditCost },
    nextStep:
      'Show this preview to the user. Call create_shipment with this previewId only after the user explicitly confirms. Creating the order uses credits' +
      (bookedWithCarrier ? ' and books a Delhivery waybill.' : '.'),
  };
}

export function operationView(op: shipment_operations) {
  let status = op.status;
  if (status === 'previewed' && op.expiresAt.getTime() <= Date.now()) status = 'expired';
  if (status === 'creating' && Date.now() - op.updatedAt.getTime() > STALE_CREATING_MS) status = 'reconciliation_required';
  return {
    operationId: op.id,
    type: op.type,
    status,
    orderId: op.orderId,
    result: op.result ?? null,
    error: op.error,
    expiresAt: op.expiresAt.toISOString(),
    createdAt: op.createdAt.toISOString(),
    ...(status === 'reconciliation_required'
      ? {
          note:
            op.type === 'pickup'
              ? 'The outcome is uncertain. Check pickup requests on Scan2Ship before trying again; do not request a duplicate pickup.'
              : 'The outcome is uncertain. Check the order list on Scan2Ship before trying again; do not create a duplicate.',
        }
      : {}),
  };
}

/** Why a previewed courier or pickup location can no longer be used, or null. */
async function staleShipmentChoice(principal: McpPrincipal, orderData: Record<string, unknown>): Promise<string | null> {
  const options = await listShippingOptions(principal.user);
  if (!options.courierServices.some((row) => sameText(row.code, String(orderData.courier_service)))) {
    return `Courier "${orderData.courier_service}" is no longer active`;
  }
  if (!options.pickupLocations.some((row) => row.value === orderData.pickup_location)) {
    return `Pickup location "${orderData.pickup_location}" is no longer available to you`;
  }
  return null;
}

export async function findOwnOperation(principal: McpPrincipal, id: string) {
  return prisma.shipment_operations.findFirst({
    where: { id, tenantId: principal.tenantId, userId: principal.userId, channel: CHANNEL },
  });
}

/**
 * Creates the order for a confirmed preview. A preview creates at most one
 * order: repeating the call returns the first outcome instead of ordering again.
 */
export async function createShipment(principal: McpPrincipal, previewId: string) {
  requireWritesEnabled(principal);

  // Claim the preview atomically so concurrent or repeated calls cannot both create
  const claimed = await prisma.shipment_operations.updateMany({
    where: {
      id: previewId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      channel: CHANNEL,
      type: 'shipment',
      status: 'previewed',
      expiresAt: { gt: new Date() },
    },
    data: { status: 'creating' },
  });

  if (claimed.count !== 1) {
    const existing = await findOwnOperation(principal, previewId);
    if (!existing || existing.type !== 'shipment') throw new McpToolError('not_found', 'Preview not found');
    // Already handled, in progress, expired, or failed: report it without ordering again
    return { ...operationView(existing), replayed: true };
  }

  const operation = await findOwnOperation(principal, previewId);
  if (!operation) throw new McpToolError('not_found', 'Preview not found');

  // Re-check the daily limit now that this creation is counted (it is "creating")
  const usedToday = await countTodaysCreations(principal.tenantId);
  if (usedToday > mcpDailyShipmentLimit()) {
    await prisma.shipment_operations.update({
      where: { id: operation.id },
      data: { status: 'failed', error: 'Daily limit for assistant-created orders reached' },
    });
    throw new McpToolError(
      'rate_limited',
      `This account has reached its limit of ${mcpDailyShipmentLimit()} assistant-created orders today. Create further orders on the Scan2Ship website.`
    );
  }

  // createOrder takes the DTDC number now (not at preview), so abandoned previews
  // do not use one up, and returns it if the order is not created
  const { [AUTO_DTDC_SLIP]: autoSlip, ...orderData } = operation.payload as Record<string, unknown>;

  // Settings may have changed since the preview: the courier must still be
  // active and the pickup location still one this user may use
  const stale = await staleShipmentChoice(principal, orderData).catch(
    (error) => `Could not re-check the courier and pickup location: ${error instanceof Error ? error.message : String(error)}`
  );
  if (stale) {
    const updated = await prisma.shipment_operations.update({
      where: { id: operation.id },
      data: { status: 'failed', error: stale },
    });
    return { ...operationView(updated), hint: 'Nothing was charged. Prepare the shipment again with a currently available option.' };
  }

  let outcome: Awaited<ReturnType<typeof createOrder>>;
  try {
    outcome = await createOrder(principal.user, orderData, { creationPattern: 'mcp', assignNextDtdcSlip: Boolean(autoSlip) });
  } catch (error) {
    // Unknown state: the credit or the carrier call may have happened
    const updated = await prisma.shipment_operations.update({
      where: { id: operation.id },
      data: { status: 'reconciliation_required', error: error instanceof Error ? error.message : String(error) },
    });
    return operationView(updated);
  }

  if (outcome.ok) {
    const order = outcome.order;
    const result = {
      orderId: order.id,
      referenceNumber: order.reference_number,
      trackingId: order.tracking_id,
      courier: order.courier_service,
      bookingStatus: order.delhivery_api_status,
      creditsCharged: operation.creditCost,
    };
    const updated = await prisma.shipment_operations.update({
      where: { id: operation.id },
      data: { status: 'succeeded', orderId: order.id, result },
    });
    return operationView(updated);
  }

  // The order exists but its carrier details were not saved: it is charged, so
  // it must be reconciled rather than retried.
  const orderId = typeof outcome.body.orderId === 'number' ? outcome.body.orderId : null;
  // Delhivery may have booked it (timeout, 5xx): not a failure, and not safe to retry
  const outcomeUnknown = outcome.body.outcome === 'unknown';
  const reason = [outcome.body.error, outcome.body.details].filter(Boolean).join(': ');
  const updated = await prisma.shipment_operations.update({
    where: { id: operation.id },
    data: {
      status: orderId || outcomeUnknown ? 'reconciliation_required' : 'failed',
      orderId,
      error: reason || 'Order could not be created',
    },
  });
  return {
    ...operationView(updated),
    ...(outcome.status === 402 ? { hint: 'Not enough credits. The user can recharge in Scan2Ship, then prepare the shipment again.' } : {}),
    // Only a charge that was actually refunded is reported as refunded
    ...(typeof outcome.body.creditRefunded === 'boolean'
      ? {
          creditsRefunded: outcome.body.creditRefunded,
          ...(outcome.body.creditRefunded
            ? {}
            : { creditNote: 'The credit could not be refunded automatically. The user should contact Scan2Ship support to have it returned.' }),
        }
      : {}),
  };
}

export async function getShipmentOperation(principal: McpPrincipal, operationId: string) {
  const operation = await findOwnOperation(principal, operationId);
  if (!operation) throw new McpToolError('not_found', 'Operation not found');
  return operationView(operation);
}
