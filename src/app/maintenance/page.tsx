'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Status = { mode: 'off' | 'read_only' | 'full'; message: string | null; until: string | null };

const POLL_MS = 60_000;

/** Only same-site paths, so `from` cannot send users to another site. */
function safeReturnPath(from: string | null): string {
  return from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/maintenance') ? from : '/';
}

function formatUntil(until: string | null): string | null {
  if (!until) return null;
  const date = new Date(until);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
}

function MaintenanceInner() {
  const params = useSearchParams();
  const returnTo = safeReturnPath(params.get('from'));
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch('/api/maintenance/status', { cache: 'no-store' });
        const next = (await response.json()) as Status;
        if (cancelled) return;
        setStatus(next);
        // Maintenance is over: take the user back to where they were
        if (next.mode !== 'full' && params.get('from')) {
          window.location.replace(returnTo);
        }
      } catch {
        // Keep showing the page; try again on the next tick
      }
    };
    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [params, returnTo]);

  const running = status && status.mode !== 'full';
  const until = formatUntil(status?.until ?? null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow p-8 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          {running ? 'Scan2Ship is available' : 'Scan2Ship is down for maintenance'}
        </h1>
        <p className="text-gray-700">
          {running
            ? 'Maintenance is not in progress.'
            : status?.message || "We're making improvements and will be back shortly."}
        </p>
        {!running && until && <p className="text-sm text-gray-600">Expected back by {until}.</p>}
        {!running && (
          <p className="text-xs text-gray-500">This page checks every minute and will return you to Scan2Ship when it is back.</p>
        )}
        {running && (
          <a href={returnTo} className="inline-block bg-blue-600 text-white rounded-md px-4 py-2 text-sm">
            Continue to Scan2Ship
          </a>
        )}
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={null}>
      <MaintenanceInner />
    </Suspense>
  );
}
