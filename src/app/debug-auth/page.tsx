'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugAuthPage() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get token from localStorage
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('authToken');
      setToken(storedToken);
    }
  }, []);

  const testAuthEndpoint = async () => {
    try {
      setError(null);
      setTestResult(null);

      if (!token) {
        setError('No token found in localStorage');
        return;
      }

      console.log('🧪 Testing auth endpoint with token:', token.substring(0, 20) + '...');

      const response = await fetch('/api/test-auth', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setTestResult({
          status: response.status,
          success: true,
          data
        });
      } else {
        setTestResult({
          status: response.status,
          success: false,
          error: data
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const testAdminCreditsEndpoint = async () => {
    try {
      setError(null);
      setTestResult(null);

      if (!token) {
        setError('No token found in localStorage');
        return;
      }

      console.log('🧪 Testing admin credits endpoint with token:', token.substring(0, 20) + '...');

      const response = await fetch('/api/admin/credits', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setTestResult({
          status: response.status,
          success: true,
          data: {
            clientsCount: data.data?.clients?.length || 0,
            summary: data.data?.summary
          }
        });
      } else {
        setTestResult({
          status: response.status,
          success: false,
          error: data
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const clearToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      setToken(null);
      setTestResult(null);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔍 Authentication Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Authentication Status */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Is Loading:</span>
                <span className={`font-mono ${isLoading ? 'text-yellow-600' : 'text-gray-800'}`}>
                  {isLoading ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Is Authenticated:</span>
                <span className={`font-mono ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current User:</span>
                <span className="font-mono text-gray-800">
                  {currentUser ? `${currentUser.name} (${currentUser.role})` : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Token Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Token Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Token Present:</span>
                <span className={`font-mono ${token ? 'text-green-600' : 'text-red-600'}`}>
                  {token ? 'Yes' : 'No'}
                </span>
              </div>
              {token && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Token Length:</span>
                    <span className="font-mono text-gray-800">{token.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Token Preview:</span>
                    <span className="font-mono text-gray-800 text-xs">
                      {token.substring(0, 20)}...
                    </span>
                  </div>
                </>
              )}
            </div>
            {token && (
              <button
                onClick={clearToken}
                className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Clear Token
              </button>
            )}
          </div>
        </div>

        {/* Test Buttons */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Endpoints</h2>
          <div className="flex space-x-4">
            <button
              onClick={testAuthEndpoint}
              disabled={!token}
              className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test /api/test-auth
            </button>
            <button
              onClick={testAdminCreditsEndpoint}
              disabled={!token}
              className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test /api/admin/credits
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Results</h2>
            <div className="bg-gray-100 p-4 rounded-md">
              <pre className="text-sm text-gray-800 overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Debugging Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Check if you're logged in and authenticated</li>
            <li>Verify the token is stored in localStorage</li>
            <li>Test the basic auth endpoint first</li>
            <li>Then test the admin credits endpoint</li>
            <li>Check the browser console for additional logs</li>
            <li>Verify the token format and expiration</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
