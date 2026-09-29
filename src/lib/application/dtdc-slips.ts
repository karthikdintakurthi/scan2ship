import { prisma } from '@/lib/prisma';

/**
 * DTDC tracking numbers ("slips") that a tenant buys in advance and stores in
 * client_config as comma-separated lists: `<courier>_slips_unused` and
 * `<courier>_slips_used`, per DTDC variant. The website's order form fills in
 * the first unused number; these helpers do the same on the server, moving a
 * number from unused to used only if nobody changed the lists in between.
 */
const DTDC_COURIERS = ['dtdc', 'dtdc_cod', 'dtdc_plus'] as const;
const MAX_ATTEMPTS = 5;

export function isDtdcCourier(code: string): boolean {
  return (DTDC_COURIERS as readonly string[]).includes(code.trim().toLowerCase());
}

function parseList(value: string | null | undefined): string[] {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function formatList(items: string[]): string {
  return items.join(', ');
}

async function readSlips(clientId: string, courier: string) {
  const prefix = `${courier.toLowerCase()}_slips_`;
  const rows = await prisma.client_config.findMany({
    where: { clientId, key: { in: [`${prefix}unused`, `${prefix}used`] } },
    select: { key: true, value: true },
  });
  const unusedRow = rows.find((row) => row.key === `${prefix}unused`);
  const usedRow = rows.find((row) => row.key === `${prefix}used`);
  return { prefix, unusedRow, usedRow };
}

/** The number the next DTDC order would get, without taking it. */
export async function peekNextDtdcSlip(clientId: string, courier: string): Promise<string | null> {
  const { unusedRow } = await readSlips(clientId, courier);
  return parseList(unusedRow?.value)[0] ?? null;
}

/**
 * Moves a slip from unused to used and returns it: the given number if it is
 * in the unused list, otherwise (when none is given) the first unused number.
 * Returns null when there is nothing to claim. Retries if the lists change
 * concurrently, so two orders never get the same number.
 */
export async function claimDtdcSlip(clientId: string, courier: string, specific?: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { prefix, unusedRow, usedRow } = await readSlips(clientId, courier);
    if (!unusedRow) return null;

    const unused = parseList(unusedRow.value);
    const slip = specific ? unused.find((item) => item === specific) : unused[0];
    if (!slip) return null;

    const nextUnused = formatList(unused.filter((item) => item !== slip));
    const nextUsed = formatList([...parseList(usedRow?.value), slip]);

    const claimed = await prisma.$transaction(async (tx) => {
      // Conditional on the value we read: if another order changed it, retry
      const taken = await tx.client_config.updateMany({
        where: { clientId, key: `${prefix}unused`, value: unusedRow.value },
        data: { value: nextUnused, updatedAt: new Date() },
      });
      if (taken.count !== 1) return false;
      if (usedRow) {
        await tx.client_config.updateMany({
          where: { clientId, key: `${prefix}used` },
          data: { value: nextUsed, updatedAt: new Date() },
        });
      }
      return true;
    });
    if (claimed) return slip;
  }
  throw new Error('DTDC tracking numbers are being updated concurrently; please try again');
}

/** Puts a claimed slip back at the front of the unused list (the order was not created). */
export async function releaseDtdcSlip(clientId: string, courier: string, slip: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { prefix, unusedRow, usedRow } = await readSlips(clientId, courier);
    if (!unusedRow) return;
    const unused = parseList(unusedRow.value);
    if (unused.includes(slip)) return;

    const released = await prisma.$transaction(async (tx) => {
      const restored = await tx.client_config.updateMany({
        where: { clientId, key: `${prefix}unused`, value: unusedRow.value },
        data: { value: formatList([slip, ...unused]), updatedAt: new Date() },
      });
      if (restored.count !== 1) return false;
      if (usedRow) {
        await tx.client_config.updateMany({
          where: { clientId, key: `${prefix}used` },
          data: { value: formatList(parseList(usedRow.value).filter((item) => item !== slip)), updatedAt: new Date() },
        });
      }
      return true;
    });
    if (released) return;
  }
  console.error('❌ [DTDC_SLIPS] Could not return slip to the unused list; add it back in Settings:', slip);
}

export type ListedSlipClaim = 'claimed' | 'already_used' | 'not_listed';

/**
 * For a DTDC number the user supplied: move it to used if it is one of the
 * account's unused numbers ('claimed'); report 'already_used' if another order
 * has it (including one that took it a moment ago); otherwise 'not_listed' (a
 * number from outside the lists, accepted as is).
 */
export async function claimListedDtdcSlip(clientId: string, courier: string, slip: string): Promise<ListedSlipClaim> {
  const { unusedRow, usedRow } = await readSlips(clientId, courier);
  if (parseList(unusedRow?.value).includes(slip)) {
    if ((await claimDtdcSlip(clientId, courier, slip)) === slip) return 'claimed';
    // Lost a race for this number: it is now used by the other order
    const again = await readSlips(clientId, courier);
    return parseList(again.usedRow?.value).includes(slip) ? 'already_used' : 'not_listed';
  }
  return parseList(usedRow?.value).includes(slip) ? 'already_used' : 'not_listed';
}
