'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedFetch } from '@/lib/api-client';

interface ClientAnalytics {
  openaiImageCount: number;
  openaiAddressCount: number;
  createOrderCount: number;
  orderPatterns: {
    manual: number;
    text_ai: number;
    image_ai: number;
  };
}

interface Client {
  id: string;
  name: string;
  companyName: string;
  _count: {
    orders: number;
  };
}

export default function ClientAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Unwrap the params Promise
  const resolvedParams = use(params);

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch client analytics data
  useEffect(() => {
    const fetchClientAnalytics = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const response = await fetch(`/api/analytics/clients/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.analytics);
          
          // Fetch client details
          const clientResponse = await fetch(`/api/admin/clients/${params.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (clientResponse.ok) {
            const clientData = await clientResponse.json();
            setClient(clientData.client);
          }
        }
      } catch (error) {
        console.error('Failed to fetch client analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      fetchClientAnalytics();
    }
  }, [currentUser, resolvedParams.id]);

  // Show loading if checking authentication
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin or master admin
  if (currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {client?.companyName || 'Client'} Analytics
            </h1>
            <p className="text-gray-600 mt-2">Detailed analytics and usage statistics</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/admin/analytics"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Analytics
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading client analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Client Overview */}
          {client && (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Company Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Company:</span> {client.companyName}</p>
                    <p><span className="font-medium">Contact:</span> {client.name}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Order Summary</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Total Orders:</span> {client._count.orders}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Usage Analytics */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">API Usage Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-blue-900">OpenAI Image Processing</h3>
                    <p className="text-3xl font-bold text-blue-600">{analytics?.openaiImageCount || 0}</p>
                    <p className="text-sm text-blue-600">Total API calls</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-green-900">OpenAI Address Processing</h3>
                    <p className="text-3xl font-bold text-green-600">{analytics?.openaiAddressCount || 0}</p>
                    <p className="text-sm text-green-600">Total API calls</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-purple-900">Orders Created</h3>
                    <p className="text-3xl font-bold text-purple-600">{analytics?.createOrderCount || 0}</p>
                    <p className="text-sm text-purple-600">Total orders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Creation Patterns */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Creation Patterns</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-orange-900">Manual Orders</h3>
                    <p className="text-3xl font-bold text-orange-600">{analytics?.orderPatterns.manual || 0}</p>
                    <p className="text-sm text-orange-600">Manually entered</p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-indigo-900">Text AI Orders</h3>
                    <p className="text-3xl font-bold text-indigo-600">{analytics?.orderPatterns.text_ai || 0}</p>
                    <p className="text-sm text-indigo-600">Address processed</p>
                  </div>
                </div>
              </div>

              <div className="bg-pink-50 p-6 rounded-lg border border-pink-200">
                <div className="flex items-center">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-pink-900">Image AI Orders</h3>
                    <p className="text-3xl font-bold text-pink-600">{analytics?.orderPatterns.image_ai || 0}</p>
                    <p className="text-sm text-pink-600">Image processed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pattern Explanation */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Order Creation Pattern Definitions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-orange-700 mb-1">Manual Orders</h4>
                  <p className="text-gray-600">User manually enters all address fields and creates order successfully</p>
                </div>
                <div>
                  <h4 className="font-medium text-indigo-700 mb-1">Text AI Orders</h4>
                  <p className="text-gray-600">User pastes text in address detail field, processes with AI, then creates order</p>
                </div>
                <div>
                  <h4 className="font-medium text-pink-700 mb-1">Image AI Orders</h4>
                  <p className="text-gray-600">User uploads image, processes with AI, then creates order successfully</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
