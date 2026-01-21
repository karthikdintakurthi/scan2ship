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
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isActive: boolean;
  _count: {
    users: number;
    orders: number;
  };
}

interface PickupLocation {
  id: string;
  name: string;
  value: string;
  delhiveryApiKey: string | null;
  isActive: boolean;
}

interface CourierService {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isDefault: boolean;
}

interface ClientConfig {
  id: string;
  key: string;
  value: string;
  displayValue: string;
  type: string;
  category: string;
  description: string;
  isEncrypted: boolean;
}

interface ClientConfigData {
  client: Client;
  pickupLocations: PickupLocation[];
  courierServices: CourierService[];
  clientOrderConfig?: {
    // Default values
    defaultProductDescription: string;
    defaultPackageValue: number;
    defaultWeight: number;
    defaultTotalItems: number;
    
    // COD settings
    codEnabledByDefault: boolean;
    defaultCodAmount?: number;
    
    // Validation rules
    minPackageValue: number;
    maxPackageValue: number;
    minWeight: number;
    maxWeight: number;
    minTotalItems: number;
    maxTotalItems: number;
    
    // Field requirements
    requireProductDescription: boolean;
    requirePackageValue: boolean;
    requireWeight: boolean;
    requireTotalItems: boolean;
  };

  orderConfig: {
    autoAssignTracking: boolean;
    requireTrackingNumber: boolean;
    defaultCourierService: string;
  };
  configs: ClientConfig[];
  configByCategory: Record<string, ClientConfig[]>;
}

