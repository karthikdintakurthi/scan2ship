import { NextResponse } from 'next/server';
import { readMaintenance } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance/status
 *
 * Public: the current maintenance mode, message, expected end, and any
 * advance-notice banner, for the maintenance page and the in-app banner.
 */
export async function GET() {
  const state = await readMaintenance();
  return NextResponse.json(
    { mode: state.mode, message: state.message, until: state.until, banner: state.banner },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
