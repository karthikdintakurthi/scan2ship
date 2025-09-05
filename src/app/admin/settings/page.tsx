'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/lib/api-client';

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

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  displayValue: string;
  type: string;
  category: string;
  description: string;
  isEncrypted: boolean;
}

interface ConfigCategory {
  [key: string]: SystemConfig[];
}

export default function SystemSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [configByCategory, setConfigByCategory] = useState<ConfigCategory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Configuration management state
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [courierServices, setCourierServices] = useState<any[]>([]);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [orderConfig, setOrderConfig] = useState<any>(null);
  
  // Courier service management state
  const [editingCourierService, setEditingCourierService] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [courierServiceForm, setCourierServiceForm] = useState({
    name: '',
    code: '',
    isActive: true,
    isDefault: false
  });

  // Pickup location management state
  const [editingPickupLocation, setEditingPickupLocation] = useState<any>(null);
  const [showPickupDeleteConfirm, setShowPickupDeleteConfirm] = useState<string | null>(null);
  const [pickupLocationForm, setPickupLocationForm] = useState({
    name: '',
    value: '',
    delhiveryApiKey: ''
  });

  // Order config management state
  const [editingOrderConfig, setEditingOrderConfig] = useState<any>(null);
  const [orderConfigForm, setOrderConfigForm] = useState({
    defaultProductDescription: '',
    defaultPackageValue: '',
    defaultWeight: '',
    defaultTotalItems: '',
    codEnabledByDefault: false,
    defaultCodAmount: '',
    minPackageValue: '',
    maxPackageValue: '',
    minWeight: '',
    maxWeight: '',
    minTotalItems: '',
    maxTotalItems: '',
    requireProductDescription: true,
    requirePackageValue: true,
    requireWeight: true,
    requireTotalItems: true,
    enableResellerFallback: true,
    enableThermalPrint: false,
    enableReferencePrefix: true
  });

  // Check if user is admin or master admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Only fetch clients for master admin
        if (currentUser.role === 'master_admin') {
          const clientsResponse = await authenticatedGet('/api/admin/clients');
          if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            setClients(clientsData.clients);
          }
        }

        // Only fetch system config for master admin
        if (currentUser.role === 'master_admin') {
          const configResponse = await authenticatedGet('/api/admin/system-config');
          if (configResponse.ok) {
            const configData = await configResponse.json();
            setConfigs(configData.configs);
            setConfigByCategory(configData.configByCategory);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Handle authentication errors
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      fetchData();
    }
  }, [currentUser, router]);

  // Load configuration data for client admin
  const loadConfigurationData = async (section: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
      switch (section) {
        case 'courier-services':
          const courierResponse = await authenticatedGet('/api/courier-services');
          if (courierResponse.ok) {
            const courierData = await courierResponse.json();
            setCourierServices(courierData.courierServices || []);
          }
          break;
        case 'pickup-locations':
          const pickupResponse = await authenticatedGet('/api/pickup-locations');
          if (pickupResponse.ok) {
            const pickupData = await pickupResponse.json();
            setPickupLocations(pickupData.pickupLocations || []);
          }
          break;
        case 'order-configs':
          const orderConfigResponse = await authenticatedGet('/api/order-config');
          if (orderConfigResponse.ok) {
            const orderConfigData = await orderConfigResponse.json();
            setOrderConfig(orderConfigData.orderConfig || {});
          }
          break;
      }
    } catch (error) {
      console.error(`Error loading ${section}:`, error);
      setError(`Failed to load ${section}`);
    }
  };

  // Handle section change
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    loadConfigurationData(section);
  };

  // Courier service management functions
  const handleEditCourierService = (service: any) => {
    setEditingCourierService(service);
    setCourierServiceForm({
      name: service.label,
      code: service.value,
      isActive: service.isActive,
      isDefault: service.isDefault
    });
  };

  const handleCancelCourierEdit = () => {
    setEditingCourierService(null);
    setCourierServiceForm({
      name: '',
      code: '',
      isActive: true,
      isDefault: false
    });
  };

  const handleSaveCourierService = async () => {
    try {
      const serviceData = {
        name: courierServiceForm.name,
        code: courierServiceForm.code,
        isActive: courierServiceForm.isActive,
        isDefault: courierServiceForm.isDefault
      };
      
      let response;
      if (editingCourierService) {
        // Update existing service
        response = await authenticatedPut(`/api/courier-services/${editingCourierService.id}`, serviceData);
      } else {
        // Create new service
        response = await authenticatedPost('/api/courier-services', serviceData);
      }

      if (response.ok) {
        setSuccess(editingCourierService ? 'Courier service updated successfully!' : 'Courier service created successfully!');
        handleCancelCourierEdit();
        loadConfigurationData('courier-services');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save courier service');
      }
    } catch (error) {
      console.error('Error saving courier service:', error);
      setError('Network error occurred');
    }
  };

  const handleDeleteCourierService = async (serviceId: string) => {
    try {
      const response = await authenticatedDelete(`/api/courier-services/${serviceId}`);
      
      if (response.ok) {
        setSuccess('Courier service deleted successfully!');
        setShowDeleteConfirm(null);
        loadConfigurationData('courier-services');
      } else {
        // Handle empty response body
        let errorMessage = 'Failed to delete courier service';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, use status text or default message
          errorMessage = response.statusText || errorMessage;
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting courier service:', error);
      setError('Network error occurred');
    }
  };

  const confirmDelete = (serviceId: string) => {
    setShowDeleteConfirm(serviceId);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Pickup location management functions
  const handleEditPickupLocation = (location: any) => {
    setEditingPickupLocation(location);
    setPickupLocationForm({
      name: location.label,
      value: location.value,
      delhiveryApiKey: location.delhiveryApiKey || ''
    });
  };

  const handleCancelPickupEdit = () => {
    setEditingPickupLocation(null);
    setPickupLocationForm({
      name: '',
      value: '',
      delhiveryApiKey: ''
    });
  };

  const handleSavePickupLocation = async () => {
    try {
      const locationData = {
        name: pickupLocationForm.name,
        value: pickupLocationForm.value,
        delhiveryApiKey: pickupLocationForm.delhiveryApiKey
      };
      
      let response;
      if (editingPickupLocation) {
        // Update existing location
        response = await authenticatedPut(`/api/pickup-locations/${editingPickupLocation.id}`, locationData);
      } else {
        // Create new location
        response = await authenticatedPost('/api/pickup-locations', locationData);
      }

      if (response.ok) {
        setSuccess(editingPickupLocation ? 'Pickup location updated successfully!' : 'Pickup location created successfully!');
        handleCancelPickupEdit();
        loadConfigurationData('pickup-locations');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save pickup location');
      }
    } catch (error) {
      console.error('Error saving pickup location:', error);
      setError('Network error occurred');
    }
  };

  const handleDeletePickupLocation = async (locationId: string) => {
    try {
      const response = await authenticatedDelete(`/api/pickup-locations/${locationId}`);
      
      if (response.ok) {
        setSuccess('Pickup location deleted successfully!');
        setShowPickupDeleteConfirm(null);
        loadConfigurationData('pickup-locations');
      } else {
        let errorMessage = 'Failed to delete pickup location';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = response.statusText || errorMessage;
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting pickup location:', error);
      setError('Network error occurred');
    }
  };

  const confirmPickupDelete = (locationId: string) => {
    setShowPickupDeleteConfirm(locationId);
  };

  const cancelPickupDelete = () => {
    setShowPickupDeleteConfirm(null);
  };

  // Order config management functions
  const handleEditOrderConfig = (config: any) => {
    setEditingOrderConfig(config);
    setOrderConfigForm({
      defaultProductDescription: config.defaultProductDescription || '',
      defaultPackageValue: config.defaultPackageValue?.toString() || '',
      defaultWeight: config.defaultWeight?.toString() || '',
      defaultTotalItems: config.defaultTotalItems?.toString() || '',
      codEnabledByDefault: config.codEnabledByDefault || false,
      defaultCodAmount: config.defaultCodAmount?.toString() || '',
      minPackageValue: config.minPackageValue?.toString() || '',
      maxPackageValue: config.maxPackageValue?.toString() || '',
      minWeight: config.minWeight?.toString() || '',
      maxWeight: config.maxWeight?.toString() || '',
      minTotalItems: config.minTotalItems?.toString() || '',
      maxTotalItems: config.maxTotalItems?.toString() || '',
      requireProductDescription: config.requireProductDescription !== false,
      requirePackageValue: config.requirePackageValue !== false,
      requireWeight: config.requireWeight !== false,
      requireTotalItems: config.requireTotalItems !== false,
      enableResellerFallback: config.enableResellerFallback !== false,
      enableThermalPrint: config.enableThermalPrint || false,
      enableReferencePrefix: config.enableReferencePrefix !== false
    });
  };

  const handleCancelOrderConfigEdit = () => {
    setEditingOrderConfig(null);
    setOrderConfigForm({
      defaultProductDescription: '',
      defaultPackageValue: '',
      defaultWeight: '',
      defaultTotalItems: '',
      codEnabledByDefault: false,
      defaultCodAmount: '',
      minPackageValue: '',
      maxPackageValue: '',
      minWeight: '',
      maxWeight: '',
      minTotalItems: '',
      maxTotalItems: '',
      requireProductDescription: true,
      requirePackageValue: true,
      requireWeight: true,
      requireTotalItems: true,
      enableResellerFallback: true,
      enableThermalPrint: false,
      enableReferencePrefix: true
    });
  };

  const handleSaveOrderConfig = async () => {
    try {
      const configData = {
        defaultProductDescription: orderConfigForm.defaultProductDescription,
        defaultPackageValue: parseFloat(orderConfigForm.defaultPackageValue) || 0,
        defaultWeight: parseFloat(orderConfigForm.defaultWeight) || 0,
        defaultTotalItems: parseInt(orderConfigForm.defaultTotalItems) || 0,
        codEnabledByDefault: orderConfigForm.codEnabledByDefault,
        defaultCodAmount: parseFloat(orderConfigForm.defaultCodAmount) || null,
        minPackageValue: parseFloat(orderConfigForm.minPackageValue) || 0,
        maxPackageValue: parseFloat(orderConfigForm.maxPackageValue) || 0,
        minWeight: parseFloat(orderConfigForm.minWeight) || 0,
        maxWeight: parseFloat(orderConfigForm.maxWeight) || 0,
        minTotalItems: parseInt(orderConfigForm.minTotalItems) || 0,
        maxTotalItems: parseInt(orderConfigForm.maxTotalItems) || 0,
        requireProductDescription: orderConfigForm.requireProductDescription,
        requirePackageValue: orderConfigForm.requirePackageValue,
        requireWeight: orderConfigForm.requireWeight,
        requireTotalItems: orderConfigForm.requireTotalItems,
        enableResellerFallback: orderConfigForm.enableResellerFallback,
        enableThermalPrint: orderConfigForm.enableThermalPrint,
        enableReferencePrefix: orderConfigForm.enableReferencePrefix
      };

      const response = await authenticatedPut('/api/order-config', { orderConfig: configData });

      if (response.ok) {
        setSuccess('Order configuration updated successfully!');
        handleCancelOrderConfigEdit();
        loadConfigurationData('order-configs');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save order configuration');
      }
    } catch (error) {
      console.error('Error saving order configuration:', error);
      setError('Network error occurred');
    }
  };

  // Update system config
  const updateSystemConfig = async (key: string, value: string) => {
    try {
      const response = await authenticatedPost('/api/admin/system-config', {
        key,
        value
      });

      if (response.ok) {
        // Refresh the configs
        const configResponse = await authenticatedGet('/api/admin/system-config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfigs(configData.configs);
        }
        setSuccess('Configuration updated successfully!');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      setError('Error updating configuration');
      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        router.push('/login');
      }
    }
  };

  const handleEditConfig = (config: SystemConfig) => {
    setEditingConfig(config.id);
    setEditValue(config.value);
  };

  const handleSaveConfig = async (configId: string) => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('authToken');
      
      const response = await authenticatedPost('/api/admin/system-config', {
        key: configId,
        value: editValue
      });

      if (response.ok) {
        setSuccess('Configuration updated successfully!');
        setEditingConfig(null);
        setEditValue('');
        // Refresh data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      setError('Error updating configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    setEditValue('');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'courier':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'ai':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );

      case 'security':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

      courier: 'Courier Service',
      ai: 'AI Services',

      security: 'Security',
      general: 'General Settings'
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentUser.role === 'master_admin' ? 'System Settings' : 'Client Settings'}
            </h1>
            <p className="text-gray-600 mt-2">
              {currentUser.role === 'master_admin' 
                ? 'Manage API keys, tokens, and client configurations'
                : 'Manage your client organization settings and user configurations'
              }
            </p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Admin
          </Link>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading settings...</span>
        </div>
      ) : currentUser.role === 'master_admin' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Configuration */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Configuration</h2>
              
              <div className="space-y-6">
                {Object.entries(configByCategory).map(([category, configs]) => (
                  <div key={category} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-4">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-medium text-gray-900 ml-2">
                        {getCategoryName(category)}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      {configs.map((config) => (
                        <div key={config.id} className="border border-gray-100 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {config.key}
                            </label>
                            {config.isEncrypted && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Encrypted
                              </span>
                            )}
                          </div>
                          
                          {config.description && (
                            <p className="text-xs text-gray-500 mb-2">{config.description}</p>
                          )}
                          
                          {editingConfig === config.id ? (
                            <div className="space-y-2">
                              <input
                                type={config.type === 'password' ? 'password' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Enter ${config.key.toLowerCase()}`}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSaveConfig(config.id)}
                                  disabled={isSaving}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={config.displayValue}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-600"
                                />
                              </div>
                              <button
                                onClick={() => handleEditConfig(config)}
                                className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Client Management */}
          <div className="space-y-6">
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

                {clients.length > 0 ? (
                  <div className="space-y-3">
                    {clients.slice(0, 5).map((client) => (
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
                    
                    {clients.length > 5 && (
                      <div className="text-center pt-2">
                        <Link
                          href="/admin/clients"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View {clients.length - 5} more clients →
                        </Link>
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
        </div>
      ) : (
        // Client Admin Settings
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Client Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                    {currentUser.clientId}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Role
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                    Client Admin
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                    {currentUser.name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Email
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                    {currentUser.email}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">User Management</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-600">Add, edit, and manage users in your client organization</p>
                </div>
                <Link
                  href="/admin/add-user"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Manage Users
                </Link>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Create Order</h3>
                  <p className="text-sm text-gray-600">Create new orders for any pickup location under your client</p>
                </div>
                <Link
                  href="/orders"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Create Order
                </Link>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">View Orders</h3>
                  <p className="text-sm text-gray-600">View and manage all orders from your client organization</p>
                </div>
                <Link
                  href="/admin/orders"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  View Orders
                </Link>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuration Management</h2>
            <div className="space-y-6">
              {/* Courier Services Management */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Courier Services</h3>
                      <p className="text-sm text-gray-600">Manage available courier services for your client</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSectionChange('courier-services')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>

              {/* Pickup Locations Management */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Pickup Locations</h3>
                      <p className="text-sm text-gray-600">Manage pickup locations and API keys</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSectionChange('pickup-locations')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>

              {/* Order Configurations Management */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Order Configurations</h3>
                      <p className="text-sm text-gray-600">Configure default values and validation rules</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSectionChange('order-configs')}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Management Components */}
          {activeSection && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {activeSection === 'courier-services' && 'Courier Services Management'}
                  {activeSection === 'pickup-locations' && 'Pickup Locations Management'}
                  {activeSection === 'order-configs' && 'Order Configurations Management'}
                </h2>
                <button
                  onClick={() => setActiveSection(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Courier Services Management */}
              {activeSection === 'courier-services' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Available Courier Services</h3>
                    <button 
                      onClick={() => handleEditCourierService(null)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add New Service
                    </button>
                  </div>

                  {/* Edit/Add Form */}
                  {editingCourierService !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-4">
                        {editingCourierService ? 'Edit Courier Service' : 'Add New Courier Service'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                          <input
                            type="text"
                            value={courierServiceForm.name}
                            onChange={(e) => setCourierServiceForm({...courierServiceForm, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter service name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Code</label>
                          <input
                            type="text"
                            value={courierServiceForm.code}
                            onChange={(e) => setCourierServiceForm({...courierServiceForm, code: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter service code"
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={courierServiceForm.isActive}
                            onChange={(e) => setCourierServiceForm({...courierServiceForm, isActive: e.target.checked})}
                            className="mr-2"
                          />
                          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isDefault"
                            checked={courierServiceForm.isDefault}
                            onChange={(e) => setCourierServiceForm({...courierServiceForm, isDefault: e.target.checked})}
                            className="mr-2"
                          />
                          <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Default Service</label>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <button
                          onClick={handleCancelCourierEdit}
                          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCourierService}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          {editingCourierService ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Services List */}
                  <div className="space-y-2">
                    {courierServices.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${service.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <div>
                            <div className="font-medium text-gray-900">{service.label}</div>
                            <div className="text-sm text-gray-600">Code: {service.value}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {service.isDefault && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Default</span>
                          )}
                          <button 
                            onClick={() => handleEditCourierService(service)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => confirmDelete(service.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delete Confirmation Modal */}
                  {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
                        <p className="text-gray-600 mb-6">
                          Are you sure you want to delete this courier service? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelDelete}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteCourierService(showDeleteConfirm)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pickup Locations Management */}
              {activeSection === 'pickup-locations' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Pickup Locations</h3>
                    <button 
                      onClick={() => handleEditPickupLocation(null)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Add New Location
                    </button>
                  </div>

                  {/* Edit/Add Form */}
                  {editingPickupLocation !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-4">
                        {editingPickupLocation ? 'Edit Pickup Location' : 'Add New Pickup Location'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                          <input
                            type="text"
                            value={pickupLocationForm.name}
                            onChange={(e) => setPickupLocationForm({...pickupLocationForm, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Enter location name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location Value</label>
                          <input
                            type="text"
                            value={pickupLocationForm.value}
                            onChange={(e) => setPickupLocationForm({...pickupLocationForm, value: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Enter location value"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Delhivery API Key (Optional)</label>
                          <input
                            type="text"
                            value={pickupLocationForm.delhiveryApiKey}
                            onChange={(e) => setPickupLocationForm({...pickupLocationForm, delhiveryApiKey: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Enter Delhivery API key"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <button
                          onClick={handleCancelPickupEdit}
                          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSavePickupLocation}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          {editingPickupLocation ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Locations List */}
                  <div className="space-y-2">
                    {pickupLocations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{location.label}</div>
                          <div className="text-sm text-gray-600">Value: {location.value}</div>
                          {location.delhiveryApiKey && (
                            <div className="text-sm text-gray-500">API Key: {location.delhiveryApiKey.substring(0, 8)}...</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEditPickupLocation(location)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => confirmPickupDelete(location.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delete Confirmation Modal */}
                  {showPickupDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
                        <p className="text-gray-600 mb-6">
                          Are you sure you want to delete this pickup location? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelPickupDelete}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeletePickupLocation(showPickupDeleteConfirm)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Configurations Management */}
              {activeSection === 'order-configs' && orderConfig && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Order Configuration Settings</h3>
                    <button 
                      onClick={() => handleEditOrderConfig(orderConfig)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                    >
                      Edit Configuration
                    </button>
                  </div>

                  {/* Edit Form */}
                  {editingOrderConfig && (
                    <div className="bg-gray-50 p-6 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-4">Edit Order Configuration</h4>
                      
                      {/* Default Values */}
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-900 mb-3">Default Values</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Product Description</label>
                            <input
                              type="text"
                              value={orderConfigForm.defaultProductDescription}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, defaultProductDescription: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Package Value</label>
                            <input
                              type="number"
                              value={orderConfigForm.defaultPackageValue}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, defaultPackageValue: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Weight</label>
                            <input
                              type="number"
                              value={orderConfigForm.defaultWeight}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, defaultWeight: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Total Items</label>
                            <input
                              type="number"
                              value={orderConfigForm.defaultTotalItems}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, defaultTotalItems: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* COD Settings */}
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-900 mb-3">COD Settings</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.codEnabledByDefault}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, codEnabledByDefault: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">COD Enabled by Default</label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default COD Amount</label>
                            <input
                              type="number"
                              value={orderConfigForm.defaultCodAmount}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, defaultCodAmount: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Validation Rules */}
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-900 mb-3">Validation Rules</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Package Value</label>
                            <input
                              type="number"
                              value={orderConfigForm.minPackageValue}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, minPackageValue: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Package Value</label>
                            <input
                              type="number"
                              value={orderConfigForm.maxPackageValue}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, maxPackageValue: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Weight</label>
                            <input
                              type="number"
                              value={orderConfigForm.minWeight}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, minWeight: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Weight</label>
                            <input
                              type="number"
                              value={orderConfigForm.maxWeight}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, maxWeight: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Total Items</label>
                            <input
                              type="number"
                              value={orderConfigForm.minTotalItems}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, minTotalItems: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Total Items</label>
                            <input
                              type="number"
                              value={orderConfigForm.maxTotalItems}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, maxTotalItems: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Feature Toggles */}
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-900 mb-3">Feature Toggles</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.requireProductDescription}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, requireProductDescription: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">Require Product Description</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.requirePackageValue}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, requirePackageValue: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">Require Package Value</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.requireWeight}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, requireWeight: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">Require Weight</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.requireTotalItems}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, requireTotalItems: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">Require Total Items</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.enableResellerFallback}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, enableResellerFallback: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">Enable Reseller Fallback</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.enableThermalPrint}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, enableThermalPrint: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">Enable Thermal Print</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={orderConfigForm.enableReferencePrefix}
                              onChange={(e) => setOrderConfigForm({...orderConfigForm, enableReferencePrefix: e.target.checked})}
                              className="mr-2"
                            />
                            <label className="text-sm font-medium text-gray-700">Enable Reference Prefix</label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelOrderConfigEdit}
                          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveOrderConfig}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                          Save Configuration
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Read-only view when not editing */}
                  {!editingOrderConfig && (
                    <>
                      {/* Default Values */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Default Values</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Product Description</label>
                        <input
                          type="text"
                          value={orderConfig.defaultProductDescription || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Package Value</label>
                        <input
                          type="number"
                          value={orderConfig.defaultPackageValue || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Weight</label>
                        <input
                          type="number"
                          value={orderConfig.defaultWeight || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Total Items</label>
                        <input
                          type="number"
                          value={orderConfig.defaultTotalItems || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* COD Settings */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">COD Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={orderConfig.codEnabledByDefault || false}
                          className="mr-2"
                          readOnly
                        />
                        <label className="text-sm font-medium text-gray-700">COD Enabled by Default</label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default COD Amount</label>
                        <input
                          type="number"
                          value={orderConfig.defaultCodAmount || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Validation Rules */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Validation Rules</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Package Value</label>
                        <input
                          type="number"
                          value={orderConfig.minPackageValue || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Package Value</label>
                        <input
                          type="number"
                          value={orderConfig.maxPackageValue || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Weight</label>
                        <input
                          type="number"
                          value={orderConfig.minWeight || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Weight</label>
                        <input
                          type="number"
                          value={orderConfig.maxWeight || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
