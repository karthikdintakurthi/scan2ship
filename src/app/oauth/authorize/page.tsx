'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function safeAuthorizePath(search: string): string {
  return `/oauth/authorize${search.startsWith('?') ? search : `?${search}`}`;
}

function AuthorizeInner() {
  const { isAuthenticated, isLoading, currentUser, currentClient } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    clientName: string;
    tenantName: string;
    enabled: boolean;
    scopes: Array<{ id: string; description: string }>;
    optionalScopes?: Array<{ id: string; description: string }>;
  } | null>(null);
  const [optionalChosen, setOptionalChosen] = useState<string[]>([]);

  const query = useMemo(
    () => ({
      client_id: params.get('client_id') || '',
      redirect_uri: params.get('redirect_uri') || '',
      response_type: params.get('response_type') || '',
      code_challenge: params.get('code_challenge') || '',
      code_challenge_method: params.get('code_challenge_method') || 'S256',
      scope: params.get('scope') || '',
      state: params.get('state') || '',
      resource: params.get('resource') || '',
    }),
    [params]
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const returnTo = safeAuthorizePath(window.location.search);
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const url = new URL('/api/oauth/consent', window.location.origin);
    url.searchParams.set('client_id', query.client_id);
    url.searchParams.set('redirect_uri', query.redirect_uri);
    if (query.scope) url.searchParams.set('scope', query.scope);
    fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load consent');
        setPreview(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load consent'));
  }, [isAuthenticated, query.client_id, query.redirect_uri, query.scope]);

  const deny = () => {
    if (!query.redirect_uri.startsWith('https://') && !query.redirect_uri.startsWith('http://localhost') && !query.redirect_uri.startsWith('http://127.0.0.1')) {
      setError('Invalid redirect');
      return;
    }
    const target = new URL(query.redirect_uri);
    target.searchParams.set('error', 'access_denied');
    if (query.state) target.searchParams.set('state', query.state);
    window.location.replace(target.toString());
  };

  const approve = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/oauth/consent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...query, optional_scopes: optionalChosen }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Approval failed');
      window.location.replace(body.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
      setBusy(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return <p className="p-8 text-gray-600">Checking your session…</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white shadow rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Connect an AI assistant</h1>
        <p className="text-sm text-gray-600">
          {preview?.clientName || 'An assistant'} wants to read data for{' '}
          <strong>{preview?.tenantName || currentClient?.companyName || currentUser?.email}</strong>.
          Access stays inside this tenant. You can revoke it later in Settings → Connections.
        </p>
        {preview && !preview.enabled && (
          <p className="text-sm text-red-700">MCP is not enabled for this tenant yet.</p>
        )}
        <ul className="text-sm text-gray-800 list-disc pl-5 space-y-1">
          {(preview?.scopes || []).map((scope) => (
            <li key={scope.id}>
              <span className="font-medium">{scope.id}</span> — {scope.description}
            </li>
          ))}
        </ul>
        {(preview?.optionalScopes?.length ?? 0) > 0 && (
          <fieldset className="space-y-2 border-t pt-3">
            <legend className="text-sm font-medium text-gray-900">Optional access (off unless you tick it)</legend>
            {preview!.optionalScopes!.map((scope) => (
              <label key={scope.id} className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={optionalChosen.includes(scope.id)}
                  onChange={(event) =>
                    setOptionalChosen((current) =>
                      event.target.checked ? [...current, scope.id] : current.filter((id) => id !== scope.id)
                    )
                  }
                />
                <span>
                  <span className="font-medium">{scope.id}</span> — {scope.description}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={approve}
            disabled={busy || !preview?.enabled}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm disabled:opacity-50"
          >
            {busy ? 'Approving…' : 'Approve'}
          </button>
          <button type="button" onClick={deny} className="flex-1 border rounded-md py-2 text-sm">
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-600">Loading…</p>}>
      <AuthorizeInner />
    </Suspense>
  );
}
