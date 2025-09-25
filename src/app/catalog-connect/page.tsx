'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CatalogAuth from '@/components/CatalogAuth';
import { useAuth } from '@/contexts/AuthContext';

export default function CatalogConnectPage() {
  const router = useRouter();
  const { currentClient } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  const handleConnectionSuccess = () => {
    setIsConnected(true);
    // Redirect to main orders page after successful connection
    setTimeout(() => {
      router.push('/orders');
    }, 2000);
  };

  if (!currentClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Catalog Connect</h1>
              <p className="text-gray-600 mt-2">
                Connect to your product catalog for seamless order management
              </p>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Back to Orders
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {isConnected ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Successfully Connected!</h3>
              <p className="text-gray-600 mb-4">
                You are now connected to your product catalog. You can now select products when creating orders.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to orders page...
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to Product Catalog</h3>
                <p className="text-gray-600">
                  Connect to your product catalog to enable product selection and inventory management in your orders.
                </p>
              </div>
              
              <CatalogAuth
                onSuccess={handleConnectionSuccess}
                onError={(error) => console.error('Catalog connection error:', error)}
              />
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Benefits of Catalog Connection
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Select products directly from your catalog when creating orders</li>
                  <li>Automatic inventory updates when orders are placed</li>
                  <li>Real-time product information and pricing</li>
                  <li>Seamless integration between order management and inventory</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
