'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearOrderConfigCache } from '@/lib/order-config';

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
    
    // Print mode settings (radio button selection)
    printmode: 'standard' | 'thermal' | 'a5' | 'r4';
    
    // Reference number prefix settings
    enableReferencePrefix: boolean;
    
    // Footer note settings
    enableFooterNote: boolean;
    footerNoteText: string | null;
    
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
  
  // Individual section saving states
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [sectionSuccess, setSectionSuccess] = useState<Record<string, string>>({});

  // Helper functions for section-specific saving
  const setSectionSaving = (section: string, saving: boolean) => {
    setSavingSections(prev => ({ ...prev, [section]: saving }));
  };

  const setSectionError = (section: string, error: string) => {
    setSectionErrors(prev => ({ ...prev, [section]: error }));
  };

  const setSectionSuccessMessage = (section: string, message: string) => {
    setSectionSuccess(prev => ({ ...prev, [section]: message }));
  };

  const clearSectionMessages = (section: string) => {
    setSectionErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[section];
      return newErrors;
    });
    setSectionSuccess(prev => {
      const newSuccess = { ...prev };
      delete newSuccess[section];
      return newSuccess;
    });
  };

  // Individual section save functions
  const saveApiConfiguration = async (category: string, configs: ClientConfig[]) => {
    const sectionKey = `api-${category}`;
    try {
      setSectionSaving(sectionKey, true);
      clearSectionMessages(sectionKey);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/client-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          configs
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save API configuration';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSectionSuccessMessage(sectionKey, `${getCategoryName(category)} configuration saved successfully!`);
      
      // Refresh the config to show updated data
      await fetchClientConfig();
      
    } catch (error) {
      console.error(`❌ [${sectionKey.toUpperCase()}_SAVE] Error:`, error);
      setSectionError(sectionKey, error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSectionSaving(sectionKey, false);
    }
  };

  const savePickupLocations = async () => {
    const sectionKey = 'pickup-locations';
    try {
      setSectionSaving(sectionKey, true);
      clearSectionMessages(sectionKey);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/pickup-locations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          locations: config?.pickupLocations || []
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save pickup locations';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSectionSuccessMessage(sectionKey, 'Pickup locations saved successfully!');
      
      // Refresh the config to show updated data
      await fetchClientConfig();
      
    } catch (error) {
      console.error(`❌ [${sectionKey.toUpperCase()}_SAVE] Error:`, error);
      setSectionError(sectionKey, error instanceof Error ? error.message : 'Failed to save pickup locations');
    } finally {
      setSectionSaving(sectionKey, false);
    }
  };

  const saveCourierServices = async () => {
    const sectionKey = 'courier-services';
    try {
      setSectionSaving(sectionKey, true);
      clearSectionMessages(sectionKey);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/courier-services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          services: config?.courierServices || []
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save courier services';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSectionSuccessMessage(sectionKey, 'Courier services saved successfully!');
      
      // Refresh the config to show updated data
      await fetchClientConfig();
      
    } catch (error) {
      console.error(`❌ [${sectionKey.toUpperCase()}_SAVE] Error:`, error);
      setSectionError(sectionKey, error instanceof Error ? error.message : 'Failed to save courier services');
    } finally {
      setSectionSaving(sectionKey, false);
    }
  };

  const saveOrderConfiguration = async () => {
    const sectionKey = 'order-config';
    try {
      setSectionSaving(sectionKey, true);
      clearSectionMessages(sectionKey);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/order-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderConfig: config?.clientOrderConfig
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save order configuration';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSectionSuccessMessage(sectionKey, 'Order configuration saved successfully!');
      
      // Refresh the config to show updated data
      await fetchClientConfig();
      
    } catch (error) {
      console.error(`❌ [${sectionKey.toUpperCase()}_SAVE] Error:`, error);
      setSectionError(sectionKey, error instanceof Error ? error.message : 'Failed to save order configuration');
    } finally {
      setSectionSaving(sectionKey, false);
    }
  };

  const saveDtdcSlips = async () => {
    const sectionKey = 'dtdc-slips';
    try {
      setSectionSaving(sectionKey, true);
      clearSectionMessages(sectionKey);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/dtdc-slips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dtdcSlips: {
            ...dtdcSlips,
            enabled: dtdcSlipsEnabled
          },
          courierType: 'dtdc'
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save DTDC slips configuration';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSectionSuccessMessage(sectionKey, 'DTDC slips configuration saved successfully!');
      
      // Refresh the config to show updated data
      await fetchClientConfig();
      
    } catch (error) {
      console.error(`❌ [${sectionKey.toUpperCase()}_SAVE] Error:`, error);
      setSectionError(sectionKey, error instanceof Error ? error.message : 'Failed to save DTDC slips configuration');
    } finally {
      setSectionSaving(sectionKey, false);
    }
  };

  const saveDtdcCodSlips = async () => {
    const sectionKey = 'dtdc-cod-slips';
    try {
      setSectionSaving(sectionKey, true);
      clearSectionMessages(sectionKey);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/dtdc-slips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dtdcSlips: {
            ...dtdcCodSlips,
            enabled: dtdcCodSlipsEnabled
          },
          courierType: 'dtdc_cod'
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save DTDC COD slips configuration';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSectionSuccessMessage(sectionKey, 'DTDC COD slips configuration saved successfully!');
      
      // Refresh the config to show updated data
      await fetchClientConfig();
      
    } catch (error) {
      console.error(`❌ [${sectionKey.toUpperCase()}_SAVE] Error:`, error);
      setSectionError(sectionKey, error instanceof Error ? error.message : 'Failed to save DTDC COD slips configuration');
    } finally {
      setSectionSaving(sectionKey, false);
    }
  };

  const saveDtdcPlusSlips = async () => {
    const sectionKey = 'dtdc-plus-slips';
    try {
      setSectionSaving(sectionKey, true);
      clearSectionMessages(sectionKey);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/dtdc-slips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dtdcSlips: {
            ...dtdcPlusSlips,
            enabled: dtdcPlusSlipsEnabled
          },
          courierType: 'dtdc_plus'
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save DTDC Plus slips configuration';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSectionSuccessMessage(sectionKey, 'DTDC Plus slips configuration saved successfully!');
      
      // Refresh the config to show updated data
      await fetchClientConfig();
      
    } catch (error) {
      console.error(`❌ [${sectionKey.toUpperCase()}_SAVE] Error:`, error);
      setSectionError(sectionKey, error instanceof Error ? error.message : 'Failed to save DTDC Plus slips configuration');
    } finally {
      setSectionSaving(sectionKey, false);
    }
  };


  // Editing states
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingPickupLocation, setEditingPickupLocation] = useState<string | null>(null);
  const [editingCourierService, setEditingCourierService] = useState<string | null>(null);

  // DTDC Slips state - Support for dtdc, dtdc_cod, dtdc_plus
  const [dtdcSlips, setDtdcSlips] = useState({
    from: '',
    to: '',
    unused: '',
    used: ''
  });
  const [dtdcSlipsEnabled, setDtdcSlipsEnabled] = useState(false);

  // DTDC COD Slips state
  const [dtdcCodSlips, setDtdcCodSlips] = useState({
    from: '',
    to: '',
    unused: '',
    used: ''
  });
  const [dtdcCodSlipsEnabled, setDtdcCodSlipsEnabled] = useState(false);

  // DTDC Plus Slips state
  const [dtdcPlusSlips, setDtdcPlusSlips] = useState({
    from: '',
    to: '',
    unused: '',
    used: ''
  });
  const [dtdcPlusSlipsEnabled, setDtdcPlusSlipsEnabled] = useState(false);

  // Logo state
  const [logo, setLogo] = useState<{
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    logoUrl?: string;
    displayLogoOnWaybill: boolean;
    logoEnabledCouriers: string;
    url: string;
    type?: 'uploaded' | 'url';
  } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUrlSaving, setLogoUrlSaving] = useState(false);

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

  // Footer note state
  const [footerNoteEnabled, setFooterNoteEnabled] = useState(false);
  const [footerNoteText, setFooterNoteText] = useState('');

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
      loadDtdcCodSlipsFromDatabase();
      loadDtdcPlusSlipsFromDatabase();
      loadLogo();
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

        const pickupData = pickupResponse.ok ? await pickupResponse.json() : { data: [] };
        const courierData = courierResponse.ok ? await courierResponse.json() : { data: [] };

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
          pickupLocations: (pickupData.data || []).map((location: any) => ({
            id: location.id,
            name: location.label, // API returns 'label', interface expects 'name'
            value: location.value,
            delhiveryApiKey: location.delhiveryApiKey
          })),
          courierServices: (courierData.courierServices || []).map((service: any) => ({
            id: service.id,
            name: service.label, // API returns 'label', interface expects 'name'
            code: service.value, // API returns 'value', interface expects 'code'
            isActive: service.isActive,
            isDefault: service.isDefault
          })),
          clientOrderConfig: {
            ...data.orderConfig,
            printmode: data.orderConfig?.printmode || 'standard'
          },
          configs: [],
          configByCategory: {}
        };
        
        setConfig(transformedConfig);
        
        // Initialize footer note state
        if (data.orderConfig) {
          setFooterNoteEnabled(data.orderConfig.enableFooterNote || false);
          setFooterNoteText(data.orderConfig.footerNoteText || '');
        }
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

      const response = await fetch('/api/dtdc-slips?courier=dtdc', {
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

  // Function to load DTDC COD slips from database
  const loadDtdcCodSlipsFromDatabase = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/dtdc-slips?courier=dtdc_cod', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dtdcSlips) {
          setDtdcCodSlips(data.dtdcSlips);
          setDtdcCodSlipsEnabled(data.dtdcSlips.enabled);
          console.log('🔍 [DTDC_COD_SLIPS] Loaded from database:', data.dtdcSlips);
        }
      } else {
        console.error('❌ [DTDC_COD_SLIPS] Failed to load from database:', response.status);
      }
    } catch (error) {
      console.error('❌ [DTDC_COD_SLIPS] Error loading from database:', error);
    }
  };

  // Function to load DTDC Plus slips from database
  const loadDtdcPlusSlipsFromDatabase = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/dtdc-slips?courier=dtdc_plus', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dtdcSlips) {
          setDtdcPlusSlips(data.dtdcSlips);
          setDtdcPlusSlipsEnabled(data.dtdcSlips.enabled);
          console.log('🔍 [DTDC_PLUS_SLIPS] Loaded from database:', data.dtdcSlips);
        }
      } else {
        console.error('❌ [DTDC_PLUS_SLIPS] Failed to load from database:', response.status);
      }
    } catch (error) {
      console.error('❌ [DTDC_PLUS_SLIPS] Error loading from database:', error);
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

  // Function to process DTDC COD slips range
  const processDtdcCodSlipsRange = () => {
    console.log('🚀 [PROCESS_DTDC_COD_RANGE] Starting process for:', { 
      from: dtdcCodSlips.from, 
      to: dtdcCodSlips.to 
    });
    
    if (!dtdcCodSlips.from || !dtdcCodSlips.to) {
      setError('Please enter both From and To values');
      return;
    }

    try {
      const hasLetters = /[A-Za-z]/.test(dtdcCodSlips.from) || /[A-Za-z]/.test(dtdcCodSlips.to);
      
      if (hasLetters) {
        const result = parseAlphanumericRange(dtdcCodSlips.from, dtdcCodSlips.to);
        if (result.success && result.prefix && result.fromNum !== undefined && result.toNum !== undefined) {
          const range = generateAlphanumericRange(result.prefix, result.fromNum, result.toNum);
          setDtdcCodSlips(prev => ({ ...prev, unused: range.join(', ') }));
          setSuccess(`Processed alphanumeric range: ${result.count} slips generated`);
        } else {
          setError('Failed to process alphanumeric range');
        }
      } else {
        const fromNum = parseInt(dtdcCodSlips.from);
        const toNum = parseInt(dtdcCodSlips.to);
        
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          if (fromNum > toNum) {
            setError('From value should be less than or equal to To value');
            return;
          }
          
          const range: string[] = [];
          for (let i = fromNum; i <= toNum; i++) {
            range.push(i.toString());
          }
          
          setDtdcCodSlips(prev => ({ ...prev, unused: range.join(', ') }));
          setSuccess(`Processed numeric range: ${range.length} slips generated`);
        } else {
          setError('Invalid numeric values');
        }
      }
    } catch (error) {
      console.error('🚀 [PROCESS_DTDC_COD_RANGE] Error:', error);
      setError('Error processing range');
    }
  };

  // Function to process DTDC Plus slips range
  const processDtdcPlusSlipsRange = () => {
    console.log('🚀 [PROCESS_DTDC_PLUS_RANGE] Starting process for:', { 
      from: dtdcPlusSlips.from, 
      to: dtdcPlusSlips.to 
    });
    
    if (!dtdcPlusSlips.from || !dtdcPlusSlips.to) {
      setError('Please enter both From and To values');
      return;
    }

    try {
      const hasLetters = /[A-Za-z]/.test(dtdcPlusSlips.from) || /[A-Za-z]/.test(dtdcPlusSlips.to);
      
      if (hasLetters) {
        const result = parseAlphanumericRange(dtdcPlusSlips.from, dtdcPlusSlips.to);
        if (result.success && result.prefix && result.fromNum !== undefined && result.toNum !== undefined) {
          const range = generateAlphanumericRange(result.prefix, result.fromNum, result.toNum);
          setDtdcPlusSlips(prev => ({ ...prev, unused: range.join(', ') }));
          setSuccess(`Processed alphanumeric range: ${result.count} slips generated`);
        } else {
          setError('Failed to process alphanumeric range');
        }
      } else {
        const fromNum = parseInt(dtdcPlusSlips.from);
        const toNum = parseInt(dtdcPlusSlips.to);
        
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          if (fromNum > toNum) {
            setError('From value should be less than or equal to To value');
            return;
          }
          
          const range: string[] = [];
          for (let i = fromNum; i <= toNum; i++) {
            range.push(i.toString());
          }
          
          setDtdcPlusSlips(prev => ({ ...prev, unused: range.join(', ') }));
          setSuccess(`Processed numeric range: ${range.length} slips generated`);
        } else {
          setError('Invalid numeric values');
        }
      }
    } catch (error) {
      console.error('🚀 [PROCESS_DTDC_PLUS_RANGE] Error:', error);
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

  const calculateTotalCodSlips = (): number => {
    if (!dtdcCodSlips.from || !dtdcCodSlips.to) {
      return 0;
    }

    try {
      const hasLetters = /[A-Za-z]/.test(dtdcCodSlips.from) || /[A-Za-z]/.test(dtdcCodSlips.to);
      
      if (hasLetters) {
        const result = parseAlphanumericRange(dtdcCodSlips.from, dtdcCodSlips.to);
        return result.success ? result.count : 0;
      } else {
        const fromNum = parseInt(dtdcCodSlips.from);
        const toNum = parseInt(dtdcCodSlips.to);
        
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          return Math.max(0, toNum - fromNum + 1);
        }
      }
    } catch (error) {
      console.error('🧮 [CALCULATE_TOTAL_COD_SLIPS] Error:', error);
    }
    
    return 0;
  };

  const calculateTotalPlusSlips = (): number => {
    if (!dtdcPlusSlips.from || !dtdcPlusSlips.to) {
      return 0;
    }

    try {
      const hasLetters = /[A-Za-z]/.test(dtdcPlusSlips.from) || /[A-Za-z]/.test(dtdcPlusSlips.to);
      
      if (hasLetters) {
        const result = parseAlphanumericRange(dtdcPlusSlips.from, dtdcPlusSlips.to);
        return result.success ? result.count : 0;
      } else {
        const fromNum = parseInt(dtdcPlusSlips.from);
        const toNum = parseInt(dtdcPlusSlips.to);
        
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          return Math.max(0, toNum - fromNum + 1);
        }
      }
    } catch (error) {
      console.error('🧮 [CALCULATE_TOTAL_PLUS_SLIPS] Error:', error);
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

  // Function to handle A5 print checkbox change
  const handleA5PrintChange = async (enabled: boolean) => {
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
            enableA5Print: enabled
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
          enableA5Print: enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update A5 print setting');
      }

      setSuccess('A5 print setting updated successfully!');
      
      // Refresh the config to ensure consistency
      await fetchClientConfig();
      
    } catch (error) {
      console.error('❌ [A5_PRINT] Error updating setting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update A5 print setting');
      
      // Revert the local state change on error
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableA5Print: !enabled
          }
        };
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle 4R print checkbox change
  const handleR4PrintChange = async (enabled: boolean) => {
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
            enableR4Print: enabled
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
          enableR4Print: enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update 4R print setting');
      }

      setSuccess('4R print setting updated successfully!');
      
      // Refresh the config to ensure consistency
      await fetchClientConfig();
      
    } catch (error) {
      console.error('❌ [R4_PRINT] Error updating setting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update 4R print setting');
      
      // Revert the local state change on error
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableR4Print: !enabled
          }
        };
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle print mode radio button change
  const handlePrintModeChange = async (printMode: string) => {
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
            printmode: printMode as 'standard' | 'thermal' | 'a5' | 'r4'
          }
        };
      });

      // Save to database
      const requestBody = { printmode: printMode };
      console.log('🔍 [PRINT_MODE] Sending request body:', requestBody);
      
      const response = await fetch('/api/order-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update print mode setting');
      }

      setSuccess('Print mode updated successfully!');
      
      // Refresh the config to ensure consistency
      await fetchClientConfig();
      
    } catch (error) {
      console.error('❌ [PRINT_MODE] Error updating setting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update print mode setting');
      
      // Revert the local state change on error
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            printmode: 'standard'
          }
        };
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle reference prefix checkbox change
  const handleReferencePrefixChange = async (enabled: boolean) => {
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
            enableReferencePrefix: enabled
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
          enableReferencePrefix: enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update reference prefix setting');
      }

      setSuccess('Reference prefix setting updated successfully!');
      
      // Refresh the config to ensure consistency
      await fetchClientConfig();
      
    } catch (error) {
      console.error('❌ [REFERENCE_PREFIX] Error updating setting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update reference prefix setting');
      
      // Revert the local state change on error
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableReferencePrefix: !enabled
          }
        };
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle footer note enabled checkbox change
  const handleFooterNoteEnabledChange = async (enabled: boolean) => {
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
      setFooterNoteEnabled(enabled);
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableFooterNote: enabled
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
          enableFooterNote: enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update footer note setting');
      }

      setSuccess('Footer note setting updated successfully!');
      
      // Refresh the config to ensure consistency
      await fetchClientConfig();
      
    } catch (error) {
      console.error('❌ [FOOTER_NOTE] Error updating setting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update footer note setting');
      
      // Revert the local state change on error
      setFooterNoteEnabled(!enabled);
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            enableFooterNote: !enabled
          }
        };
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle footer note text input change (local state only)
  const handleFooterNoteTextChange = (text: string) => {
    setFooterNoteText(text);
  };

  // Function to save footer note text
  const handleSaveFooterNoteText = async () => {
    if (!config?.clientOrderConfig) return;
    
    try {
      setIsSaving(true);
      setError('');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Save to database
      const response = await fetch('/api/order-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          footerNoteText: footerNoteText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update footer note text');
      }

      // Update the local config state after successful save
      setConfig(prev => {
        if (!prev?.clientOrderConfig) return prev;
        return {
          ...prev,
          clientOrderConfig: {
            ...prev.clientOrderConfig,
            footerNoteText: footerNoteText
          }
        };
      });

      setSuccess('Footer note text saved successfully!');
      
    } catch (error) {
      console.error('❌ [FOOTER_NOTE_TEXT] Error saving text:', error);
      setError(error instanceof Error ? error.message : 'Failed to save footer note text');
    } finally {
      setIsSaving(false);
    }
  };


  // Logo functions
  const loadLogo = async () => {
    try {
      console.log('🔍 [LOAD_LOGO] Starting to load logo...');
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/logo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [LOAD_LOGO] API Response:', data);
        if (data.success && data.logo) {
          console.log('🔍 [LOAD_LOGO] Setting logo state:', data.logo);
          console.log('🔍 [LOAD_LOGO] logoEnabledCouriers type:', typeof data.logo.logoEnabledCouriers);
          console.log('🔍 [LOAD_LOGO] logoEnabledCouriers value:', data.logo.logoEnabledCouriers);
          setLogo(data.logo);
          // Set the logoUrl state for the input field
          if (data.logo.logoUrl) {
            setLogoUrl(data.logo.logoUrl);
          }
        } else {
          console.log('🔍 [LOAD_LOGO] No logo found, setting to null');
          setLogo(null);
          setLogoUrl('');
        }
      } else {
        console.error('🔍 [LOAD_LOGO] API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('🔍 [LOAD_LOGO] Error loading logo:', error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('displayLogoOnWaybill', logo?.displayLogoOnWaybill?.toString() || 'false');
      formData.append('logoEnabledCouriers', logo?.logoEnabledCouriers || '[]');

      const response = await fetch('/api/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogo(data.logo);
          setSuccess('Logo uploaded successfully!');
        } else {
          setError(data.error || 'Failed to upload logo');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoUrlSave = async () => {
    setLogoUrlSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/logo', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logoUrl: logoUrl.trim() || null,
          displayLogoOnWaybill: logo?.displayLogoOnWaybill || false,
          logoEnabledCouriers: logo?.logoEnabledCouriers || '[]'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogo(data.logo);
          setSuccess('Logo URL updated successfully!');
        } else {
          setError(data.error || 'Failed to update logo URL');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update logo URL');
      }
    } catch (error) {
      console.error('Error updating logo URL:', error);
      setError('Failed to update logo URL');
    } finally {
      setLogoUrlSaving(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!logo) return;

    setLogoDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogo(null);
          setLogoUrl('');
          setSuccess('Logo deleted successfully!');
        } else {
          setError(data.error || 'Failed to delete logo');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete logo');
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      setError('Failed to delete logo');
    } finally {
      setLogoDeleting(false);
    }
  };

  const handleDisplayLogoToggle = async (enabled: boolean) => {
    if (!logo) return;

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/logo', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logoUrl: logo.logoUrl || null,
          displayLogoOnWaybill: enabled,
          logoEnabledCouriers: logo.logoEnabledCouriers
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogo(prev => prev ? { ...prev, displayLogoOnWaybill: enabled } : null);
          setSuccess('Logo display setting updated successfully!');
        } else {
          setError(data.error || 'Failed to update logo display setting');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update logo display setting');
      }
    } catch (error) {
      console.error('Error updating logo display setting:', error);
      setError('Failed to update logo display setting');
    }
  };

  const handleCourierSelectionChange = async (courierCode: string, enabled: boolean) => {
    if (!logo) return;

    try {
      console.log('🔍 [COURIER_CHANGE] Starting courier change:', { courierCode, enabled });
      console.log('🔍 [COURIER_CHANGE] Current logo.logoEnabledCouriers:', logo.logoEnabledCouriers);
      console.log('🔍 [COURIER_CHANGE] Type of logoEnabledCouriers:', typeof logo.logoEnabledCouriers);
      
      const currentCouriers = JSON.parse(logo.logoEnabledCouriers || '[]');
      console.log('🔍 [COURIER_CHANGE] Parsed currentCouriers:', currentCouriers);
      
      let updatedCouriers;
      
      if (enabled) {
        updatedCouriers = [...currentCouriers, courierCode];
        console.log('🔍 [COURIER_CHANGE] Adding courier, updatedCouriers:', updatedCouriers);
      } else {
        updatedCouriers = currentCouriers.filter((code: string) => code !== courierCode);
        console.log('🔍 [COURIER_CHANGE] Removing courier, updatedCouriers:', updatedCouriers);
      }

      const token = localStorage.getItem('authToken');
      
      const requestBody = {
        logoUrl: logo.logoUrl || null,
        displayLogoOnWaybill: logo.displayLogoOnWaybill,
        logoEnabledCouriers: JSON.stringify(updatedCouriers)
      };
      
      console.log('🔍 [COURIER_CHANGE] Request body:', requestBody);
      
      const response = await fetch('/api/logo', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [COURIER_CHANGE] API Response:', data);
        if (data.success) {
          console.log('🔍 [COURIER_CHANGE] Updating local state with:', JSON.stringify(updatedCouriers));
          setLogo(prev => prev ? { ...prev, logoEnabledCouriers: JSON.stringify(updatedCouriers) } : null);
          setSuccess('Courier selection updated successfully!');
        } else {
          setError(data.error || 'Failed to update courier selection');
        }
      } else {
        const errorData = await response.json();
        console.error('🔍 [COURIER_CHANGE] API Error:', response.status, errorData);
        setError(errorData.error || 'Failed to update courier selection');
      }
    } catch (error) {
      console.error('🔍 [COURIER_CHANGE] Error updating courier selection:', error);
      setError('Failed to update courier selection');
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
      console.log('🔍 [SAVE_CONFIG] Starting to save configuration...');
      
      // Save pickup locations
      if (config.pickupLocations.length > 0) {
        console.log('🔍 [SAVE_CONFIG] Saving pickup locations...');
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
          let errorMessage = 'Failed to save pickup locations';
          try {
            const errorData = await pickupResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('❌ [PICKUP_SAVE] Failed to parse error response:', jsonError);
            errorMessage = `HTTP ${pickupResponse.status}: ${pickupResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }
        console.log('✅ [SAVE_CONFIG] Pickup locations saved successfully');
      }

      // Save courier services
      if (config.courierServices.length > 0) {
        console.log('🔍 [SAVE_CONFIG] Saving courier services...');
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
          let errorMessage = 'Failed to save courier services';
          try {
            const errorData = await courierResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('❌ [COURIER_SAVE] Failed to parse error response:', jsonError);
            errorMessage = `HTTP ${courierResponse.status}: ${courierResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }
        console.log('✅ [SAVE_CONFIG] Courier services saved successfully');
      }

      // Save order configuration
      if (config.clientOrderConfig) {
        console.log('🔍 [SAVE_CONFIG] Saving order configuration...');
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
          let errorMessage = 'Failed to save order configuration';
          try {
            const errorData = await orderConfigResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('❌ [ORDER_CONFIG_SAVE] Failed to parse error response:', jsonError);
            errorMessage = `HTTP ${orderConfigResponse.status}: ${orderConfigResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }
        console.log('✅ [SAVE_CONFIG] Order configuration saved successfully');
      }

      // Save DTDC slips configuration
      console.log('🔍 [SAVE_CONFIG] Saving DTDC slips configuration...');
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
        let errorMessage = 'Failed to save DTDC slips configuration';
        try {
          const errorData = await dtdcResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('❌ [DTDC_SAVE] Failed to parse error response:', jsonError);
          errorMessage = `HTTP ${dtdcResponse.status}: ${dtdcResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }
      console.log('✅ [SAVE_CONFIG] DTDC slips configuration saved successfully');

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
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">{getCategoryName(category)}</h2>
                <button
                  onClick={() => saveApiConfiguration(category, configs)}
                  disabled={savingSections[`api-${category}`]}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSections[`api-${category}`] ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="px-6 py-4">
                {/* Section-specific success/error messages */}
                {sectionSuccess[`api-${category}`] && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-800">{sectionSuccess[`api-${category}`]}</p>
                      </div>
                    </div>
                  </div>
                )}
                {sectionErrors[`api-${category}`] && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{sectionErrors[`api-${category}`]}</p>
                      </div>
                    </div>
                  </div>
                )}
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
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Pickup Locations</h2>
              <button
                onClick={savePickupLocations}
                disabled={savingSections['pickup-locations']}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSections['pickup-locations'] ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="px-6 py-4">
              {/* Section-specific success/error messages */}
              {sectionSuccess['pickup-locations'] && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{sectionSuccess['pickup-locations']}</p>
                    </div>
                  </div>
                </div>
              )}
              {sectionErrors['pickup-locations'] && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{sectionErrors['pickup-locations']}</p>
                    </div>
                  </div>
                </div>
              )}
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
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Courier Services</h2>
              <button
                onClick={saveCourierServices}
                disabled={savingSections['courier-services']}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSections['courier-services'] ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="px-6 py-4">
              {/* Section-specific success/error messages */}
              {sectionSuccess['courier-services'] && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{sectionSuccess['courier-services']}</p>
                    </div>
                  </div>
                </div>
              )}
              {sectionErrors['courier-services'] && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{sectionErrors['courier-services']}</p>
                    </div>
                  </div>
                </div>
              )}
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
          {config.clientOrderConfig ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Order Configuration</h2>
                <button
                  onClick={saveOrderConfiguration}
                  disabled={savingSections['order-config']}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSections['order-config'] ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="px-6 py-4">
                {/* Section-specific success/error messages */}
                {sectionSuccess['order-config'] && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-800">{sectionSuccess['order-config']}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* sectionErrors['order-config'] && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{sectionErrors['order-config']}</p>
                    </div>
                  </div>
                ) */}

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
                        <dt className="text-xs text-gray-500">Print Mode</dt>
                        <dd className="text-sm text-gray-900">
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="printMode"
                                value="standard"
                                checked={config.clientOrderConfig.printmode === 'standard'}
                                onChange={(e) => handlePrintModeChange(e.target.value)}
                                disabled={isSaving}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                Standard Print
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="printMode"
                                value="thermal"
                                checked={config.clientOrderConfig.printmode === 'thermal'}
                                onChange={(e) => handlePrintModeChange(e.target.value)}
                                disabled={isSaving}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                Thermal Print (80mm)
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="printMode"
                                value="a5"
                                checked={config.clientOrderConfig.printmode === 'a5'}
                                onChange={(e) => handlePrintModeChange(e.target.value)}
                                disabled={isSaving}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                A5 Print (148mm x 210mm)
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="printMode"
                                value="r4"
                                checked={config.clientOrderConfig.printmode === 'r4'}
                                onChange={(e) => handlePrintModeChange(e.target.value)}
                                disabled={isSaving}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                4R Print (4x6 inch)
                              </span>
                            </label>
                            {isSaving && (
                              <span className="text-xs text-gray-500">
                                Saving...
                              </span>
                            )}
                          </div>
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          Choose the print format for shipping labels. Only one mode can be active at a time.
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Reference Number Prefix</dt>
                        <dd className="text-sm text-gray-900">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={config.clientOrderConfig.enableReferencePrefix}
                              onChange={(e) => handleReferencePrefixChange(e.target.checked)}
                              disabled={isSaving}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {config.clientOrderConfig.enableReferencePrefix ? 'Enabled' : 'Disabled'}
                            </span>
                            {isSaving && (
                              <span className="ml-2 text-xs text-gray-500">
                                Saving...
                              </span>
                            )}
                          </label>
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          When enabled, auto-generated reference numbers use alphanumeric + mobile format. When disabled, auto-generated uses only mobile number, but custom values still use custom + mobile format.
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Footer Note in Waybill</dt>
                        <dd className="text-sm text-gray-900">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={footerNoteEnabled}
                              onChange={(e) => handleFooterNoteEnabledChange(e.target.checked)}
                              disabled={isSaving}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {footerNoteEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                            {isSaving && (
                              <span className="ml-2 text-xs text-gray-500">
                                Saving...
                              </span>
                            )}
                          </label>
                        </dd>
                        <dd className="text-xs text-gray-500 mt-1">
                          When enabled, a custom footer note will be displayed on printed waybills
                        </dd>
                        {footerNoteEnabled && (
                          <div className="mt-3">
                            <label className="block text-xs text-gray-500 mb-1">
                              Footer Note Text
                            </label>
                            <textarea
                              value={footerNoteText}
                              onChange={(e) => handleFooterNoteTextChange(e.target.value)}
                              disabled={isSaving}
                              placeholder="Enter your custom footer note text..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={handleSaveFooterNoteText}
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSaving ? 'Saving...' : 'Save Footer Note'}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              This text will appear at the bottom of printed waybills
                            </p>
                          </div>
                        )}
                      </div>

                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Logo Settings */}
        <div className="bg-white shadow rounded-lg mb-8 mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Company Logo</h2>
                <p className="text-sm text-gray-600 mt-1">Upload your company logo to display on waybills</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-6">
              {/* Current Logo Display */}
              {logo && (
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <img
                      src={logo.url}
                      alt="Company Logo"
                      className="h-16 w-16 object-contain border border-gray-200 rounded"
                      onError={(e) => {
                        // Fallback for broken images
                        e.currentTarget.src = '/images/scan2ship.png';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Current Logo</h3>
                    <p className="text-xs text-gray-500">
                      {logo.type === 'uploaded' && logo.fileName && logo.fileSize && logo.fileType
                        ? `${logo.fileName} • ${(logo.fileSize / 1024).toFixed(1)} KB • ${logo.fileType}`
                        : logo.type === 'url' && logo.logoUrl
                        ? `URL: ${logo.logoUrl}`
                        : 'Logo'}
                    </p>
                    {logo.type && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        logo.type === 'uploaded' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {logo.type === 'uploaded' ? 'Uploaded File' : 'URL'}
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={handleLogoDelete}
                      disabled={logoDeleting}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {logoDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Logo
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {logoUploading && (
                    <span className="text-sm text-gray-500">Uploading...</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB.
                </p>
              </div>

              {/* Logo URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or provide logo URL
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    disabled={logoUrlSaving}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleLogoUrlSave}
                    disabled={logoUrlSaving || !logoUrl.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logoUrlSaving ? 'Saving...' : 'Save URL'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Provide a direct URL to your logo image. This will be used as a fallback if no file is uploaded.
                </p>
              </div>

              {/* Display Logo on Waybill Toggle */}
              {logo && (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={logo.displayLogoOnWaybill}
                        onChange={(e) => handleDisplayLogoToggle(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Display logo on waybill
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      When enabled, your company logo will be displayed on selected courier waybills
                    </p>
                  </div>

                  {/* Courier Service Selection */}
                  {logo.displayLogoOnWaybill && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select courier services to display logo:
                      </label>
                      <div className="space-y-2">
                        {config?.courierServices?.map((courier) => {
                          const enabledCouriers = JSON.parse(logo.logoEnabledCouriers || '[]');
                          const isEnabled = enabledCouriers.includes(courier.code);
                          
                          return (
                            <label key={courier.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => handleCourierSelectionChange(courier.code, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {courier.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Logo will only appear on waybills for the selected courier services
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* No Logo State */}
              {!logo && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No logo uploaded</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload a logo to display it on your waybills
                  </p>
                </div>
              )}
            </div>
          </div>
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
              {/* Section-specific success/error messages */}
              {sectionSuccess['dtdc-slips'] && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{sectionSuccess['dtdc-slips']}</p>
                    </div>
                  </div>
                </div>
              )}
              {sectionErrors['dtdc-slips'] && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{sectionErrors['dtdc-slips']}</p>
                    </div>
                  </div>
                </div>
              )}
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
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={processDtdcSlipsRange}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Process Range
                </button>
                <button
                  onClick={saveDtdcSlips}
                  disabled={savingSections['dtdc-slips']}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSections['dtdc-slips'] ? 'Saving...' : 'Save DTDC Slips'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DTDC COD Slips */}
        <div className="bg-white shadow rounded-lg mb-8 mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">DTDC COD Slips</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your DTDC COD courier slip inventory and tracking</p>
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dtdcCodSlipsEnabled}
                    onChange={(e) => setDtdcCodSlipsEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
                </label>
              </div>
            </div>
          </div>
          
          {dtdcCodSlipsEnabled && (
            <div className="px-6 py-4">
              {sectionSuccess['dtdc-cod-slips'] && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{sectionSuccess['dtdc-cod-slips']}</p>
                    </div>
                  </div>
                </div>
              )}
              {sectionErrors['dtdc-cod-slips'] && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{sectionErrors['dtdc-cod-slips']}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Current Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Range:</span>
                    <span className="ml-2 text-blue-900">
                      {dtdcCodSlips.from && dtdcCodSlips.to ? `${dtdcCodSlips.from} - ${dtdcCodSlips.to}` : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Slips:</span>
                    <span className="ml-2 text-blue-900">
                      {dtdcCodSlips.from && dtdcCodSlips.to ? calculateTotalCodSlips() : '0'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="dtdc-cod-from" className="block text-sm font-medium text-gray-700 mb-2">
                    From <span className="text-gray-500">(Starting slip number)</span>
                  </label>
                  <input
                    type="text"
                    id="dtdc-cod-from"
                    value={dtdcCodSlips.from}
                    onChange={(e) => setDtdcCodSlips(prev => ({ ...prev, from: e.target.value }))}
                    placeholder="e.g., DTDCCOD001, 1001, A001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dtdc-cod-to" className="block text-sm font-medium text-gray-700 mb-2">
                    To <span className="text-gray-500">(Ending slip number)</span>
                  </label>
                  <input
                    type="text"
                    id="dtdc-cod-to"
                    value={dtdcCodSlips.to}
                    onChange={(e) => setDtdcCodSlips(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="e.g., DTDCCOD002, 1002, A002"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="dtdc-cod-unused" className="block text-sm font-medium text-gray-700 mb-2">
                    Unused Slips <span className="text-gray-500">(Comma-separated)</span>
                  </label>
                  <textarea
                    id="dtdc-cod-unused"
                    value={dtdcCodSlips.unused}
                    onChange={(e) => setDtdcCodSlips(prev => ({ ...prev, unused: e.target.value }))}
                    placeholder="List all available/unused DTDC COD slip numbers (comma-separated)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dtdc-cod-used" className="block text-sm font-medium text-gray-700 mb-2">
                    Used Slips <span className="text-gray-500">(Comma-separated)</span>
                  </label>
                  <textarea
                    id="dtdc-cod-used"
                    value={dtdcCodSlips.used}
                    onChange={(e) => setDtdcCodSlips(prev => ({ ...prev, used: e.target.value }))}
                    placeholder="List all used/consumed DTDC COD slip numbers (comma-separated)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={processDtdcCodSlipsRange}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Process Range
                </button>
                <button
                  onClick={saveDtdcCodSlips}
                  disabled={savingSections['dtdc-cod-slips']}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSections['dtdc-cod-slips'] ? 'Saving...' : 'Save DTDC COD Slips'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DTDC Plus Slips */}
        <div className="bg-white shadow rounded-lg mb-8 mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">DTDC Plus Slips</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your DTDC Plus courier slip inventory and tracking</p>
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dtdcPlusSlipsEnabled}
                    onChange={(e) => setDtdcPlusSlipsEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
                </label>
              </div>
            </div>
          </div>
          
          {dtdcPlusSlipsEnabled && (
            <div className="px-6 py-4">
              {sectionSuccess['dtdc-plus-slips'] && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{sectionSuccess['dtdc-plus-slips']}</p>
                    </div>
                  </div>
                </div>
              )}
              {sectionErrors['dtdc-plus-slips'] && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{sectionErrors['dtdc-plus-slips']}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Current Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Range:</span>
                    <span className="ml-2 text-blue-900">
                      {dtdcPlusSlips.from && dtdcPlusSlips.to ? `${dtdcPlusSlips.from} - ${dtdcPlusSlips.to}` : 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Slips:</span>
                    <span className="ml-2 text-blue-900">
                      {dtdcPlusSlips.from && dtdcPlusSlips.to ? calculateTotalPlusSlips() : '0'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="dtdc-plus-from" className="block text-sm font-medium text-gray-700 mb-2">
                    From <span className="text-gray-500">(Starting slip number)</span>
                  </label>
                  <input
                    type="text"
                    id="dtdc-plus-from"
                    value={dtdcPlusSlips.from}
                    onChange={(e) => setDtdcPlusSlips(prev => ({ ...prev, from: e.target.value }))}
                    placeholder="e.g., DTDC+001, 1001, A001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dtdc-plus-to" className="block text-sm font-medium text-gray-700 mb-2">
                    To <span className="text-gray-500">(Ending slip number)</span>
                  </label>
                  <input
                    type="text"
                    id="dtdc-plus-to"
                    value={dtdcPlusSlips.to}
                    onChange={(e) => setDtdcPlusSlips(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="e.g., DTDC+002, 1002, A002"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="dtdc-plus-unused" className="block text-sm font-medium text-gray-700 mb-2">
                    Unused Slips <span className="text-gray-500">(Comma-separated)</span>
                  </label>
                  <textarea
                    id="dtdc-plus-unused"
                    value={dtdcPlusSlips.unused}
                    onChange={(e) => setDtdcPlusSlips(prev => ({ ...prev, unused: e.target.value }))}
                    placeholder="List all available/unused DTDC Plus slip numbers (comma-separated)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="dtdc-plus-used" className="block text-sm font-medium text-gray-700 mb-2">
                    Used Slips <span className="text-gray-500">(Comma-separated)</span>
                  </label>
                  <textarea
                    id="dtdc-plus-used"
                    value={dtdcPlusSlips.used}
                    onChange={(e) => setDtdcPlusSlips(prev => ({ ...prev, used: e.target.value }))}
                    placeholder="List all used/consumed DTDC Plus slip numbers (comma-separated)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={processDtdcPlusSlipsRange}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Process Range
                </button>
                <button
                  onClick={saveDtdcPlusSlips}
                  disabled={savingSections['dtdc-plus-slips']}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSections['dtdc-plus-slips'] ? 'Saving...' : 'Save DTDC Plus Slips'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
