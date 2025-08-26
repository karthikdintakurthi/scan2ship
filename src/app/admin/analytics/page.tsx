'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PlatformAnalytics {
  openaiImageCount: number;
  openaiAddressCount: number;
  createOrderCount: number;
}

interface ClientAnalytics {
  id: string;
  name: string;
  companyName: string;
  _count: {
    orders: number;
  };
  analytics: {
    openaiImageCount: number;
    openaiAddressCount: number;
    createOrderCount: number;
    orderPatterns: {
      manual: number;
      text_ai: number;
      image_ai: number;
    };
  };
}

export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null);
  const [clients, setClients] = useState<ClientAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [platformResponse, clientsResponse] = await Promise.all([
          fetch('/api/analytics/platform'),
          fetch('/api/analytics/clients')
        ]);

        if (platformResponse.ok) {
          const platformData = await platformResponse.json();
          setPlatformAnalytics(platformData.analytics);
        }

        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.clients);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      fetchAnalytics();
    }
  }, [currentUser]);

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
            <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-600 mt-2">Monitor platform performance and usage statistics</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Platform Analytics */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Platform Overview</h2>
            
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
                    <p className="text-3xl font-bold text-blue-600">{platformAnalytics?.openaiImageCount || 0}</p>
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
                    <p className="text-3xl font-bold text-green-600">{platformAnalytics?.openaiAddressCount || 0}</p>
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
                    <p className="text-3xl font-bold text-purple-600">{platformAnalytics?.createOrderCount || 0}</p>
                    <p className="text-sm text-purple-600">Total orders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clients List */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Client Analytics</h2>
            
            {clients.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No clients found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/admin/analytics/clients/${client.id}`}
                    className="block bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">{client.companyName}</h3>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Orders:</span>
                        <span className="font-semibold">{client._count.orders}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Image AI Orders:</span>
                        <span className="font-semibold">{client.analytics.orderPatterns.image_ai}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Text AI Orders:</span>
                        <span className="font-semibold">{client.analytics.orderPatterns.text_ai}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Manual Orders:</span>
                        <span className="font-semibold">{client.analytics.orderPatterns.manual}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Click to view detailed analytics</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
