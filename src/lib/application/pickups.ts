import { prisma } from '@/lib/prisma';
import type { AuthenticatedUser } from '@/lib/auth-middleware';

const DELHIVERY_PICKUP_URL = 'https://track.delhivery.com/fm/request/new/';

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

    try {
      const response = await fetch(DELHIVERY_PICKUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${location.delhiveryApiKey}` },
        body: JSON.stringify({
          pickup_time: input.pickupTime,
          pickup_date: input.pickupDate,
          pickup_location: location.value,
          expected_package_count: expectedPackageCount,
        }),
      });

      let result: DelhiveryPickupResponse;
      try {
        const parsed: unknown = await response.json();
        // Delhivery occasionally answers with a bare string
        result = typeof parsed === 'string' ? { message: parsed } : ((parsed ?? {}) as DelhiveryPickupResponse);
      } catch {
        result = { error: 'Invalid JSON response from Delhivery API' };
      }

      // Success is either success: true, or 201 with a pickup_id and no error
      const succeeded =
        response.ok && (result.success === true || (response.status === 201 && result.pickup_id && !result.error));

      if (!succeeded) {
        errors.push({
          pickup_location: location.label,
          error: delhiveryErrorMessage(result),
          status: 'failed',
          delhivery_status: response.status,
        });
        continue;
      }

      const delhiveryRequestId = result.request_id || (result.pickup_id ? String(result.pickup_id) : null);
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
      console.error(`❌ [PICKUP_REQUEST] Delhivery call failed for ${location.label}:`, error instanceof Error ? error.message : String(error));
      errors.push({
        pickup_location: location.label,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed',
      });
    }
  }

  return { ok: true, results, errors };
}
