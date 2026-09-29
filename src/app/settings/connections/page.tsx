'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Connection = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export default function ConnectionsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const response = await fetch('/api/mcp/connections', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Unable to load connections');
    setConnections(body.connections);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/settings/connections');
      return;
    }
    load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load connections'));
  }, [isAuthenticated, isLoading, load, router]);

  const revoke = async (id: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/mcp/connections?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Revoke failed');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading || !isAuthenticated) {
    return <p className="p-8 text-gray-600">Loading…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">AI connections</h1>
      <p className="mt-2 text-sm text-gray-600">
        Assistants you have connected to this Scan2Ship tenant. Revoking a connection denies the next tool call.
        The MCP URL is <code className="bg-gray-100 px-1">{typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp'}</code>.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 space-y-3">
        {connections.length === 0 && <p className="text-sm text-gray-500">No connections yet.</p>}
        {connections.map((connection) => (
          <div key={connection.id} className="border rounded-md p-4 bg-white flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">{connection.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Scopes: {connection.scopes.join(', ') || 'none'}
              </p>
              <p className="text-xs text-gray-500">
                Created {new Date(connection.createdAt).toLocaleString()}
                {connection.lastUsedAt ? ` · Last used ${new Date(connection.lastUsedAt).toLocaleString()}` : ''}
                {connection.revokedAt ? ' · Revoked' : ''}
              </p>
            </div>
            {!connection.revokedAt && (
              <button
                type="button"
                onClick={() => revoke(connection.id)}
                disabled={busyId === connection.id}
                className="text-sm text-red-700 border border-red-200 rounded px-3 py-1 disabled:opacity-50"
              >
                {busyId === connection.id ? 'Revoking…' : 'Revoke'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
