'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedGet, authenticatedDelete } from '@/lib/api-client';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  orders?: Array<{
    id: number;
    name: string;
    mobile: string;
    courier_service: string;
    created_at: string;
  }>;
  _count?: {
    users: number;
    orders: number;
  };
}

export default function ViewClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState<string>('');

  // Get client ID from params
  useEffect(() => {
    const getClientId = async () => {
      const resolvedParams = await params;
      setClientId(resolvedParams.id);
    };
    getClientId();
  }, [params]);

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch client details
  useEffect(() => {
    if ((currentUser?.role === 'admin' || currentUser?.role === 'master_admin') && clientId) {
      console.log('🔍 [CLIENT_PAGE] Fetching client details for:', clientId);
      console.log('🔍 [CLIENT_PAGE] Current user role:', currentUser.role);
      fetchClientDetails();
    }
  }, [currentUser, clientId]);

  const fetchClientDetails = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 [CLIENT_PAGE] Starting fetchClientDetails');
      
      const response = await authenticatedGet(`/api/admin/clients/${clientId}`);
      console.log('🔍 [CLIENT_PAGE] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [CLIENT_PAGE] Client data received:', data);
        setClient(data.client);
      } else {
        const errorText = await response.text();
        console.error('🔍 [CLIENT_PAGE] Response not ok:', errorText);
        setError('Failed to fetch client details');
      }
    } catch (error) {
      console.error('🔍 [CLIENT_PAGE] Error fetching client details:', error);
      setError('Error fetching client details');
      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone and will delete all associated users and orders.')) {
      return;
    }

    try {
      const response = await authenticatedDelete(`/api/admin/clients/${clientId}`);

      if (response.ok) {
        router.push('/admin/clients');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      setError('Error deleting client');
      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        router.push('/login');
      }
    }
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
    router.push('/');
    return null;
  }

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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading client details...</span>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || 'Client not found'}</p>
          <Link href="/admin/clients" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
            ← Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{client.companyName}</h1>
            <p className="text-gray-600 mt-1 text-lg">Client Details</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 ml-6">
            <Link
              href={`/admin/clients/${client.id}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center whitespace-nowrap"
            >
              Edit Client
            </Link>
            <button
              onClick={handleDeleteClient}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-center whitespace-nowrap"
            >
              Delete Client
            </button>
            <Link
              href="/admin/clients"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-center whitespace-nowrap"
            >
              Back to Clients
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-2">Client Information</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <p className="text-sm text-gray-900 font-medium">{client.companyName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <p className="text-sm text-gray-900 font-medium">{client.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-sm text-gray-900 font-medium">{client.email}</p>
            </div>
            {client.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-sm text-gray-900 font-medium">{client.phone}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="mt-1">{getStatusBadge(client.isActive)}</div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-2">Address Information</h2>
          <div className="space-y-5">
            {client.address && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-sm text-gray-900 font-medium leading-relaxed">{client.address}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <p className="text-sm text-gray-900 font-medium">{client.city || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <p className="text-sm text-gray-900 font-medium">{client.state || 'Not specified'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <p className="text-sm text-gray-900 font-medium">{client.country}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                <p className="text-sm text-gray-900 font-medium">{client.pincode || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-2">Subscription Details</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
              <div className="mt-1">{getSubscriptionBadge(client.subscriptionStatus)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <p className="text-sm text-gray-900 font-medium capitalize">{client.subscriptionPlan}</p>
            </div>
            {client.subscriptionExpiresAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                <p className="text-sm text-gray-900 font-medium">
                  {new Date(client.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-2">Statistics</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{client._count?.users || 0}</div>
                <div className="text-sm text-gray-600">Users</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{client._count?.orders || 0}</div>
                <div className="text-sm text-gray-600">Orders</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{client.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(client.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {client.users && client.users.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Users ({client.users.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {client.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.isActive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {client.orders && client.orders.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders ({client.orders.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {client.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.name} ({order.mobile})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {order.courier_service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
