import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { pickupAccessWhere } from '@/lib/application/policy';
import { requestPickups } from '@/lib/application/pickups';
import type { PreparePickupInput } from '@/lib/application/schemas';
import { findOwnOperation, operationView, PREVIEW_TTL_MS } from '@/lib/application/shipments';
import { areMcpWritesEnabled } from '@/lib/mcp/config';
import { newId, sha256Hex } from '@/lib/mcp/crypto';
import { McpToolError } from '@/lib/mcp/errors';
import type { McpPrincipal } from '@/lib/mcp/principal';

/** Pickups are requested in Indian time; Delhivery schedules them locally. */
const TIME_ZONE = 'Asia/Kolkata';
/** How far ahead a pickup may be requested. */
const MAX_DAYS_AHEAD = 14;

type PickupPayload = {
  pickupDate: string;
  pickupTime: string;
  expectedPackageCount: number;
  locations: string[];
};

/** Current date (YYYY-MM-DD) and time (HH:MM) in India. */
function nowInIndia(): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000);
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Validates a pickup request and saves a preview without contacting Delhivery.
 * The assistant must show it to the user and call schedulePickup only after
 * the user confirms. Pickups do not use credits.
 */
export async function preparePickup(principal: McpPrincipal, input: PreparePickupInput) {
  if (!areMcpWritesEnabled()) {
    throw new McpToolError('forbidden', 'Scheduling pickups through the assistant is turned off');
  }

  // Reject dates JavaScript would silently roll over (e.g. 2026-02-30 -> 2026-03-02)
  const parsedDate = new Date(`${input.pickupDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.pickupDate) {
    throw new McpToolError('invalid_params', `${input.pickupDate} is not a valid date`);
  }
  const now = nowInIndia();
  const daysAhead = daysBetween(now.date, input.pickupDate);
  const time = input.pickupTime.slice(0, 5);
  if (daysAhead < 0 || (daysAhead === 0 && time <= now.time)) {
    throw new McpToolError('invalid_params', `The pickup must be later than now (${now.date} ${now.time} IST)`);
  }
  if (daysAhead > MAX_DAYS_AHEAD) {
    throw new McpToolError('invalid_params', `Pickups can be requested up to ${MAX_DAYS_AHEAD} days ahead`);
  }

  // Only locations this user may use, and only those set up for Delhivery
  const permitted = await prisma.pickup_locations.findMany({
    where: await pickupAccessWhere(principal.user),
    select: { value: true, label: true, delhiveryApiKey: true },
  });
  const chosen = input.pickupLocations.map((requested) => {
    const match = permitted.find((row) => sameText(row.value, requested) || sameText(row.label, requested));
    if (!match) {
      throw new McpToolError(
        'invalid_params',
        `Pickup location "${requested}" is not available to you. Available: ${permitted.map((row) => row.label).join(', ') || 'none'}`
      );
    }
    if (!match.delhiveryApiKey) {
      throw new McpToolError('invalid_params', `${match.label} is not set up for Delhivery pickups (no API key in Settings)`);
    }
    return match;
  });
  const uniqueLocations = [...new Map(chosen.map((row) => [row.value, row])).values()];

  const payload: PickupPayload = {
    pickupDate: input.pickupDate,
    pickupTime: `${time}:00`,
    expectedPackageCount: input.expectedPackageCount,
    locations: uniqueLocations.map((row) => row.value),
  };
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const operation = await prisma.shipment_operations.create({
    data: {
      id: `pick_${newId()}`,
      tenantId: principal.tenantId,
      userId: principal.userId,
      grantId: principal.grantId,
      channel: 'mcp',
      type: 'pickup',
      status: 'previewed',
      payload: payload as Prisma.InputJsonValue,
      payloadHash: sha256Hex(JSON.stringify(payload)),
      creditCost: 0,
      expiresAt,
    },
  });

  return {
    previewId: operation.id,
    expiresAt: expiresAt.toISOString(),
    preview: {
      carrier: 'Delhivery',
      date: input.pickupDate,
      time: `${time} IST`,
      expectedPackageCount: input.expectedPackageCount,
      pickupLocations: uniqueLocations.map((row) => row.label),
      credits: 0,
    },
    nextStep:
      'Show this to the user. Call schedule_pickup with this previewId only after the user explicitly confirms; it asks Delhivery to send a pickup to each location.',
  };
}

/**
 * Books the pickups for a confirmed preview. Each preview books at most once:
 * repeated or concurrent calls return the first outcome.
 */
export async function schedulePickup(principal: McpPrincipal, previewId: string) {
  if (!areMcpWritesEnabled()) {
    throw new McpToolError('forbidden', 'Scheduling pickups through the assistant is turned off');
  }

  const claimed = await prisma.shipment_operations.updateMany({
    where: {
      id: previewId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      channel: 'mcp',
      type: 'pickup',
      status: 'previewed',
      expiresAt: { gt: new Date() },
    },
    data: { status: 'creating' },
  });
  if (claimed.count !== 1) {
    const existing = await findOwnOperation(principal, previewId);
    if (!existing || existing.type !== 'pickup') throw new McpToolError('not_found', 'Preview not found');
    return { ...operationView(existing), replayed: true };
  }

  const operation = await findOwnOperation(principal, previewId);
  if (!operation) throw new McpToolError('not_found', 'Preview not found');
  const payload = operation.payload as PickupPayload;

  let outcome: Awaited<ReturnType<typeof requestPickups>>;
  try {
    outcome = await requestPickups(principal.user, payload);
  } catch (error) {
    // Some pickups may have been requested before the failure
    const updated = await prisma.shipment_operations.update({
      where: { id: operation.id },
      data: { status: 'reconciliation_required', error: error instanceof Error ? error.message : String(error) },
    });
    return operationView(updated);
  }

  if (!outcome.ok) {
    const updated = await prisma.shipment_operations.update({
      where: { id: operation.id },
      data: { status: 'failed', error: String(outcome.body.error ?? 'Pickup could not be requested') },
    });
    return operationView(updated);
  }

  const scheduled = outcome.results.map((row) => ({
    pickupLocation: row.pickup_location,
    pickupRequestId: row.pickup_request_id,
    delhiveryRequestId: row.delhivery_request_id,
  }));
  const failed = outcome.errors.map((row) => ({ pickupLocation: row.pickup_location, error: row.error }));
  const status = failed.length === 0 ? 'succeeded' : scheduled.length > 0 ? 'partially_succeeded' : 'failed';

  const updated = await prisma.shipment_operations.update({
    where: { id: operation.id },
    data: {
      status,
      result: { date: payload.pickupDate, time: payload.pickupTime, scheduled, failed },
      error: failed.length > 0 ? failed.map((row) => `${row.pickupLocation}: ${row.error}`).join('; ') : null,
    },
  });
  return operationView(updated);
}
