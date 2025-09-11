'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  isActive: boolean;
}

export default function CronAdminPage() {
  const { currentUser } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState(true);

  // Fetch clients for master admin
  useEffect(() => {
    const fetchClients = async () => {
      if (currentUser?.role === 'master_admin') {
        try {
          const response = await fetch('/api/admin/clients', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            setClients(data.clients || []);
          } else {
            console.error('Failed to fetch clients');
          }
        } catch (error) {
          console.error('Error fetching clients:', error);
        } finally {
          setLoadingClients(false);
        }
      } else {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [currentUser]);

  // Check if user is admin or master_admin
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'master_admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin or master admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const runTestTracking = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/cron/test-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to run test tracking');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const runFullTracking = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/cron/update-tracking-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'default-cron-secret'}`,
        },
        body: JSON.stringify({ triggerType: 'manual' })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to run full tracking update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const runClientTracking = async () => {
    if (!selectedClientId) {
      setError('Please select a client');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/cron/update-tracking-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'default-cron-secret'}`,
        },
        body: JSON.stringify({ 
          clientId: selectedClientId,
          triggerType: 'manual'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to run client tracking update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Cron Job Management</h1>
          
          <div className="space-y-6">
            {/* Master Admin Client Selection */}
            {currentUser?.role === 'master_admin' && (
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Client-Specific Tracking Update</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select a specific client to run tracking updates for their orders only.
                </p>
                
                {loadingClients ? (
                  <div className="text-sm text-gray-500">Loading clients...</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Client
                      </label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Choose a client...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.companyName} ({client.name}) - {client.isActive ? 'Active' : 'Inactive'}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={runClientTracking}
                      disabled={isRunning || !selectedClientId}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRunning ? 'Running...' : 'Run Client Tracking Update'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Test Tracking Button */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Test Tracking Update</h2>
              <p className="text-sm text-gray-600 mb-4">
                Test the tracking update with a limited number of orders (5 orders max).
              </p>
              <button
                onClick={runTestTracking}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running...' : 'Run Test Tracking'}
              </button>
            </div>

            {/* Full Tracking Button */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Full Tracking Update</h2>
              <p className="text-sm text-gray-600 mb-4">
                Run the full tracking update for all non-delivered orders. This is the same as the hourly cron job.
              </p>
              <button
                onClick={runFullTracking}
                disabled={isRunning}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running...' : 'Run Full Tracking Update'}
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Results</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Status:</span> {result.success ? 'Success' : 'Failed'}</div>
                  <div><span className="font-medium">Message:</span> {result.message}</div>
                  {result.stats && (
                    <div className="mt-3">
                      <div className="font-medium text-gray-900">Statistics:</div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>Total Processed: {result.stats.totalProcessed}</div>
                        <div>Total Updated: {result.stats.totalUpdated}</div>
                        <div>Total Errors: {result.stats.totalErrors}</div>
                        <div>Timestamp: {new Date(result.stats.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Setup Instructions</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. Set the <code className="bg-blue-100 px-1 rounded">CRON_SECRET</code> environment variable</p>
                <p>2. Configure your cron job to call: <code className="bg-blue-100 px-1 rounded">POST /api/cron/update-tracking-optimized</code></p>
                <p>3. Schedule: <code className="bg-blue-100 px-1 rounded">0 * * * *</code> (every 1 hour)</p>
                <p>4. Include Authorization header: <code className="bg-blue-100 px-1 rounded">Bearer YOUR_CRON_SECRET</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
