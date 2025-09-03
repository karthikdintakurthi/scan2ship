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
    
    // Reseller settings
    enableResellerFallback: boolean;
    
    // Thermal print settings
    enableThermalPrint: boolean;
  };
  dtdcSlips?: {
    from: string;
    to: string;
    unused: string;
    used: string;
    enabled?: boolean;
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

  // DTDC Slips state
  const [dtdcSlips, setDtdcSlips] = useState({
    from: '',
    to: '',
    unused: '',
    used: ''
  });
  const [dtdcSlipsEnabled, setDtdcSlipsEnabled] = useState(false);

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
      loadDtdcSlipsFromDatabase();
    }
  }, [currentUser, currentClient]);



  const fetchClientConfig = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');
      
      // For regular users, use the order-config endpoint instead of admin endpoint
      const response = await fetch('/api/order-config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Fetch pickup locations and courier services
        const [pickupResponse, courierResponse] = await Promise.all([
          fetch('/api/pickup-locations', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/courier-services', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const pickupData = pickupResponse.ok ? await pickupResponse.json() : { pickupLocations: [] };
        const courierData = courierResponse.ok ? await courierResponse.json() : { courierServices: [] };

        // Transform the data to match the expected format
        const transformedConfig = {
          client: {
            id: currentClient?.id || '',
            name: currentClient?.name || '',
            companyName: currentClient?.companyName || '',
            email: currentClient?.email || '',
            phone: currentClient?.phone || '',
            address: currentClient?.address || '',
            city: currentClient?.city || '',
            state: currentClient?.state || '',
            country: currentClient?.country || '',
            pincode: currentClient?.pincode || '',
            subscriptionPlan: 'basic',
            subscriptionStatus: 'active',
            isActive: true
          },
          pickupLocations: pickupData.pickupLocations || [],
          courierServices: (courierData.courierServices || []).map((service: any) => ({
            id: service.id,
            name: service.label, // API returns 'label', interface expects 'name'
            code: service.value, // API returns 'value', interface expects 'code'
            isActive: service.isActive,
            isDefault: service.isDefault
          })),
          clientOrderConfig: data.orderConfig,
          configs: [],
          configByCategory: {}
        };
        
        setConfig(transformedConfig);
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

  // Function to load DTDC slips from database
  const loadDtdcSlipsFromDatabase = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/dtdc-slips', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dtdcSlips) {
          setDtdcSlips(data.dtdcSlips);
          setDtdcSlipsEnabled(data.dtdcSlips.enabled);
          console.log('🔍 [DTDC_SLIPS] Loaded from database:', data.dtdcSlips);
        }
      } else {
        console.error('❌ [DTDC_SLIPS] Failed to load from database:', response.status);
      }
    } catch (error) {
      console.error('❌ [DTDC_SLIPS] Error loading from database:', error);
    }
  };

  // Function to process DTDC slips range and calculate totals
  const processDtdcSlipsRange = () => {
    console.log('🚀 [PROCESS_DTDC_RANGE] Starting process for:', { 
      from: dtdcSlips.from, 
      to: dtdcSlips.to 
    });
    
    if (!dtdcSlips.from || !dtdcSlips.to) {
      console.log('🚀 [PROCESS_DTDC_RANGE] Missing from/to values');
      setError('Please enter both From and To values');
      return;
    }

    try {
      // Check if strings contain letters (indicating alphanumeric)
      const hasLetters = /[A-Za-z]/.test(dtdcSlips.from) || /[A-Za-z]/.test(dtdcSlips.to);
      
      if (hasLetters) {
        // Handle alphanumeric ranges
        const result = parseAlphanumericRange(dtdcSlips.from, dtdcSlips.to);
        if (result.success && result.prefix && result.fromNum !== undefined && result.toNum !== undefined) {
          const range = generateAlphanumericRange(result.prefix, result.fromNum, result.toNum);
          setDtdcSlips(prev => ({ ...prev, unused: range.join(', ') }));
          setSuccess(`Processed alphanumeric range: ${result.count} slips generated`);
        } else {
          setError('Failed to process alphanumeric range');
        }
      } else {
        // Handle numeric ranges
        const fromNum = parseInt(dtdcSlips.from);
        const toNum = parseInt(dtdcSlips.to);
        
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          if (fromNum > toNum) {
            setError('From value should be less than or equal to To value');
            return;
          }
          
          const range: string[] = [];
          for (let i = fromNum; i <= toNum; i++) {
            range.push(i.toString());
          }
          
          setDtdcSlips(prev => ({ ...prev, unused: range.join(', ') }));
          setSuccess(`Processed numeric range: ${range.length} slips generated`);
        } else {
          setError('Invalid numeric values');
        }
      }
    } catch (error) {
      console.error('🚀 [PROCESS_DTDC_RANGE] Error:', error);
      setError('Error processing range');
    }
  };

  // Function to parse alphanumeric ranges
  const parseAlphanumericRange = (from: string, to: string) => {
    console.log('🔍 [PARSE_ALPHANUMERIC] Starting parse for:', { from, to });
    
    // Use regex to find the pattern where letters/numbers are followed by digits
    const fromMatch = from.match(/^([A-Za-z0-9]*?)(\d+)$/);
    const toMatch = to.match(/^([A-Za-z0-9]*?)(\d+)$/);
    
    console.log('🔍 [PARSE_ALPHANUMERIC] Regex matches:', { 
      fromMatch: fromMatch ? [fromMatch[1], fromMatch[2]] : null,
      toMatch: toMatch ? [toMatch[1], toMatch[2]] : null 
    });
    
    if (fromMatch && toMatch && fromMatch[1] === toMatch[1]) {
      const prefix = fromMatch[1];
      const fromNum = parseInt(fromMatch[2]);
      const toNum = parseInt(toMatch[2]);
      
      console.log('🔍 [PARSE_ALPHANUMERIC] Parsed values:', { 
        prefix, 
        fromNum, 
        toNum,
        fromNumValid: !isNaN(fromNum),
        toNumValid: !isNaN(toNum)
      });
      
      if (!isNaN(fromNum) && !isNaN(toNum)) {
        const count = Math.max(0, toNum - fromNum + 1);
        console.log('🔍 [PARSE_ALPHANUMERIC] Success! Count:', count);
        return {
          success: true,
          count: count,
          prefix: prefix,
          fromNum: fromNum,
          toNum: toNum
        };
      }
    }
    
    console.log('🔍 [PARSE_ALPHANUMERIC] Failed to parse');
    return {
      success: false,
      error: 'Unable to parse alphanumeric range'
    };
  };

  // Function to generate alphanumeric range
  const generateAlphanumericRange = (prefix: string, fromNum: number, toNum: number): string[] => {
    const range: string[] = [];
    for (let i = fromNum; i <= toNum; i++) {
      range.push(`${prefix}${i}`);
    }
    return range;
  };

  // Function to calculate total slips
  const calculateTotalSlips = (): number => {
    if (!dtdcSlips.from || !dtdcSlips.to) {
      return 0;
    }

    try {
      // Check if strings contain letters (indicating alphanumeric)
      const hasLetters = /[A-Za-z]/.test(dtdcSlips.from) || /[A-Za-z]/.test(dtdcSlips.to);
      
      if (hasLetters) {
        // Handle alphanumeric ranges
        const result = parseAlphanumericRange(dtdcSlips.from, dtdcSlips.to);
        return result.success ? result.count : 0;
      } else {
        // Handle numeric ranges
        const fromNum = parseInt(dtdcSlips.from);
        const toNum = parseInt(dtdcSlips.to);
        
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          return Math.max(0, toNum - fromNum + 1);
        }
      }
    } catch (error) {
      console.error('🧮 [CALCULATE_TOTAL_SLIPS] Error:', error);
    }
    
    return 0;
  };

  // Function to handle reseller fallback checkbox change
  const handleResellerFallbackChange = async (enabled: boolean) => {
    if (!config?.clientOrderConfig) return;
    
    try {
      setIsSaving(true);
      setError('');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Update the local state immediately for better UX
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableResellerFallback: enabled
          }
        };
      });

      // Save to database
      const response = await fetch('/api/order-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enableResellerFallback: enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update reseller fallback setting');
      }

      setSuccess('Reseller fallback setting updated successfully!');
      
      // Refresh the config to ensure consistency
      await fetchClientConfig();
      
    } catch (error) {
      console.error('❌ [RESELLER_FALLBACK] Error updating setting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update reseller fallback setting');
      
      // Revert the local state change on error
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableResellerFallback: !enabled
          }
        };
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle thermal print checkbox change
  const handleThermalPrintChange = async (enabled: boolean) => {
    if (!config?.clientOrderConfig) return;
    
    try {
      setIsSaving(true);
      setError('');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Update the local state immediately for better UX
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableThermalPrint: enabled
          }
        };
      });

      // Save to database
      const response = await fetch('/api/order-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enableThermalPrint: enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update thermal print setting');
      }

      setSuccess('Thermal print setting updated successfully!');
      
      // Refresh the config to ensure consistency
      await fetchClientConfig();
      
    } catch (error) {
      console.error('❌ [THERMAL_PRINT] Error updating setting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update thermal print setting');
      
      // Revert the local state change on error
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableThermalPrint: !enabled
          }
        };
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to fetch order configuration for a specific client
  const fetchOrderConfigForClient = async (clientId: string) => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');
      
      console.log('🔍 [ORDER_CONFIG] Fetching order config for client ID:', clientId);
      console.log('🔍 [ORDER_CONFIG] Auth token:', token ? `${token.substring(0, 20)}...` : 'null');
      
      const response = await fetch(`/api/admin/settings/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 [ORDER_CONFIG] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [ORDER_CONFIG] Response data:', data);
        
        if (data.config && data.config.clientOrderConfig) {
          setSuccess(`Order configuration fetched successfully for client: ${clientId}`);
          return data.config.clientOrderConfig;
        } else {
          throw new Error('No order configuration found for this client');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [ORDER_CONFIG] API error:', errorText);
        throw new Error('Failed to fetch order configuration');
      }
    } catch (error) {
      console.error('❌ [ORDER_CONFIG] Fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch order configuration');
      throw error;
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
      
      // Save pickup locations
      if (config.pickupLocations.length > 0) {
        const pickupResponse = await fetch('/api/pickup-locations', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            locations: config.pickupLocations
          })
        });
        if (!pickupResponse.ok) {
          const errorData = await pickupResponse.json();
          throw new Error(errorData.error || 'Failed to save pickup locations');
        }
      }

      // Save courier services
      if (config.courierServices.length > 0) {
        const courierResponse = await fetch('/api/courier-services', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            services: config.courierServices
          })
        });
        if (!courierResponse.ok) {
          const errorData = await courierResponse.json();
          throw new Error(errorData.error || 'Failed to save courier services');
        }
      }

      // Save order configuration
      if (config.clientOrderConfig) {
        const orderConfigResponse = await fetch('/api/order-config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            orderConfig: config.clientOrderConfig
          })
        });
        if (!orderConfigResponse.ok) {
          const errorData = await orderConfigResponse.json();
          throw new Error(errorData.error || 'Failed to save order configuration');
        }
      }

      // Save DTDC slips configuration
      const dtdcResponse = await fetch('/api/dtdc-slips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dtdcSlips: {
            ...dtdcSlips,
            enabled: dtdcSlipsEnabled
          }
        })
      });

      if (!dtdcResponse.ok) {
        const errorData = await dtdcResponse.json();
        throw new Error(errorData.error || 'Failed to save DTDC slips configuration');
      }

      setSuccess('Settings saved successfully!');
      setEditingConfig(null);
      setEditValue('');
      setEditingPickupLocation(null);
      setEditingCourierService(null);
      setNewPickupLocation({ name: '', value: '', delhiveryApiKey: '' });
      setNewCourierService({ name: '', code: '', isActive: true });
      
      // Refresh the configuration to show updated data
      await fetchClientConfig();
      
      // Reload DTDC slips data from database to ensure consistency
      await loadDtdcSlipsFromDatabase();
      
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Error saving settings');
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
                      : 'bg-red-800'
                  }`}>
                    {config.client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Fetch Order Configuration for Specific Client */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Fetch Order Configuration</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Enter Client ID (e.g., client-1756653250197-7ltxt67xn)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                id="clientIdInput"
                defaultValue="client-1756653250197-7ltxt67xn"
              />
              <button
                onClick={async () => {
                  const clientIdInput = document.getElementById('clientIdInput') as HTMLInputElement;
                  const clientId = clientIdInput.value.trim();
                  if (clientId) {
                    try {
                      const orderConfig = await fetchOrderConfigForClient(clientId);
                      alert(`Order Configuration for ${clientId}:\n\n` + 
                        `Default Product Description: ${orderConfig.defaultProductDescription}\n` +
                        `Default Package Value: ₹${orderConfig.defaultPackageValue}\n` +
                        `Default Weight: ${orderConfig.defaultWeight}g\n` +
                        `Default Total Items: ${orderConfig.defaultTotalItems}\n` +
                        `COD Enabled by Default: ${orderConfig.codEnabledByDefault ? 'Yes' : 'No'}\n` +
                        `Default COD Amount: ${orderConfig.defaultCodAmount ? `₹${orderConfig.defaultCodAmount}` : 'Not set'}\n` +
                        `Package Value Range: ₹${orderConfig.minPackageValue} - ₹${orderConfig.maxPackageValue}\n` +
                        `Weight Range: ${orderConfig.minWeight}g - ${orderConfig.maxWeight}g\n` +
                        `Total Items Range: ${orderConfig.minTotalItems} - ${orderConfig.maxTotalItems}\n` +
                        `Require Product Description: ${orderConfig.requireProductDescription ? 'Yes' : 'No'}\n` +
                        `Require Package Value: ${orderConfig.requirePackageValue ? 'Yes' : 'No'}\n` +
                        `Require Weight: ${orderConfig.requireWeight ? 'Yes' : 'No'}\n` +
                        `Require Total Items: ${orderConfig.requireTotalItems ? 'Yes' : 'No'}`
                      );
                    } catch (error) {
                      alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch order configuration'}`);
                    }
                  } else {
                    setError('Please enter a client ID');
                  }
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Fetching...' : 'Fetch Order Config'}
              </button>
              

            </div>
            


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
                {config.pickupLocations.map((location, index) => (
                  <div key={location.id || location.value || `pickup-${index}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
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
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
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
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Reseller Settings</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-gray-500">Auto-fallback for Reseller</dt>
                        <dd className="text-sm text-gray-900">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={config.clientOrderConfig.enableResellerFallback}
                              onChange={(e) => handleResellerFallbackChange(e.target.checked)}
                              disabled={isSaving}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {config.clientOrderConfig.enableResellerFallback ? 'Enabled' : 'Disabled'}
                            </span>
                            {isSaving && (
                              <span className="ml-2 text-xs text-gray-500">
                                Saving...
                              </span>
                            )}
                          </label>
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          When enabled, empty reseller fields automatically use company name/phone
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Thermal Print Mode</dt>
                        <dd className="text-sm text-gray-900">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={config.clientOrderConfig.enableThermalPrint}
                              onChange={(e) => handleThermalPrintChange(e.target.checked)}
                              disabled={isSaving}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {config.clientOrderConfig.enableThermalPrint ? 'Enabled' : 'Disabled'}
                            </span>
                            {isSaving && (
                              <span className="ml-2 text-xs text-gray-500">
                                Saving...
                              </span>
                            )}
                          </label>
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          When enabled, only thermal print options will be shown in order list
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DTDC Slips */}
        <div className="bg-white shadow rounded-lg mb-8 mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">DTDC Slips</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your DTDC courier slip inventory and tracking</p>
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dtdcSlipsEnabled}
                    onChange={(e) => setDtdcSlipsEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
                </label>
              </div>
            </div>
          </div>
          
          {dtdcSlipsEnabled && (
            <div className="px-6 py-4">
              {/* Summary Section */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Current Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Range:</span>
                    <span className="ml-2 text-blue-900">
                      {dtdcSlips.from && dtdcSlips.to ? `${dtdcSlips.from} - ${dtdcSlips.to}` : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Slips:</span>
                    <span className="ml-2 text-blue-900">
                      {dtdcSlips.from && dtdcSlips.to ? calculateTotalSlips() : '0'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="dtdc-from" className="block text-sm font-medium text-gray-700 mb-2">
                    From <span className="text-gray-500">(Starting slip number)</span>
                  </label>
                  <input
                    type="text"
                    id="dtdc-from"
                    value={dtdcSlips.from}
                    onChange={(e) => setDtdcSlips(prev => ({ ...prev, from: e.target.value }))}
                    placeholder="e.g., DTDC001, 1001, A001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dtdc-to" className="block text-sm font-medium text-gray-700 mb-2">
                    To <span className="text-gray-500">(Ending slip number)</span>
                  </label>
                  <input
                    type="text"
                    id="dtdc-to"
                    value={dtdcSlips.to}
                    onChange={(e) => setDtdcSlips(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="e.g., DTDC002, 1002, A002"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="dtdc-unused" className="block text-sm font-medium text-gray-700 mb-2">
                    Unused Slips <span className="text-gray-500">(Comma-separated)</span>
                  </label>
                  <textarea
                    id="dtdc-unused"
                    value={dtdcSlips.unused}
                    onChange={(e) => setDtdcSlips(prev => ({ ...prev, unused: e.target.value }))}
                    placeholder="List all available/unused DTDC slip numbers (comma-separated)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dtdc-used" className="block text-sm font-medium text-gray-700 mb-2">
                    Used Slips <span className="text-gray-500">(Comma-separated)</span>
                  </label>
                  <textarea
                    id="dtdc-used"
                    value={dtdcSlips.used}
                    onChange={(e) => setDtdcSlips(prev => ({ ...prev, used: e.target.value }))}
                    placeholder="List all used/consumed DTDC slip numbers (comma-separated)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              {/* Process Button */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={processDtdcSlipsRange}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Process Range
                </button>
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
