'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  client: {
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
  };
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
  configs: ClientConfig[];
  configByCategory: Record<string, ClientConfig[]>;
}

export default function ClientSettingsPage() {
  const { currentUser, currentClient } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<ClientConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing states
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
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
    isActive: true
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // If user is admin, redirect to admin settings
    if (currentUser.role === 'admin') {
      router.push('/admin/settings');
      return;
    }

    // If no current client, redirect to home
    if (!currentClient) {
      router.push('/');
      return;
    }
  }, [currentUser, currentClient, router]);

  // Fetch client configuration
  useEffect(() => {
    if (currentUser && currentClient && currentUser.role !== 'admin') {
      fetchClientConfig();
    }
  }, [currentUser, currentClient]);

  const fetchClientConfig = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');
      
      console.log('🔍 [CLIENT_SETTINGS] Fetching client config for client ID:', currentClient?.id);
      console.log('🔍 [CLIENT_SETTINGS] Auth token:', token ? `${token.substring(0, 20)}...` : 'null');
      
      const response = await fetch(`/api/admin/settings/clients/${currentClient?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 [CLIENT_SETTINGS] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [CLIENT_SETTINGS] Response data:', data);
        setConfig(data.config);
      } else {
        const errorText = await response.text();
        console.error('❌ [CLIENT_SETTINGS] API error:', errorText);
        setError('Failed to fetch client configuration');
      }
    } catch (error) {
      console.error('❌ [CLIENT_SETTINGS] Fetch error:', error);
      setError('Error fetching client configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/settings/clients/${currentClient?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          configs: config.configs,
          pickupLocations: config.pickupLocations,
          courierServices: config.courierServices,
          clientOrderConfig: config.clientOrderConfig
        })
      });

      if (response.ok) {
        setSuccess('Settings saved successfully!');
        setEditingConfig(null);
        setEditValue('');
        setEditingPickupLocation(null);
        setEditingCourierService(null);
        setNewPickupLocation({ name: '', value: '', delhiveryApiKey: '' });
        setNewCourierService({ name: '', code: '', isActive: true });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setError('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      'delhivery': 'Delhivery Configuration',
      
      'general': 'General Configuration',
      'pickup': 'Pickup Configuration'
    };
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const maskValue = (value: string, isEncrypted: boolean) => {
    if (!isEncrypted || !value) return value;
    return value.length > 8 ? `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}` : '****';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">No configuration found</div>
          <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Client Settings</h1>
              <p className="text-gray-600 mt-1">
                {config.client.companyName} - {config.client.name}
              </p>
            </div>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Client Information */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Client Information</h2>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.client.companyName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.client.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.client.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.client.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Subscription Plan</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.client.subscriptionPlan}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    config.client.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {config.client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="space-y-8">
          {/* API Configuration */}
          {Object.entries(config.configByCategory).map(([category, configs]) => (
            <div key={category} className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">{getCategoryName(category)}</h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {configs.map((configItem) => (
                    <div key={configItem.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {configItem.description}
                        </label>
                        {editingConfig === configItem.id ? (
                          <div className="mt-1 flex items-center space-x-2">
                            <input
                              type={configItem.type === 'password' ? 'password' : 'text'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <button
                              onClick={() => {
                                const updatedConfigs = config.configs.map(c => 
                                  c.id === configItem.id ? { ...c, value: editValue } : c
                                );
                                setConfig({
                                  ...config,
                                  configs: updatedConfigs,
                                  configByCategory: {
                                    ...config.configByCategory,
                                    [category]: updatedConfigs.filter(c => c.category === category)
                                  }
                                });
                                setEditingConfig(null);
                                setEditValue('');
                              }}
                              className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingConfig(null);
                                setEditValue('');
                              }}
                              className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm text-gray-900 font-mono">
                              {maskValue(configItem.value, configItem.isEncrypted)}
                            </span>
                            <button
                              onClick={() => {
                                setEditingConfig(configItem.id);
                                setEditValue(configItem.value);
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Pickup Locations */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Pickup Locations</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {config.pickupLocations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{location.name}</h3>
                      <p className="text-sm text-gray-500">{location.value}</p>
                      {location.delhiveryApiKey && (
                        <p className="text-xs text-gray-400 mt-1">
                          API Key: {location.delhiveryApiKey}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        location.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Courier Services */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Courier Services</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {config.courierServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-500">Code: {service.code}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {service.isDefault && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        service.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Configuration */}
          {config.clientOrderConfig && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Order Configuration</h2>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Default Values</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-gray-500">Product Description</dt>
                        <dd className="text-sm text-gray-900">{config.clientOrderConfig.defaultProductDescription}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Package Value</dt>
                        <dd className="text-sm text-gray-900">₹{config.clientOrderConfig.defaultPackageValue}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Weight</dt>
                        <dd className="text-sm text-gray-900">{config.clientOrderConfig.defaultWeight}g</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Total Items</dt>
                        <dd className="text-sm text-gray-900">{config.clientOrderConfig.defaultTotalItems}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Validation Rules</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-gray-500">Package Value Range</dt>
                        <dd className="text-sm text-gray-900">₹{config.clientOrderConfig.minPackageValue} - ₹{config.clientOrderConfig.maxPackageValue}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Weight Range</dt>
                        <dd className="text-sm text-gray-900">{config.clientOrderConfig.minWeight}g - {config.clientOrderConfig.maxWeight}g</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Total Items Range</dt>
                        <dd className="text-sm text-gray-900">{config.clientOrderConfig.minTotalItems} - {config.clientOrderConfig.maxTotalItems}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
