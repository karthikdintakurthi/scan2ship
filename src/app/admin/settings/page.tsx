'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedGet } from '@/lib/api-client';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  isActive: boolean;
  subscriptionStatus: string;
  _count: {
    users: number;
    orders: number;
  };
}

/**
 * Admin settings: per-client configuration and admin shortcuts. Platform
 * settings (API keys, secrets, URLs) live in Vercel environment variables.
 */
export default function AdminSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllClients, setShowAllClients] = useState(false);

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const clientsResponse = await authenticatedGet('/api/admin/clients');
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      fetchClients();
    }
  }, [currentUser, router]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
            <p className="text-gray-600 mt-2">Client configurations and admin shortcuts</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading clients...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Client Management */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Management</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Manage client-specific configurations and settings
                </p>
                <Link
                  href="/admin/clients"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All Clients →
                </Link>
              </div>

              {clients && clients.length > 0 ? (
                <div className="space-y-3">
                  {(showAllClients ? clients : clients?.slice(0, 5))?.map((client) => (
                    <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{client.companyName}</h3>
                          <p className="text-sm text-gray-600">{client.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              client.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {client.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {client._count.users} users • {client._count.orders} orders
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/admin/settings/clients/${client.id}`}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Configure
                        </Link>
                      </div>
                    </div>
                  ))}
                  
                  {clients && clients.length > 5 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setShowAllClients(!showAllClients)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {showAllClients 
                          ? 'Show Less' 
                          : `View ${clients?.length - 5} more clients`
                        } {showAllClients ? '↑' : '↓'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Clients Found</h3>
                  <p className="text-sm text-gray-500 mb-3">No clients have been registered yet.</p>
                  <Link
                    href="/admin/register-client"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Register First Client
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/admin/register-client"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Register Client</h3>
                  <p className="text-sm text-gray-600">Add new client</p>
                </div>
              </Link>

              <Link
                href="/admin/add-user"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Add User</h3>
                  <p className="text-sm text-gray-600">Add user to client</p>
                </div>
              </Link>

              <Link
                href="/admin/clients"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View All Clients</h3>
                  <p className="text-sm text-gray-600">Manage clients</p>
                </div>
              </Link>

              <Link
                href="/admin/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-600">View reports</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
