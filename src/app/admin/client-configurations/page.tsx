'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedGet } from '@/lib/api-client';

interface ClientConfig {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string | null;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PickupLocation {
  id: string;
  value: string;
  label: string;
  delhiveryApiKey: string | null;
}

interface CourierService {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
}

interface ClientOrderConfig {
  id: string;
  defaultPackageValue: number;
  defaultProductDescription: string;
  defaultCodAmount: number | null;
  codEnabledByDefault: boolean;
  minPackageValue: number;
  maxPackageValue: number;
  minWeight: number;
  maxWeight: number;
  minTotalItems: number;
  maxTotalItems: number;
  requireProductDescription: boolean;
  requirePackageValue: boolean;
  requireWeight: boolean;
  requireTotalItems: boolean;
  enableResellerFallback: boolean;
}

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
  _count: {
    users: number;
    orders: number;
  };
  // Configurations
  clientConfigs: ClientConfig[];
  pickupLocations: PickupLocation[];
  courierServices: CourierService[];
  clientOrderConfig: ClientOrderConfig | null;
}

export default function ClientConfigurationsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch client configurations
  useEffect(() => {
    const fetchClientConfigs = async () => {
      try {
        setIsLoading(true);
        const response = await authenticatedGet('/api/admin/client-configurations');
        
        if (response.ok) {
          const data = await response.json();
          setClients(data.clients);
        } else {
          setError('Failed to fetch client configurations');
        }
      } catch (error) {
        setError('Error fetching client configurations');
        // Handle authentication errors
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      fetchClientConfigs();
    }
  }, [currentUser, router]);

  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && client.isActive) ||
      (statusFilter === 'inactive' && !client.isActive);

    return matchesSearch && matchesStatus;
  });

  const toggleClientExpansion = (clientId: string) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading client configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Configurations</h1>
            <p className="text-gray-600 mt-2">View and manage all client-specific configurations, settings, and details</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search clients by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Clients List */}
      <div className="space-y-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* Client Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">{client.companyName}</h3>
                    {getStatusBadge(client.isActive)}
                    {getSubscriptionBadge(client.subscriptionStatus)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Contact: {client.name} • {client.email} • {client.phone || 'No phone'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Location: {client.city || 'N/A'}, {client.state || 'N/A'}, {client.country}
                    {client.pincode && ` • ${client.pincode}`}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Plan: {client.subscriptionPlan} • Users: {client._count.users} • Orders: {client._count.orders}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleClientExpansion(client.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {expandedClient === client.id ? 'Hide Details' : 'Show Details'}
                  </button>
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    View Client
                  </Link>
                  <Link
                    href={`/admin/clients/${client.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>

            {/* Expanded Configuration Details */}
            {expandedClient === client.id && (
              <div className="px-6 py-4 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Client Configurations */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Client Configurations</h4>
                    {client.clientConfigs && client.clientConfigs.length > 0 ? (
                      <div className="space-y-2">
                        {client.clientConfigs.map((config) => (
                          <div key={config.id} className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{config.key}</p>
                                <p className="text-xs text-gray-600">{config.category}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {config.isEncrypted ? '🔒 Encrypted' : '📝 Plain text'}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500">{config.type}</span>
                            </div>
                            {config.description && (
                              <p className="text-xs text-gray-600 mt-2">{config.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No custom configurations</p>
                    )}
                  </div>

                  {/* Pickup Locations */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Pickup Locations</h4>
                    {client.pickupLocations && client.pickupLocations.length > 0 ? (
                      <div className="space-y-2">
                        {client.pickupLocations.map((location) => (
                          <div key={location.id} className="bg-white p-3 rounded border">
                            <p className="text-sm font-medium text-gray-900">{location.label}</p>
                            <p className="text-xs text-gray-600">Value: {location.value}</p>
                            {location.delhiveryApiKey && (
                              <p className="text-xs text-green-600">🔑 API Key configured</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No pickup locations</p>
                    )}
                  </div>

                  {/* Courier Services */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Courier Services</h4>
                    {client.courierServices && client.courierServices.length > 0 ? (
                      <div className="space-y-2">
                        {client.courierServices.map((service) => (
                          <div key={service.id} className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium text-gray-900">{service.label}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                service.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {service.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">Value: {service.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No courier services</p>
                    )}
                  </div>

                  {/* Order Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Order Configuration</h4>
                    {client.clientOrderConfig ? (
                      <div className="bg-white p-3 rounded border">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-600">Default Package Value:</p>
                            <p className="font-medium">₹{client.clientOrderConfig.defaultPackageValue}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Default COD Amount:</p>
                            <p className="font-medium">
                              {client.clientOrderConfig.defaultCodAmount ? `₹${client.clientOrderConfig.defaultCodAmount}` : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">COD Enabled:</p>
                            <p className="font-medium">
                              {client.clientOrderConfig.codEnabledByDefault ? 'Yes' : 'No'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Package Value Range:</p>
                            <p className="font-medium">
                              ₹{client.clientOrderConfig.minPackageValue} - ₹{client.clientOrderConfig.maxPackageValue}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Reseller Fallback:</p>
                            <p className="font-medium">
                              {client.clientOrderConfig.enableResellerFallback ? 'Enabled' : 'Disabled'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No order configuration</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredClients.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No clients found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
