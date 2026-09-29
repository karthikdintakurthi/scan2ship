import { NextRequest, NextResponse } from 'next/server';
import {
  BYPASS_COOKIE,
  BYPASS_PARAM,
  bypassSecret,
  decideMaintenance,
  maintenanceApiBody,
  MODE_HEADER,
  readMaintenance,
  retryAfterSeconds,
  sha256Hex,
} from '@/lib/maintenance';

const BYPASS_MAX_AGE_SECONDS = 12 * 60 * 60;

/**
 * Maintenance mode for the whole site; see src/lib/maintenance.ts. Visiting
 * any URL with ?maintenance_bypass=<MAINTENANCE_BYPASS_SECRET> sets a cookie
 * that lets that browser use the site normally (to check a deploy);
 * ?maintenance_bypass=off removes it.
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const secret = bypassSecret();

  const bypassParam = url.searchParams.get(BYPASS_PARAM);
  if (bypassParam !== null) {
    const clean = url.clone();
    clean.searchParams.delete(BYPASS_PARAM);
    const redirect = NextResponse.redirect(clean);
    if (bypassParam === 'off') {
      redirect.cookies.delete(BYPASS_COOKIE);
    } else if (secret && bypassParam === secret) {
      redirect.cookies.set(BYPASS_COOKIE, await sha256Hex(secret), {
        httpOnly: true,
        secure: url.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
        maxAge: BYPASS_MAX_AGE_SECONDS,
      });
    }
    return redirect;
  }

  const state = await readMaintenance();
  if (state.mode === 'off') {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(BYPASS_COOKIE)?.value;
  const bypass = Boolean(secret && cookie && cookie === (await sha256Hex(secret)));
  const decision = decideMaintenance({ pathname: url.pathname, method: request.method, state, bypass });

  const retryAfter = String(retryAfterSeconds(state));
  const unavailable = { 'Retry-After': retryAfter, 'Cache-Control': 'no-store' };

  if (decision.action === 'api') {
    return NextResponse.json(maintenanceApiBody(state), { status: 503, headers: unavailable });
  }
  if (decision.action === 'page') {
    // Redirect (not rewrite) so the app treats it as the public /maintenance page;
    // it returns the user to `from` once maintenance ends
    const target = new URL('/maintenance', request.url);
    target.searchParams.set('from', `${url.pathname}${url.search}`);
    return NextResponse.redirect(target, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (url.pathname === '/maintenance' && state.mode === 'full' && !bypass) {
    // Serve the maintenance page itself as 503 so monitors see the outage
    return NextResponse.rewrite(url, { status: 503, headers: unavailable });
  }

  // Let the request through, telling route handlers (e.g. MCP) the current mode
  const headers = new Headers(request.headers);
  headers.set(MODE_HEADER, bypass ? 'off' : state.mode);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's static files and images
  matcher: ['/((?!_next/static|_next/image).*)'],
};
