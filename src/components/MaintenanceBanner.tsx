'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Status = { mode: 'off' | 'read_only' | 'full'; message: string | null; banner: string | null };

const REFRESH_MS = 5 * 60_000;

/**
 * Bottom bar for read-only maintenance or an advance maintenance notice, driven
 * by /api/maintenance/status. Hidden on the maintenance page itself.
 */
export default function MaintenanceBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/maintenance/status', { cache: 'no-store' });
        if (response.ok && !cancelled) setStatus(await response.json());
      } catch {
        // No banner if the status cannot be read
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!status || pathname === '/maintenance') return null;

  const text =
    status.mode === 'read_only'
      ? `Read-only maintenance: you can view everything, but changes are paused.${status.message ? ` ${status.message}` : ''}`
      : status.banner;
  if (!text || dismissed === text) return null;

  const tone = status.mode === 'read_only' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-50 text-blue-900 border-blue-200';
  return (
    <div role="status" className={`fixed bottom-0 inset-x-0 z-50 border-t px-4 py-2 text-sm flex items-center justify-center gap-3 ${tone}`}>
      <span>{text}</span>
      {status.mode !== 'read_only' && (
        <button type="button" onClick={() => setDismissed(text)} className="underline text-xs" aria-label="Dismiss notice">
          Dismiss
        </button>
      )}
    </div>
  );
}
