'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useClientSide } from '@/hooks/useClientSide';

export default function TestSSRPage() {
  const { isClient, isHydrated } = useClientSide();
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">SSR Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client-side detection */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Client-Side Detection</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Is Client:</span>
                <span className={`font-mono ${isClient ? 'text-green-600' : 'text-red-600'}`}>
                  {isClient ? 'true' : 'false'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Is Hydrated:</span>
                <span className={`font-mono ${isHydrated ? 'text-green-600' : 'text-red-600'}`}>
                  {isHydrated ? 'true' : 'false'}
                </span>
              </div>
            </div>
          </div>

          {/* Authentication state */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication State</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Is Loading:</span>
                <span className={`font-mono ${auth.isLoading ? 'text-yellow-600' : 'text-green-600'}`}>
                  {auth.isLoading ? 'true' : 'false'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Is Authenticated:</span>
                <span className={`font-mono ${auth.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                  {auth.isAuthenticated ? 'true' : 'false'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User:</span>
                <span className="font-mono text-gray-800">
                  {auth.currentUser ? auth.currentUser.name : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Browser API test */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Browser API Test</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Window Object:</span>
                <span className={`font-mono ${typeof window !== 'undefined' ? 'text-green-600' : 'text-red-600'}`}>
                  {typeof window !== 'undefined' ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">LocalStorage:</span>
                <span className={`font-mono ${typeof localStorage !== 'undefined' ? 'text-green-600' : 'text-red-600'}`}>
                  {typeof localStorage !== 'undefined' ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>
          </div>

          {/* SSR Status */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">SSR Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Rendering:</span>
                <span className="font-mono text-blue-600">
                  {isClient ? (isHydrated ? 'Client Hydrated' : 'Client Hydrating') : 'Server Side'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-mono ${
                  !isClient ? 'text-blue-600' : 
                  !isHydrated ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {!isClient ? 'SSR' : !isHydrated ? 'Hydrating' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Test SSR:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>View this page source (right-click → View Page Source) to verify server-side rendering</li>
            <li>Check that no authentication errors appear in the console during initial load</li>
            <li>Verify that the page hydrates properly without breaking authentication</li>
            <li>Test navigation between pages to ensure routing works correctly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
