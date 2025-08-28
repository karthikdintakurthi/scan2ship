'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getClientBranding } from '@/lib/pwa-config';

export default function TestPWAPage() {
  const { currentUser, currentClient } = useAuth();
  const branding = getClientBranding(currentClient);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">PWA Configuration Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current User Info */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current User</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-mono text-gray-800">
                  {currentUser?.name || 'Not logged in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-mono text-gray-800">
                  {currentUser?.role || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-mono text-gray-800">
                  {currentUser?.email || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Client Info */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Client</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Company:</span>
                <span className="font-mono text-gray-800">
                  {currentClient?.companyName || 'No client'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contact:</span>
                <span className="font-mono text-gray-800">
                  {currentClient?.name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-mono text-gray-800">
                  {currentClient?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* PWA Branding */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">PWA Branding</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">App Name:</span>
                <span className="font-mono text-gray-800">
                  {branding.shortName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Full Name:</span>
                <span className="font-mono text-gray-800">
                  {branding.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Theme Color:</span>
                <span className="font-mono text-gray-800">
                  {branding.themeColor}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Background:</span>
                <span className="font-mono text-gray-800">
                  {branding.backgroundColor}
                </span>
              </div>
            </div>
          </div>

          {/* PWA Assets */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">PWA Assets</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Logo:</p>
                <img 
                  src={branding.logo} 
                  alt={branding.shortName}
                  className="w-16 h-16 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Description:</p>
                <p className="text-sm text-gray-800">{branding.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PWA Manifest Info */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">PWA Manifest</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Manifest URL:</span>
              <span className="font-mono text-gray-800">
                /api/pwa/manifest?client={currentClient?.id || 'default'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Document Title:</span>
              <span className="font-mono text-gray-800">
                {document.title}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Favicon:</span>
              <span className="font-mono text-gray-800">
                {branding.logo}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Test PWA Branding:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Log in with different client accounts to see branding changes</li>
            <li>Check the browser tab title and favicon</li>
            <li>Install the app as a PWA to see client-specific branding</li>
            <li>View the manifest at the generated URL</li>
            <li>Check that the service worker caches the correct assets</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