export default function ClientSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<ClientConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Helper function to update client order config efficiently
  const updateClientOrderConfig = (field: string, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      clientOrderConfig: {
        ...config.clientOrderConfig,
        [field]: value
      }
    });
  };
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientId, setClientId] = useState<string>('');

  // Editing states
  const [editingPickupLocation, setEditingPickupLocation] = useState<string | null>(null);
  const [editingCourierService, setEditingCourierService] = useState<string | null>(null);

  // New item states
  const [newPickupLocation, setNewPickupLocation] = useState({
    name: '',
    value: '',
    delhiveryApiKey: ''
  });
  const [newCourierService, setNewCourierService] = useState({
    name: '',
    code: '',
    isActive: true,
    isDefault: false
  });

  // Data for editing courier service
  const [editingCourierServiceData, setEditingCourierServiceData] = useState({
    name: '',
    code: '',
    isActive: true,
    isDefault: false
  });

  // Data for editing pickup location
  const [editingPickupLocationData, setEditingPickupLocationData] = useState({
    name: '',
    value: '',
    delhiveryApiKey: ''
  });

  // Individual section save states
  const [savingClientInfo, setSavingClientInfo] = useState(false);
  const [savingCourierServices, setSavingCourierServices] = useState(false);
  const [savingPickupLocations, setSavingPickupLocations] = useState(false);
  const [savingOrderConfig, setSavingOrderConfig] = useState(false);

  // Individual section success/error states
  const [clientInfoSuccess, setClientInfoSuccess] = useState('');
  const [clientInfoError, setClientInfoError] = useState('');
  const [courierServicesSuccess, setCourierServicesSuccess] = useState('');
  const [courierServicesError, setCourierServicesError] = useState('');
  const [pickupLocationsSuccess, setPickupLocationsSuccess] = useState('');
  const [pickupLocationsError, setPickupLocationsError] = useState('');
  const [orderConfigSuccess, setOrderConfigSuccess] = useState('');
  const [orderConfigError, setOrderConfigError] = useState('');

  // Individual section save functions
  const handleSaveClientInfo = async () => {
    if (!config) return;

    try {
      setSavingClientInfo(true);
      setClientInfoError('');
      setClientInfoSuccess('');

      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/settings/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client: config.client
        })
      });

      if (response.ok) {
        setClientInfoSuccess('Client information updated successfully!');
        setTimeout(() => setClientInfoSuccess(''), 3000);
        fetchClientConfig(); // Refresh data
      } else {
        const data = await response.json();
        setClientInfoError(data.error || 'Failed to update client information');
      }
    } catch (error) {
      setClientInfoError('Error updating client information');
    } finally {
      setSavingClientInfo(false);
    }
  };

  const handleSaveCourierServices = async () => {
    if (!config) return;

    try {
      setSavingCourierServices(true);
      setCourierServicesError('');
      setCourierServicesSuccess('');

      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/settings/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courierServices: config.courierServices
        })
      });

      if (response.ok) {
        setCourierServicesSuccess('Courier services updated successfully!');
        setTimeout(() => setCourierServicesSuccess(''), 3000);
        fetchClientConfig(); // Refresh data
      } else {
        const data = await response.json();
        setCourierServicesError(data.error || 'Failed to update courier services');
      }
    } catch (error) {
      setCourierServicesError('Error updating courier services');
    } finally {
      setSavingCourierServices(false);
    }
  };

  const handleSavePickupLocations = async () => {
    if (!config) return;

    try {
      setSavingPickupLocations(true);
      setPickupLocationsError('');
      setPickupLocationsSuccess('');

      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/settings/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickupLocations: config.pickupLocations
        })
      });

      if (response.ok) {
        setPickupLocationsSuccess('Pickup locations updated successfully!');
        setTimeout(() => setPickupLocationsSuccess(''), 3000);
        fetchClientConfig(); // Refresh data
      } else {
        const data = await response.json();
        setPickupLocationsError(data.error || 'Failed to update pickup locations');
      }
    } catch (error) {
      setPickupLocationsError('Error updating pickup locations');
    } finally {
      setSavingPickupLocations(false);
    }
  };

  const handleSaveOrderConfig = async () => {
    if (!config) return;

    try {
      setSavingOrderConfig(true);
      setOrderConfigError('');
      setOrderConfigSuccess('');

      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/admin/settings/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientOrderConfig: config.clientOrderConfig
        })
      });

      if (response.ok) {
        setOrderConfigSuccess('Order configuration updated successfully!');
        setTimeout(() => setOrderConfigSuccess(''), 3000);
        fetchClientConfig(); // Refresh data
      } else {
        let errorMessage = 'Failed to update order configuration';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error('❌ [ORDER_CONFIG_SAVE] Error response:', errorMessage);
        setOrderConfigError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating order configuration';
      console.error('❌ [ORDER_CONFIG_SAVE] Exception:', errorMessage);
      setOrderConfigError(errorMessage);
    } finally {
      setSavingOrderConfig(false);
    }
  };

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      // If user is not admin, redirect to client settings page
      router.push('/settings');
    }
  }, [currentUser, router]);

  // Get client ID from params
  useEffect(() => {
    const getClientId = async () => {
      const { id } = await params;
      setClientId(id);
    };
    getClientId();
  }, [params]);

  // Fetch client configuration
  useEffect(() => {
    if ((currentUser?.role === 'admin' || currentUser?.role === 'master_admin') && clientId) {
      fetchClientConfig();
    }
  }, [currentUser, clientId]);

  const fetchClientConfig = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');
      
      console.log('🔍 [ADMIN_CLIENT_SETTINGS] Fetching client config for client ID:', clientId);
      console.log('🔍 [ADMIN_CLIENT_SETTINGS] Auth token:', token ? `${token.substring(0, 20)}...` : 'null');
      
      const response = await fetch(`/api/admin/settings/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 [ADMIN_CLIENT_SETTINGS] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [ADMIN_CLIENT_SETTINGS] Response data:', data);
        setConfig(data.config);
      } else {
        const errorText = await response.text();
        console.error('❌ [ADMIN_CLIENT_SETTINGS] API error:', errorText);
        setError('Failed to fetch client configuration');
      }
    } catch (error) {
      console.error('❌ [ADMIN_CLIENT_SETTINGS] Fetch error:', error);
      setError('Error fetching client configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPickupLocation = () => {
    if (!config || !newPickupLocation.name || !newPickupLocation.value) return;

    const newLocation: PickupLocation = {
      id: `temp-${Date.now()}`,
      name: newPickupLocation.name,
      value: newPickupLocation.value,
      delhiveryApiKey: newPickupLocation.delhiveryApiKey || null,
      isActive: true
    };

    setConfig({
      ...config,
      pickupLocations: [...config.pickupLocations, newLocation]
    });

    setNewPickupLocation({ name: '', value: '', delhiveryApiKey: '' });
  };

  const handleRemovePickupLocation = (locationId: string) => {
    if (!config) return;

    setConfig({
      ...config,
      pickupLocations: config.pickupLocations.filter(l => l.id !== locationId)
    });
  };

  const handleAddCourierService = async () => {
    if (!config || !newCourierService.name || !newCourierService.code) return;

    const newService: CourierService = {
      id: `temp-${Date.now()}`,
      name: newCourierService.name,
      code: newCourierService.code,
      isActive: newCourierService.isActive,
      isDefault: newCourierService.isDefault
    };

    // If setting this as default, uncheck all existing services
    let updatedCourierServices;
    if (newCourierService.isDefault) {
      updatedCourierServices = config.courierServices.map(s => ({ ...s, isDefault: false }));
    } else {
      updatedCourierServices = config.courierServices;
    }

    const updatedConfig = {
      ...config,
      courierServices: [...updatedCourierServices, newService]
    };

    setConfig(updatedConfig);

    // Auto-save the configuration
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/settings/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        setSuccess('Courier service added successfully!');
        setTimeout(() => setSuccess(''), 3000);
        // Refresh data to get the actual IDs from the database
        fetchClientConfig();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save courier service');
      }
    } catch (error) {
      setError('Error saving courier service');
    }

    setNewCourierService({ name: '', code: '', isActive: true, isDefault: false });
  };

  const handleRemoveCourierService = (serviceId: string) => {
    if (!config) return;

    setConfig({
      ...config,
      courierServices: config.courierServices.filter(s => s.id !== serviceId)
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'courier':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'order':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'pickup':
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      courier: 'Courier Configuration',
      order: 'Order Configuration'
      // Removed pickup category since it's handled separately in Pickup Locations section
    };
    return names[category] || category;
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading client configuration...</span>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
            ← Back to System Settings
          </Link>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Client configuration not found</p>
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
            ← Back to System Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Settings</h1>
            <p className="text-gray-600 mt-2">{config.client.companyName} - Configuration Management</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/admin/settings"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Back to Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Client Information */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Client Information</h2>
              <button
                onClick={handleSaveClientInfo}
                disabled={savingClientInfo}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {savingClientInfo ? 'Saving...' : 'Save'}
              </button>
            </div>
            
            {/* Client Info Success/Error Messages */}
            {clientInfoSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{clientInfoSuccess}</p>
              </div>
            )}
            {clientInfoError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{clientInfoError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={config.client.companyName}
                  onChange={(e) => setConfig({
                    ...config,
                    client: { ...config.client, companyName: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={config.client.name}
                  onChange={(e) => setConfig({
                    ...config,
                    client: { ...config.client, name: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={config.client.email}
                  onChange={(e) => setConfig({
                    ...config,
                    client: { ...config.client, email: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={config.client.phone || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    client: { ...config.client, phone: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={config.client.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setConfig({
                    ...config,
                    client: { ...config.client, isActive: e.target.value === 'active' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>


        </div>

        {/* Courier Services & Delhivery Pickup Locations */}
        <div className="space-y-6">


          {/* Courier Services */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Courier Services</h2>
              <button
                onClick={handleSaveCourierServices}
                disabled={savingCourierServices}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {savingCourierServices ? 'Saving...' : 'Save'}
              </button>
            </div>
            
            {/* Courier Services Success/Error Messages */}
            {courierServicesSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{courierServicesSuccess}</p>
              </div>
            )}
            {courierServicesError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{courierServicesError}</p>
              </div>
            )}
            
            <div className="space-y-3">
              {config.courierServices.map((service) => (
                <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                  {editingCourierService === service.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Editing: {service.name}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Save changes
                              const updatedService = {
                                ...service,
                                name: editingCourierServiceData.name,
                                code: editingCourierServiceData.code,
                                isActive: editingCourierServiceData.isActive,
                                isDefault: editingCourierServiceData.isDefault
                              };
                              
                              // If setting this as default, uncheck all others
                              if (editingCourierServiceData.isDefault) {
                                setConfig({
                                  ...config,
                                  courierServices: config.courierServices.map(s => 
                                    s.id === service.id ? updatedService : { ...s, isDefault: false }
                                  )
                                });
                              } else {
                                setConfig({
                                  ...config,
                                  courierServices: config.courierServices.map(s => 
                                    s.id === service.id ? updatedService : s
                                  )
                                });
                              }
                              
                              setEditingCourierService(null);
                              setEditingCourierServiceData({ name: '', code: '', isActive: true, isDefault: false });
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCourierService(null);
                              setEditingCourierServiceData({ name: '', code: '', isActive: true, isDefault: false });
                            }}
                            className="text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Service Name"
                        value={editingCourierServiceData.name}
                        onChange={(e) => setEditingCourierServiceData({...editingCourierServiceData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Service Code"
                        value={editingCourierServiceData.code}
                        onChange={(e) => setEditingCourierServiceData({...editingCourierServiceData, code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editingCourierServiceData.isActive}
                            onChange={(e) => setEditingCourierServiceData({...editingCourierServiceData, isActive: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900">Active</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editingCourierServiceData.isDefault}
                            onChange={(e) => setEditingCourierServiceData({...editingCourierServiceData, isDefault: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900">Default</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600">Code: {service.code}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {service.isDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Default
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingCourierService(service.id);
                            setEditingCourierServiceData({
                              name: service.name,
                              code: service.code,
                              isActive: service.isActive,
                              isDefault: service.isDefault
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveCourierService(service.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  {editingCourierService !== service.id && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        service.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {config.courierServices.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No courier services configured
                </div>
              )}

              {/* Add new courier service */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-3">Add New Courier Service</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Service Name"
                    value={newCourierService.name}
                    onChange={(e) => setNewCourierService({...newCourierService, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Service Code"
                    value={newCourierService.code}
                    onChange={(e) => setNewCourierService({...newCourierService, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newCourierService.isActive}
                        onChange={(e) => setNewCourierService({...newCourierService, isActive: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Active</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newCourierService.isDefault}
                        onChange={(e) => {
                          // If setting this as default, uncheck all others
                          if (e.target.checked) {
                            setConfig({
                              ...config,
                              courierServices: config.courierServices.map(s => ({ ...s, isDefault: false }))
                            });
                          }
                          setNewCourierService({...newCourierService, isDefault: e.target.checked});
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Default</span>
                    </label>
                  </div>
                  <button
                    onClick={handleAddCourierService}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Add Service
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Delhivery Pickup Locations */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Delhivery Pickup Locations</h2>
              <button
                onClick={handleSavePickupLocations}
                disabled={savingPickupLocations}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {savingPickupLocations ? 'Saving...' : 'Save'}
              </button>
            </div>
            
            {/* Pickup Locations Success/Error Messages */}
            {pickupLocationsSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{pickupLocationsSuccess}</p>
              </div>
            )}
            {pickupLocationsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{pickupLocationsError}</p>
              </div>
            )}
            
            <div className="space-y-3">
              {config.pickupLocations.map((location) => (
                <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                  {editingPickupLocation === location.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Editing: {location.name}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Save changes
                              const updatedLocation = {
                                ...location,
                                name: editingPickupLocationData.name,
                                value: editingPickupLocationData.value,
                                delhiveryApiKey: editingPickupLocationData.delhiveryApiKey
                              };
                              
                              setConfig({
                                ...config,
                                pickupLocations: config.pickupLocations.map(l => 
                                  l.id === location.id ? updatedLocation : l
                                )
                              });
                              
                              setEditingPickupLocation(null);
                              setEditingPickupLocationData({ name: '', value: '', delhiveryApiKey: '' });
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingPickupLocation(null);
                              setEditingPickupLocationData({ name: '', value: '', delhiveryApiKey: '' });
                            }}
                            className="text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Location Name"
                        value={editingPickupLocationData.name}
                        onChange={(e) => setEditingPickupLocationData({...editingPickupLocationData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Location Value"
                        value={editingPickupLocationData.value}
                        onChange={(e) => setEditingPickupLocationData({...editingPickupLocationData, value: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="password"
                        placeholder="Delhivery API Key (optional)"
                        value={editingPickupLocationData.delhiveryApiKey}
                        onChange={(e) => setEditingPickupLocationData({...editingPickupLocationData, delhiveryApiKey: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{location.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">Value: {location.value}</p>
                        {location.delhiveryApiKey && (
                          <p className="text-sm text-gray-600">API Key: {location.delhiveryApiKey}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingPickupLocation(location.id);
                            setEditingPickupLocationData({
                              name: location.name,
                              value: location.value,
                              delhiveryApiKey: location.delhiveryApiKey || ''
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemovePickupLocation(location.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  {editingPickupLocation !== location.id && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        location.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              {config.pickupLocations.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No pickup locations configured
                </div>
              )}

              {/* Add new pickup location */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-3">Add New Pickup Location</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Location Name"
                    value={newPickupLocation.name}
                    onChange={(e) => setNewPickupLocation({...newPickupLocation, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Location Value"
                    value={newPickupLocation.value}
                    onChange={(e) => setNewPickupLocation({...newPickupLocation, value: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Delhivery API Key (optional)"
                    value={newPickupLocation.delhiveryApiKey}
                    onChange={(e) => setNewPickupLocation({...newPickupLocation, delhiveryApiKey: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddPickupLocation}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Add Location
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Order Configuration */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Order Configuration</h2>
              <button
                onClick={handleSaveOrderConfig}
                disabled={savingOrderConfig}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {savingOrderConfig ? 'Saving...' : 'Save'}
              </button>
            </div>
            
            {/* Order Config Success/Error Messages */}
            {orderConfigSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{orderConfigSuccess}</p>
              </div>
            )}
            {orderConfigError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{orderConfigError}</p>
              </div>
            )}
            
            {config.clientOrderConfig ? (
              <div className="space-y-6">
                {/* Default Values */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Default Values</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Product Description
                      </label>
                      <input
                        type="text"
                        value={config.clientOrderConfig?.defaultProductDescription || ''}
                        onChange={(e) => updateClientOrderConfig('defaultProductDescription', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Package Value (₹)
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.defaultPackageValue || 0}
                        onChange={(e) => updateClientOrderConfig('defaultPackageValue', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Weight (g)
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.defaultWeight || 0}
                        onChange={(e) => updateClientOrderConfig('defaultWeight', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Total Items
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.defaultTotalItems || 0}
                        onChange={(e) => updateClientOrderConfig('defaultTotalItems', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* COD Settings */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Cash on Delivery (COD) Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="codEnabled"
                        checked={config.clientOrderConfig?.codEnabledByDefault || false}
                        onChange={(e) => updateClientOrderConfig('codEnabledByDefault', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="codEnabled" className="ml-2 block text-sm text-gray-900">
                        Enable COD by Default
                      </label>
                    </div>
                    
                    {config.clientOrderConfig?.codEnabledByDefault && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default COD Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={config.clientOrderConfig?.defaultCodAmount || ''}
                          onChange={(e) => updateClientOrderConfig('defaultCodAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation Rules */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Validation Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Package Value (₹)
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.minPackageValue || 0}
                        onChange={(e) => updateClientOrderConfig('minPackageValue', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Package Value (₹)
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.maxPackageValue || 0}
                        onChange={(e) => updateClientOrderConfig('maxPackageValue', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Weight (g)
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.minWeight || 0}
                        onChange={(e) => updateClientOrderConfig('minWeight', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Weight (g)
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.maxWeight || 0}
                        onChange={(e) => updateClientOrderConfig('maxWeight', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Total Items
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.minTotalItems || 0}
                        onChange={(e) => updateClientOrderConfig('minTotalItems', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Total Items
                      </label>
                      <input
                        type="number"
                        value={config.clientOrderConfig?.maxTotalItems || 0}
                        onChange={(e) => updateClientOrderConfig('maxTotalItems', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Field Requirements */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Field Requirements</h3>
                  <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                        id="requireProductDescription"
                        checked={config.clientOrderConfig?.requireProductDescription || false}
                  onChange={(e) => updateClientOrderConfig('requireProductDescription', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                      <label htmlFor="requireProductDescription" className="ml-2 block text-sm text-gray-900">
                        Require Product Description
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                        id="requirePackageValue"
                        checked={config.clientOrderConfig?.requirePackageValue || false}
                  onChange={(e) => updateClientOrderConfig('requirePackageValue', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                      <label htmlFor="requirePackageValue" className="ml-2 block text-sm text-gray-900">
                        Require Package Value
                </label>
              </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireWeight"
                        checked={config.clientOrderConfig?.requireWeight || false}
                        onChange={(e) => updateClientOrderConfig('requireWeight', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="requireWeight" className="ml-2 block text-sm text-gray-900">
                        Require Weight
                </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireTotalItems"
                        checked={config.clientOrderConfig?.requireTotalItems || false}
                  onChange={(e) => updateClientOrderConfig('requireTotalItems', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="requireTotalItems" className="ml-2 block text-sm text-gray-900">
                        Require Total Items
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No order configuration found. This will be created automatically when needed.
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
