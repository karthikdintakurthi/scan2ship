'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function LoginAsClientPage() {
  const { currentUser, switchToClient } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch clients
  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'master_admin') {
      fetchClients();
    }
  }, [currentUser]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
      } else {
        setError('Failed to fetch clients');
      }
    } catch (error) {
      setError('Error fetching clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToClient = async (clientId: string) => {
    try {
      setIsSwitching(true);
      setError('');

      // Get client details to find an admin user
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const client = data.client;
        
        // Find admin user for this client
        const adminUser = client.users?.find((user: any) => user.role === 'admin');
        
        if (adminUser) {
          // Switch to client view
          await switchToClient(clientId, adminUser.id);
          router.push('/orders'); // Redirect to orders page
        } else {
          setError('No admin user found for this client');
        }
      } else {
        setError('Failed to get client details');
      }
    } catch (error) {
      setError('Error switching to client');
    } finally {
      setIsSwitching(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Inactive
      </span>
    );
  };

  const getSubscriptionBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Login as Client</h1>
            <p className="text-gray-600 mt-2">Select a client to switch to their view and access their data</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading clients...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div key={client.id} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{client.companyName}</h3>
                  <p className="text-sm text-gray-600">{client.name}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {getStatusBadge(client.isActive)}
                  {getSubscriptionBadge(client.subscriptionStatus)}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{client.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Users:</span>
                  <span className="text-gray-900">{client._count.users}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Orders:</span>
                  <span className="text-gray-900">{client._count.orders}</span>
                </div>
              </div>

              <button
                onClick={() => handleSwitchToClient(client.id)}
                disabled={isSwitching || !client.isActive}
                className={`w-full px-4 py-2 rounded-md text-white transition-colors ${
                  client.isActive 
                    ? 'bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isSwitching ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Switching...
                  </div>
                ) : (
                  client.isActive ? 'Switch to Client' : 'Client Inactive'
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && clients.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Clients Found</h3>
          <p className="text-gray-600 mb-4">There are no clients registered in the system.</p>
          <Link
            href="/admin/register-client"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Register First Client
          </Link>
        </div>
      )}
    </div>
  );
}
