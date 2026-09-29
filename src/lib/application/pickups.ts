import { prisma } from '@/lib/prisma';
import type { AuthenticatedUser } from '@/lib/auth-middleware';

const DELHIVERY_PICKUP_URL = 'https://track.delhivery.com/fm/request/new/';
const DELHIVERY_PICKUP_TIMEOUT_MS = 20_000;

export type PickupRequestInput = {
  pickupDate: string;
  pickupTime: string;
  expectedPackageCount: number;
  /** pickup_locations.value for each location to book */
  locations: string[];
};

export type PickupLocationSuccess = {
  pickup_location: string;
  pickup_request_id: string;
  delhivery_request_id: string | null;
  status: 'success';
};

export type PickupLocationFailure = {
  pickup_location: string;
  error: string;
  status: 'failed';
  delhivery_status?: number;
  /**
   * 'unknown' when Delhivery may have scheduled the pickup (no clear answer, or
   * accepted but not recorded here): check with Delhivery before requesting again.
   */
  outcome?: 'unknown';
  /** Delhivery's ID when it accepted the pickup but Scan2Ship could not record it. */
  delhivery_request_id?: string | null;
};

export type PickupRequestResult =
  | { ok: true; results: PickupLocationSuccess[]; errors: PickupLocationFailure[] }
  | { ok: false; status: 400; body: Record<string, unknown> };

/** The fields Delhivery's pickup API may return, in its various success and error shapes. */
type DelhiveryPickupResponse = {
  success?: boolean;
  pickup_id?: string | number;
  request_id?: string;
  prepaid?: string;
  error?: string | { message?: string } | unknown;
  data?: { message?: string };
  message?: string;
};

/** Turns Delhivery's varied error shapes into one message. */
function delhiveryErrorMessage(result: DelhiveryPickupResponse): string {
  let message = 'Unknown error from Delhivery API';
  if (result.prepaid) {
    message = `Wallet balance issue: ${result.prepaid}`;
  } else if (result.error) {
    const nested = typeof result.error === 'object' ? (result.error as { message?: string }).message : undefined;
    if (nested) message = nested;
    else if (typeof result.error === 'string') message = result.error;
    else message = JSON.stringify(result.error);
  } else if (result.data && result.data.message) {
    // Duplicate pickup requests report data.message
    message = result.data.message;
  } else if (result.message) {
    message = result.message;
  }
  if (result.pickup_id) {
    message += ` (Pickup ID: ${result.pickup_id})`;
  }
  return message;
}

/**
 * Asks Delhivery to collect packages from each of the tenant's chosen pickup
 * locations and records each scheduled pickup. Locations are handled one by
 * one, so some can succeed while others fail. Pickups do not use credits.
 * Shared by the website and MCP; the caller authorizes the user.
 */
export async function requestPickups(user: AuthenticatedUser, input: PickupRequestInput): Promise<PickupRequestResult> {
  if (input.locations.length === 0) {
    return { ok: false, status: 400, body: { error: 'Please select at least one pickup location' } };
  }

  const pickupLocations = await prisma.pickup_locations.findMany({
    where: { clientId: user.clientId, value: { in: input.locations } },
    select: { value: true, label: true, delhiveryApiKey: true },
  });
  if (pickupLocations.length === 0) {
    return { ok: false, status: 400, body: { error: 'Selected pickup locations not found or invalid' } };
  }

  const results: PickupLocationSuccess[] = [];
  const errors: PickupLocationFailure[] = [];
  const expectedPackageCount = input.expectedPackageCount || 1;

  for (const location of pickupLocations) {
    if (!location.delhiveryApiKey) {
      errors.push({
        pickup_location: location.label,
        error: 'No Delhivery API key is configured for this pickup location',
        status: 'failed',
      });
      continue;
    }

    const unknown = (error: string, extra: Partial<PickupLocationFailure> = {}) =>
      errors.push({ pickup_location: location.label, error, status: 'failed', outcome: 'unknown', ...extra });

    let response: Response;
    try {
      response = await fetch(DELHIVERY_PICKUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${location.delhiveryApiKey}` },
        body: JSON.stringify({
          pickup_time: input.pickupTime,
          pickup_date: input.pickupDate,
          pickup_location: location.value,
          expected_package_count: expectedPackageCount,
        }),
        signal: AbortSignal.timeout(DELHIVERY_PICKUP_TIMEOUT_MS),
      });
    } catch (error) {
      // The request may have reached Delhivery before the connection failed
      console.error(`❌ [PICKUP_REQUEST] Delhivery call failed for ${location.label}:`, error instanceof Error ? error.message : String(error));
      unknown(`Delhivery did not answer (${error instanceof Error ? error.message : 'unknown error'}); the pickup may or may not have been requested`);
      continue;
    }

    let result: DelhiveryPickupResponse | null;
    try {
      const parsed: unknown = await response.json();
      // Delhivery occasionally answers with a bare string
      result = typeof parsed === 'string' ? { message: parsed } : ((parsed ?? {}) as DelhiveryPickupResponse);
    } catch {
      result = null;
    }

    if (response.status >= 500 || (response.ok && !result)) {
      unknown(`Delhivery answered unclearly (HTTP ${response.status}); the pickup may or may not have been requested`, {
        delhivery_status: response.status,
      });
      continue;
    }
    const reply = result ?? { error: 'Invalid JSON response from Delhivery API' };

    // Success is either success: true, or 201 with a pickup_id and no error
    const succeeded = response.ok && (reply.success === true || (response.status === 201 && reply.pickup_id && !reply.error));
    if (!succeeded) {
      errors.push({
        pickup_location: location.label,
        error: delhiveryErrorMessage(reply),
        status: 'failed',
        delhivery_status: response.status,
      });
      continue;
    }

    const delhiveryRequestId = reply.request_id || (reply.pickup_id ? String(reply.pickup_id) : null);
    try {
      const saved = await prisma.pickup_requests.create({
        data: {
          id: `pickup-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          clientId: user.clientId,
          userId: user.id,
          pickup_date: input.pickupDate,
          pickup_time: input.pickupTime,
          pickup_address: '',
          contact_person: '',
          contact_phone: '',
          special_instructions: '',
          pickup_location: location.value,
          expected_package_count: expectedPackageCount,
          delhivery_request_id: delhiveryRequestId,
          status: 'scheduled',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      results.push({
        pickup_location: location.label,
        pickup_request_id: saved.id,
        delhivery_request_id: delhiveryRequestId,
        status: 'success',
      });
    } catch (error) {
      // Delhivery has the pickup; only our record of it is missing
      console.error(`❌ [PICKUP_REQUEST] Delhivery accepted pickup ${delhiveryRequestId} for ${location.label} but it could not be saved:`, error);
      unknown(`Delhivery accepted the pickup${delhiveryRequestId ? ` (ID ${delhiveryRequestId})` : ''} but Scan2Ship could not record it`, {
        delhivery_request_id: delhiveryRequestId,
      });
    }
  }

  return { ok: true, results, errors };
}
