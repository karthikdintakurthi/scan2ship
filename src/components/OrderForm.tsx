'use client'

import { useState, useCallback, useEffect } from 'react'
import { getOrderFormConfig } from '@/lib/order-form-config'
import { usePickupLocation } from '@/hooks/usePickupLocation'
import { useAuth } from '@/contexts/AuthContext'
import { getPickupLocationConfig } from '@/lib/pickup-location-config'
import { getCourierServiceByValue, validateCourierServiceRestrictions } from '@/lib/courier-service-config'
import { getOrderConfig, validateOrderData } from '@/lib/order-config'
import { OrderItem } from '@/types/catalog'



interface AddressFormData {
  customer_name: string
  mobile_number: string
  address: string
  city: string
  state: string
  country: string
  pincode: string
  tracking_number: string
  reference_number: string
  reseller_name: string
  reseller_mobile: string
  courier_service: string
  package_value: string
  weight: string
  total_items: string
  is_cod: boolean
  cod_amount: string
  pickup_location: string
  product_description: string
  skip_tracking: boolean
}

interface OrderFormProps {
  selectedProducts?: OrderItem[];
  onOrderSuccess?: () => void;
}

export default function OrderForm({ selectedProducts = [], onOrderSuccess }: OrderFormProps) {
  const { refreshCredits, currentClient, currentSession } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'idle' | 'creating' | 'completed'>('idle')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Dynamic configuration state
  const [orderConfig, setOrderConfig] = useState<any>(null)
  const [clientOrderConfig, setClientOrderConfig] = useState<any>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  
  // Use the persistent pickup location hook
  const { selectedPickupLocation, updatePickupLocation, pickupLocations, isLoaded } = usePickupLocation()
  
  const [formData, setFormData] = useState<AddressFormData>({
    customer_name: '',
    mobile_number: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    tracking_number: '',
    reference_number: '',
    reseller_name: '',
    reseller_mobile: '',
            courier_service: '', // Will be set from config when loaded
    package_value: '5000',
    weight: '100',
    total_items: '1',
    is_cod: false,
    cod_amount: '',
    pickup_location: '', // Will be set by the hook
    product_description: '',
    skip_tracking: false
  })
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  
  // Address processing state
  const [addressDetail, setAddressDetail] = useState('')
  const [isProcessingAddress, setIsProcessingAddress] = useState(false)
  const [addressProcessingError, setAddressProcessingError] = useState('')
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageProcessingError, setImageProcessingError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  // Load dynamic configuration
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log('🔍 [ORDER_FORM] Loading dynamic configuration...');
        
        // Load both order form config and client order config
        const [formConfig, clientConfig] = await Promise.all([
          getOrderFormConfig(),
          getOrderConfig()
        ]);
        
        setOrderConfig(formConfig);
        setClientOrderConfig(clientConfig);
        
        console.log('🔍 [ORDER_FORM] Client config loaded:', clientConfig);
        
        // Load saved courier service from localStorage if available
        const savedCourierService = localStorage.getItem('scan2ship_courier_service');
        console.log('🔍 [ORDER_FORM] Saved courier service from localStorage:', savedCourierService);
        
        // Clear invalid cached courier service (delhivery is no longer valid)
        if (savedCourierService === 'delhivery') {
          console.log('🧹 [ORDER_FORM] Clearing invalid cached courier service: delhivery');
          localStorage.removeItem('scan2ship_courier_service');
        }
        
        if (clientConfig) {
          // Log the initial package value for debugging
          console.log('🔍 [INITIAL_CONFIG] Client config defaultPackageValue:', clientConfig.defaultPackageValue);
          console.log('🔍 [INITIAL_CONFIG] Setting package_value to client setting');
          
          // Update form data with client-specific defaults
          setFormData(prev => ({
            ...prev,
            // Priority: Valid saved selection > User selection > Default from config
            courier_service: (savedCourierService && savedCourierService !== 'delhivery') || prev.courier_service || (formConfig.courierServices.length > 0 ? formConfig.courierServices[0].value : ''),
            package_value: clientConfig.defaultPackageValue.toString(),
            weight: clientConfig.defaultWeight.toString(),
            total_items: clientConfig.defaultTotalItems.toString(),
            is_cod: clientConfig.codEnabledByDefault,
            cod_amount: clientConfig.defaultCodAmount?.toString() || '',
            product_description: clientConfig.defaultProductDescription
          }));
        } else {
          console.warn('No client config available, using form config only');
        }
        
        setConfigLoaded(true);
        console.log('✅ [ORDER_FORM] Configuration loaded:', { formConfig, clientConfig });
        
        // Validate and fix courier service after config is loaded
        setTimeout(() => {
          setFormData(prev => {
            const validServices = formConfig.courierServices.map(s => s.value);
            if (prev.courier_service && !validServices.includes(prev.courier_service)) {
              console.log('🔧 [ORDER_FORM] Fixing invalid courier service:', prev.courier_service, '->', validServices[0]);
              return {
                ...prev,
                courier_service: validServices[0] || ''
              };
            }
            return prev;
          });
        }, 100);
      } catch (error) {
        console.error('❌ [ORDER_FORM] Error loading configuration:', error);
        setConfigLoaded(true);
      }
    };

    loadConfiguration();
  }, []);

  // Update form data when pickup location changes from the hook
  useEffect(() => {
    if (isLoaded && selectedPickupLocation && configLoaded) {
      const updatePickupLocationData = async () => {
        try {
          // Get the pickup location config to populate package value
          const pickupConfig = await getPickupLocationConfig(selectedPickupLocation);
          
          // Also refresh the order configuration to get latest client settings
          const [formConfig, clientConfig] = await Promise.all([
            getOrderFormConfig(),
            getOrderConfig()
          ]);
          
                    setOrderConfig(formConfig);
          setClientOrderConfig(clientConfig);
          
          if (clientConfig) {
            // Log the package value sources for debugging
            console.log('🔍 [PACKAGE_VALUE] Client config defaultPackageValue:', clientConfig.defaultPackageValue);
            console.log('🔍 [PACKAGE_VALUE] Pickup config commodity_value:', pickupConfig?.productDetails.commodity_value);
            console.log('🔍 [PACKAGE_VALUE] Using client setting for package value');
            
            setFormData(prev => ({
              ...prev,
              pickup_location: selectedPickupLocation,
              // Priority: Client settings first, then pickup location as fallback
              package_value: clientConfig.defaultPackageValue.toString(),
              // Preserve user's courier service selection - don't override it
              courier_service: prev.courier_service,
              weight: clientConfig.defaultWeight.toString(),
              total_items: clientConfig.defaultTotalItems.toString(),
              is_cod: clientConfig.codEnabledByDefault,
              cod_amount: clientConfig.defaultCodAmount?.toString() || '',
              product_description: clientConfig.defaultProductDescription
            }));
          } else {
            console.warn('No client config available, cannot update form data');
          }
        } catch (error) {
          console.error('❌ [ORDER_FORM] Error getting pickup location config:', error);
        }
      };

      updatePickupLocationData();
    }
  }, [selectedPickupLocation, isLoaded, configLoaded]);

  // Auto-fill DTDC tracking number when component loads and DTDC is pre-selected
  useEffect(() => {
    if (configLoaded && formData.courier_service && typeof formData.courier_service === 'string' && formData.courier_service.toLowerCase() === 'dtdc' && !formData.tracking_number.trim()) {
      console.log('🔍 [ORDER_FORM] DTDC pre-selected on load, auto-filling tracking number...');
      // Use setTimeout to ensure this runs after the component is fully rendered
      setTimeout(() => {
        autoFillDtdcTrackingNumber();
      }, 100);
    }
  }, [configLoaded, formData.courier_service]);

  // Auto-refresh configuration every 5 minutes to ensure data is current
  useEffect(() => {
    const interval = setInterval(() => {
      if (configLoaded) {
        console.log('🔄 [ORDER_FORM] Auto-refreshing configuration...');
                    // Reload configuration
            const reloadConfig = async () => {
              try {
                const [formConfig, clientConfig] = await Promise.all([
                  getOrderFormConfig(),
                  getOrderConfig()
                ]);
            
                          setOrderConfig(formConfig);
              setClientOrderConfig(clientConfig);
              
              if (clientConfig) {
                // Log the auto-refresh package value for debugging
                console.log('🔍 [AUTO_REFRESH] Client config defaultPackageValue:', clientConfig.defaultPackageValue);
                console.log('🔍 [AUTO_REFRESH] Updating package_value to client setting');
                
                // Update form data with latest client configuration
                setFormData(prev => ({
                  ...prev,
                  // Preserve user's courier service selection - don't override it
                  courier_service: prev.courier_service,
                  package_value: clientConfig.defaultPackageValue.toString(),
                  weight: clientConfig.defaultWeight.toString(),
                  total_items: clientConfig.defaultTotalItems.toString(),
                  is_cod: clientConfig.codEnabledByDefault,
                  cod_amount: clientConfig.defaultCodAmount?.toString() || '',
                  product_description: clientConfig.defaultProductDescription
                }));
              } else {
                console.warn('No client config available during auto-refresh');
              }
          } catch (error) {
            console.error('Error auto-refreshing config:', error);
          }
        };
        reloadConfig();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [configLoaded]);

  // Generate random 6-digit alphanumeric order number with mobile
  const generateOrderNumber = useCallback((mobileNumber: string) => {
    if (orderNumber) {
      return orderNumber
    }
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    const finalOrderNumber = mobileNumber && mobileNumber.trim() !== '' 
      ? `${result}-${mobileNumber}` 
      : `${result}-NO_MOBILE`
    
    setOrderNumber(finalOrderNumber)
    return finalOrderNumber
  }, [orderNumber])

  const handleInputChange = (field: keyof AddressFormData, value: string) => {
    console.log('🔍 [FORM_INPUT] Field change:', field, 'Value:', value)
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      }
      console.log('🔍 [FORM_INPUT] Updated form data:', updated)
      return updated
    })
  }

  const handleBooleanChange = (field: keyof AddressFormData, value: boolean) => {
    console.log('🔍 [FORM_INPUT] Boolean field change:', field, 'Value:', value)
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      }
      console.log('🔍 [FORM_INPUT] Updated form data:', updated)
      return updated
    })
  }

  const handleFormFieldChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle courier service change with auto-population of defaults
  const handleCourierServiceChange = async (courierService: string) => {
    const { getCourierServiceByValue } = await import('@/lib/courier-service-config')
    const serviceConfig = await getCourierServiceByValue(courierService)
    
    // Check if courier service actually changed
    const courierServiceChanged = formData.courier_service !== courierService
    
    // Save courier service selection to localStorage for persistence
    localStorage.setItem('scan2ship_courier_service', courierService);
    console.log('💾 [ORDER_FORM] Saved courier service to localStorage:', courierService);
    
    setFormData(prev => ({
      ...prev,
      courier_service: courierService,
      // Only clear tracking number if courier service actually changed
      tracking_number: courierServiceChanged ? '' : prev.tracking_number,
      // Auto-populate default values if they're empty or if user wants to update
      weight: prev.weight || (serviceConfig?.defaultWeight?.toString() || prev.weight),
      package_value: prev.package_value || (serviceConfig?.defaultPackageValue?.toString() || prev.package_value)
    }))

    // Auto-fill tracking number if DTDC is selected and tracking number is empty
    if (courierService.toLowerCase() === 'dtdc' && courierServiceChanged) {
      await autoFillDtdcTrackingNumber()
    }
  }

  // Function to auto-fill DTDC tracking number from available slips
  const autoFillDtdcTrackingNumber = async () => {
    try {
      console.log('🔍 [DTDC_AUTO_FILL] Starting auto-fill process...');
      
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.log('❌ [DTDC_AUTO_FILL] No auth token found');
        return
      }

      console.log('🔍 [DTDC_AUTO_FILL] Fetching DTDC slips from API...');
      const response = await fetch('/api/dtdc-slips', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('🔍 [DTDC_AUTO_FILL] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 [DTDC_AUTO_FILL] API response data:', data);
        
        if (data.success && data.dtdcSlips && data.dtdcSlips.unused) {
          // Get the first available unused tracking number
          const unusedNumbers = data.dtdcSlips.unused.split(',').map((num: string) => num.trim()).filter(Boolean)
          console.log('🔍 [DTDC_AUTO_FILL] Unused numbers found:', unusedNumbers);
          
          if (unusedNumbers.length > 0) {
            const firstAvailable = unusedNumbers[0]
            console.log('🔍 [DTDC_AUTO_FILL] Setting tracking number to:', firstAvailable);
            
            setFormData(prev => ({
              ...prev,
              tracking_number: firstAvailable
            }))
            console.log('✅ [DTDC_AUTO_FILL] Auto-filled tracking number:', firstAvailable)
          } else {
            console.log('⚠️ [DTDC_AUTO_FILL] No unused tracking numbers available');
          }
        } else {
          console.log('⚠️ [DTDC_AUTO_FILL] Invalid or empty DTDC slips data:', data);
        }
      } else {
        console.log('❌ [DTDC_AUTO_FILL] API request failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ [DTDC_AUTO_FILL] Error auto-filling DTDC tracking number:', error)
    }
  }

  // Function to move used DTDC tracking number from unused to used section
  const moveDtdcTrackingNumberToUsed = async (trackingNumber: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      // First, get current DTDC slips configuration
      const getResponse = await fetch('/api/dtdc-slips', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!getResponse.ok) {
        console.error('❌ [DTDC_MOVE] Failed to fetch current DTDC slips configuration')
        return
      }

      const currentData = await getResponse.json()
      if (!currentData.success || !currentData.dtdcSlips) {
        console.error('❌ [DTDC_MOVE] Invalid DTDC slips data')
        return
      }

      const { unused, used } = currentData.dtdcSlips
      
      // Remove the tracking number from unused section
      const unusedNumbers = unused.split(',').map((num: string) => num.trim()).filter((num: string) => num !== trackingNumber)
      const newUnused = unusedNumbers.join(', ')
      
      // Add the tracking number to used section
      const usedNumbers = used.split(',').map((num: string) => num.trim()).filter(Boolean)
      usedNumbers.push(trackingNumber)
      const newUsed = usedNumbers.join(', ')

      // Update the DTDC slips configuration
      const updateResponse = await fetch('/api/dtdc-slips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dtdcSlips: {
            ...currentData.dtdcSlips,
            unused: newUnused,
            used: newUsed
          }
        })
      })

      if (updateResponse.ok) {
        console.log('✅ [DTDC_MOVE] Successfully moved tracking number to used section:', trackingNumber)
      } else {
        console.error('❌ [DTDC_MOVE] Failed to update DTDC slips configuration')
      }
    } catch (error) {
      console.error('❌ [DTDC_MOVE] Error moving DTDC tracking number to used section:', error)
    }
  }

  const processAddress = async () => {
    if (!addressDetail.trim()) {
      setAddressProcessingError('Please enter an address to process')
      return
    }

    setIsProcessingAddress(true)
    setAddressProcessingError('')

    try {
      // Track OpenAI address processing event
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            eventType: 'openai_address',
            eventData: { addressLength: addressDetail.length }
          })
        });
      } catch (analyticsError) {
        console.warn('Failed to track address processing analytics:', analyticsError);
      }

      const response = await fetch('/api/format-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ addressText: addressDetail }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.formattedAddress) {
        const formatted = data.formattedAddress
        
        // Auto-fill form fields with formatted address data
        setFormData(prev => ({
          ...prev,
          customer_name: formatted.customer_name || prev.customer_name,
          mobile_number: formatted.mobile_number || prev.mobile_number,
          address: formatted.address || prev.address,
          city: formatted.city || prev.city,
          state: formatted.state || prev.state,
          pincode: formatted.pincode || prev.pincode,
          reseller_name: formatted.reseller_name || prev.reseller_name,
          reseller_mobile: formatted.reseller_mobile || prev.reseller_mobile,
          tracking_number: formatted.tracking_number || prev.tracking_number,
        }))
        
        setSuccess('Address processed successfully! Form fields have been auto-filled.')
        setTimeout(() => setSuccess(''), 5000)
        
        // Refresh credit balance after successful text processing
        refreshCredits();
      } else {
        throw new Error(data.error || 'Failed to process address')
      }
    } catch (error) {
      console.error('Error processing address:', error)
      setAddressProcessingError(error instanceof Error ? error.message : 'Failed to process address')
    } finally {
      setIsProcessingAddress(false)
    }
  }

  const processImage = async (file?: File) => {
    const imageToProcess = file || selectedImage
    if (!imageToProcess) {
      setImageProcessingError('Please select an image to process')
      return
    }

    setIsProcessingImage(true)
    setImageProcessingError('')

    try {
      // Track OpenAI image processing event
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            eventType: 'openai_image',
            eventData: { 
              imageSize: imageToProcess.size,
              imageType: imageToProcess.type,
              imageName: imageToProcess.name
            }
          })
        });
      } catch (analyticsError) {
        console.warn('Failed to track image processing analytics:', analyticsError);
      }

      const formData = new FormData()
      formData.append('image', imageToProcess)

      const response = await fetch('/api/format-address-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.formattedAddress) {
        const formatted = data.formattedAddress
        
        // Auto-fill form fields with formatted address data
        setFormData(prev => ({
          ...prev,
          customer_name: formatted.customer_name || prev.customer_name,
          mobile_number: formatted.mobile_number || prev.mobile_number,
          address: formatted.address || prev.address,
          city: formatted.city || prev.city,
          state: formatted.state || prev.state,
          pincode: formatted.pincode || prev.pincode,
          reseller_name: formatted.reseller_name || prev.reseller_name,
          reseller_mobile: formatted.reseller_mobile || prev.reseller_mobile,
          tracking_number: formatted.tracking_number || prev.tracking_number,
        }))
        
        setSuccess('Image processed successfully! Form fields have been auto-filled.')
        setTimeout(() => setSuccess(''), 5000)
        
        // Refresh credit balance after successful image processing
        refreshCredits();
      } else {
        throw new Error(data.error || 'Failed to process image')
      }
    } catch (error) {
      console.error('Error processing image:', error)
      setImageProcessingError(error instanceof Error ? error.message : 'Failed to process image')
    } finally {
      setIsProcessingImage(false)
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageProcessingError('Please select a valid image file')
      return
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setImageProcessingError('Image size should be less than 5MB')
      return
    }
    
    setSelectedImage(file)
    setImageProcessingError('')
    
    // Create preview and auto-process
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
      // Auto-trigger image processing with the file directly
      processImage(file)
    }
    reader.readAsDataURL(file)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      processFile(file)
    }
  }

  const clearImage = () => {
    // Scroll to top of the page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    setSelectedImage(null)
    setImagePreview(null)
    setImageProcessingError('')
    setIsDragOver(false)
    // Clear form - preserve Order Details fields, only reset customer info and tracking number
    setFormData(prev => ({
      ...prev,
      // Reset customer information fields
      customer_name: '',
      mobile_number: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      tracking_number: '', // Only reset tracking number
      reseller_name: '',
      reseller_mobile: '',
      skip_tracking: false, // Reset skip tracking
      // Keep Order Details fields unchanged (courier_service, package_value, weight, total_items, is_cod, cod_amount, product_description)
      // Keep pickup_location unchanged
    }))
    setAddressDetail('')
    setAddressProcessingError('')
    setError('')
    setSuccess('')
    setCurrentStep('idle')
    setOrderNumber(null)
  }

  // Mobile number validation function
  const validateMobileNumber = (mobile: string): boolean => {
    // Remove any non-digit characters
    const cleanMobile = mobile.replace(/\D/g, '');
    
    // Handle different cases:
    // 1. 10 digits starting with 6-9 (direct mobile number)
    // 2. 12 digits starting with 91 (country code + mobile)
    // 3. 13 digits starting with 91 (country code + mobile with leading 0)
    
    if (cleanMobile.length === 10) {
      return /^[6-9]\d{9}$/.test(cleanMobile);
    } else if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      const mobilePart = cleanMobile.substring(2);
      return /^[6-9]\d{9}$/.test(mobilePart);
    } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
      const mobilePart = cleanMobile.substring(3); // Remove 91 and leading 0
      return /^[6-9]\d{9}$/.test(mobilePart);
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPickupLocation) {
      setError('Please select a pickup location first')
      return
    }

    if (!formData.customer_name || !formData.mobile_number || !formData.address || !formData.pincode || !formData.product_description) {
      setError('Please fill in all required fields')
      return
    }

    // Validate mobile number format
    if (!validateMobileNumber(formData.mobile_number)) {
      setError('Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9')
      return
    }

    // Validate product stock before order submission
    if (selectedProducts.length > 0) {
      console.log('📦 [ORDER_FORM] Validating product stock before order submission');
      for (const item of selectedProducts) {
        const product = item.product;
        const currentStock = product.stockLevel || 0;
        const minStock = product.minStock || 0;
        const requestedQuantity = item.quantity;
        
        console.log(`📦 [STOCK_VALIDATION] ${product.name}: Stock=${currentStock}, Min=${minStock}, Requested=${requestedQuantity}, IsPreorder=${item.isPreorder}`);
        
        // Skip stock validation for preorder items
        if (item.isPreorder) {
          console.log(`📦 [STOCK_VALIDATION] ${product.name} is a preorder - skipping stock validation`);
          continue;
        }
        
        if (currentStock <= 0) {
          setError(`${product.name} is out of stock (Stock: ${currentStock}). Please remove it from the order or add it as a preorder.`);
          return;
        }
        
        const remainingStock = currentStock - requestedQuantity;
        if (remainingStock < minStock) {
          const maxAllowedQuantity = currentStock - minStock;
          setError(`${product.name} - Cannot order ${requestedQuantity} units. Maximum allowed: ${maxAllowedQuantity} (to maintain minimum stock of ${minStock}). Consider adding as preorder instead.`);
          return;
        }
      }
      console.log('✅ [ORDER_FORM] All products have sufficient stock or are preorders');
    }


    // Validate reseller mobile number if provided
    if (formData.reseller_mobile && !validateMobileNumber(formData.reseller_mobile)) {
      setError('Reseller mobile number must be exactly 10 digits and start with 6, 7, 8, or 9')
      return
    }

    // Tracking number is now optional for all courier services
    // No validation needed here

    // Validate courier service restrictions
    console.log('🔍 [ORDER_FORM] Validating courier service:', formData.courier_service)
    
    try {
      const { validateCourierServiceRestrictions } = await import('@/lib/courier-service-config');
      const courierValidation = await validateCourierServiceRestrictions(
        formData.courier_service,
        parseFloat(formData.weight) || 0,
        parseFloat(formData.package_value) || 0,
        [formData.product_description]
      )
      
      if (!courierValidation.isValid) {
        console.error('❌ [ORDER_FORM] Courier validation failed:', courierValidation.errors)
        setError(`Courier service validation failed: ${courierValidation.errors.join(', ')}`)
        return
      }
    } catch (error) {
      console.error('❌ [ORDER_FORM] Error during courier validation:', error)
      // Continue with order creation even if validation fails
    }

    // Validate order data using client-specific rules
    console.log('🔍 [ORDER_FORM] Validating order data with client-specific rules')
    
    try {
      const orderValidation = await validateOrderData({
        package_value: parseFloat(formData.package_value) || 0,
        weight: parseFloat(formData.weight) || 0,
        total_items: parseInt(formData.total_items) || 0,
        product_description: formData.product_description
      })
      
      if (!orderValidation.isValid) {
        console.error('❌ [ORDER_FORM] Order validation failed:', orderValidation.errors)
        setError(`Order validation failed: ${orderValidation.errors.join(', ')}`)
        return
      }
    } catch (error) {
      console.error('❌ [ORDER_FORM] Error during order validation:', error)
      // Continue with order creation even if validation fails
    }

    setIsProcessing(true)
    setError('')
    setCurrentStep('creating')

    try {
      // Determine order creation pattern
      let creationPattern = 'manual';
      
      // Check if this was a text AI order (address was processed)
      if (addressDetail.trim() && formData.address && formData.customer_name) {
        creationPattern = 'text_ai';
      }
      
      // Check if this was an image AI order (image was processed)
      if (selectedImage || imagePreview) {
        creationPattern = 'image_ai';
      }

      // Use company name and phone if reseller fields are empty (only if enabled in client settings)
      let resellerName = formData.reseller_name.trim();
      let resellerMobile = formData.reseller_mobile.trim();
      
      // Check if reseller fallback is enabled in client configuration
      if (clientOrderConfig?.enableResellerFallback) {
        resellerName = resellerName || currentClient?.companyName || '';
        resellerMobile = resellerMobile || currentClient?.phone || '';
        
        // Debug logging for reseller field fallback
        console.log('🔍 [ORDER_FORM] Reseller field fallback ENABLED:');
        console.log('  - formData.reseller_name:', formData.reseller_name);
        console.log('  - formData.reseller_mobile:', formData.reseller_mobile);
        console.log('  - currentClient?.companyName:', currentClient?.companyName);
        console.log('  - currentClient?.phone:', currentClient?.phone);
        console.log('  - Final reseller_name:', resellerName);
        console.log('  - Final reseller_mobile:', resellerMobile);
      } else {
        // Debug logging for reseller field fallback disabled
        console.log('🔍 [ORDER_FORM] Reseller field fallback DISABLED:');
        console.log('  - Using only form values without fallback');
        console.log('  - Final reseller_name:', resellerName);
        console.log('  - Final reseller_mobile:', resellerMobile);
      }

      const orderData = {
        name: formData.customer_name,
        mobile: formData.mobile_number,
        phone: formData.mobile_number, // Use mobile number as phone
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,
        courier_service: formData.courier_service,
        pickup_location: selectedPickupLocation,
        package_value: formData.package_value,
        weight: formData.weight,
        total_items: formData.total_items,
        is_cod: formData.is_cod,
        cod_amount: formData.cod_amount,
        reseller_name: resellerName,
        reseller_mobile: resellerMobile,
        product_description: formData.product_description,
        waybill: formData.tracking_number,
        reference_number: formData.reference_number,
        skip_tracking: formData.skip_tracking,
        creationPattern, // Add creation pattern to order data
        // Include product details if any products were selected
        products: selectedProducts.length > 0 ? selectedProducts.map(item => {
          console.log('🔍 [ORDER_FORM] Mapping product for order:', {
            sku: item.product.sku,
            name: item.product.name,
            thumbnailUrl: item.product.thumbnailUrl,
            isPreorder: item.isPreorder
          });
          return {
            sku: item.product.sku,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            thumbnailUrl: item.product.thumbnailUrl,
            isPreorder: item.isPreorder || false
          };
        }) : undefined
      }

      // Debug logging to see what values are being sent
      console.log('🔍 [ORDER_FORM] Form data debug:')
      console.log('  - formData.mobile_number:', formData.mobile_number)
      console.log('  - orderData.mobile:', orderData.mobile)
      console.log('  - orderData.phone:', orderData.phone)
      console.log('  - Full orderData:', orderData)

      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // Handle specific Delhivery API errors
        if (result.error === 'Delhivery API failed') {
          const errorMessage = result.details || result.delhiveryError || 'Delhivery API failed. Please check your pickup location configuration and try again.';
          throw new Error(`Delhivery Error: ${errorMessage}`);
        }
        
        // Handle other API errors
        throw new Error(result.error || result.details || 'Failed to create order')
      }
      
      if (result.success) {
        setCurrentStep('completed')
        setSuccess(`Order created successfully! Order Number: ${result.order.referenceNumber}`)
        
        // Update inventory in catalog-app if products were selected
        if (selectedProducts.length > 0) {
          try {
            console.log('🔄 [ORDER_FORM] Updating inventory in catalog-app...');
            const inventoryItems = selectedProducts.map(item => ({
              sku: item.product.sku,
              quantity: item.quantity,
              isPreorder: item.isPreorder || false
            }));

            // Call catalog API to reduce inventory
            const inventoryResponse = await fetch('/api/catalog', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession?.token}`,
              },
              body: JSON.stringify({
                action: 'reduce_inventory',
                data: { items: inventoryItems, orderNumber: result.order.orderNumber }
              }),
            });
            
            if (inventoryResponse.ok) {
              const data = await inventoryResponse.json();
              if (data.data?.allItemsAvailable) {
                console.log('✅ [ORDER_FORM] Inventory updated successfully in catalog-app');
              } else {
                console.warn('⚠️ [ORDER_FORM] Some items were not available in inventory');
              }
            } else {
              console.warn('⚠️ [ORDER_FORM] Failed to update inventory in catalog-app');
            }
          } catch (inventoryError) {
            console.error('❌ [ORDER_FORM] Failed to update inventory in catalog-app:', inventoryError);
            // Don't fail the order creation if inventory update fails
            setError(prev => prev + ' (Note: Order created but inventory update failed)');
          }
        }
        
        // Call the success callback to reset product selection
        if (onOrderSuccess) {
          console.log('🔄 [ORDER_FORM] Calling onOrderSuccess callback');
          onOrderSuccess();
        } else {
          console.log('⚠️ [ORDER_FORM] onOrderSuccess callback not provided');
        }
        
        // Refresh credit balance immediately after successful order creation
        refreshCredits();
        
        // Move used DTDC tracking number from unused to used section if applicable
        if (formData.courier_service && typeof formData.courier_service === 'string' && formData.courier_service.toLowerCase() === 'dtdc' && formData.tracking_number.trim()) {
          await moveDtdcTrackingNumberToUsed(formData.tracking_number)
        }
        
        // Scroll to top of the page for better UX when entering next order
        window.scrollTo({ top: 0, behavior: 'smooth' })
        
        // Reset form - preserve Order Details fields, only reset customer info and tracking number
        setFormData(prev => ({
          ...prev,
          // Reset customer information fields
          customer_name: '',
          mobile_number: '',
          address: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
          tracking_number: '', // Only reset tracking number
        reference_number: '', // Reset reference number
          reseller_name: '',
          reseller_mobile: '',
          skip_tracking: false, // Reset skip tracking
          // Keep Order Details fields unchanged (courier_service, package_value, weight, total_items, is_cod, cod_amount, product_description)
          // Keep pickup_location unchanged
        }))
        
        // Trigger DTDC auto-fill after successful order creation
        if (formData.courier_service && typeof formData.courier_service === 'string' && formData.courier_service.toLowerCase() === 'dtdc') {
          console.log('🔄 [ORDER_FORM] Triggering DTDC auto-fill after successful order creation...');
          console.log('🔄 [ORDER_FORM] Current courier service:', formData.courier_service);
          console.log('🔄 [ORDER_FORM] Current tracking number:', formData.tracking_number);
          
          // Use setTimeout to ensure the form reset is complete before triggering the auto-fill
          setTimeout(async () => {
            console.log('🔄 [ORDER_FORM] Executing DTDC auto-fill after timeout...');
            try {
              await autoFillDtdcTrackingNumber();
              console.log('✅ [ORDER_FORM] DTDC auto-fill completed successfully');
            } catch (error) {
              console.error('❌ [ORDER_FORM] Error during DTDC auto-fill:', error);
            }
          }, 100);
        }
        
        // Clear address processing fields
        setAddressDetail('')
        setSelectedImage(null)
        setImagePreview(null)
        setImageProcessingError('')
        setAddressProcessingError('')
        
        setOrderNumber(null)
      } else {
        throw new Error(result.error || 'Failed to create order')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      setError(error instanceof Error ? error.message : 'Failed to create order')
      setCurrentStep('idle')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    // Scroll to top of the page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    setFormData(prev => ({
      ...prev,
      // Reset customer information fields
      customer_name: '',
      mobile_number: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
              tracking_number: '', // Reset tracking number
        reference_number: '', // Reset reference number
      reseller_name: '',
      reseller_mobile: '',
      skip_tracking: false, // Reset skip tracking
      // Keep Order Details fields unchanged (package_value, weight, total_items, is_cod, cod_amount, product_description)
      // Keep pickup_location and courier_service unchanged (part of pickup location configuration)
    }))
    setAddressDetail('')
    setSelectedImage(null)
    setImagePreview(null)
    setImageProcessingError('')
    setAddressProcessingError('')
    setError('')
    setSuccess('')
    setCurrentStep('idle')
    setOrderNumber(null)
    
    // Trigger DTDC auto-fill after manual form reset
    if (formData.courier_service && typeof formData.courier_service === 'string' && formData.courier_service.toLowerCase() === 'dtdc') {
      console.log('🔄 [ORDER_FORM] Triggering DTDC auto-fill after manual form reset...');
      console.log('🔄 [ORDER_FORM] Current courier service:', formData.courier_service);
      console.log('🔄 [ORDER_FORM] Current tracking number:', formData.tracking_number);
      
      // Use setTimeout to ensure the form reset is complete before triggering the auto-fill
      setTimeout(async () => {
        console.log('🔄 [ORDER_FORM] Executing DTDC auto-fill after timeout...');
        try {
          await autoFillDtdcTrackingNumber();
          console.log('✅ [ORDER_FORM] DTDC auto-fill completed successfully');
        } catch (error) {
          console.error('❌ [ORDER_FORM] Error during DTDC auto-fill:', error);
        }
      }, 100);
    }
  }

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading pickup locations...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Common Pickup Location Section */}
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-xl font-semibold text-blue-800 mb-4">
          📍 Pickup Location Configuration
        </h3>
        <p className="text-blue-700 mb-4">
          This pickup location will be used for all orders created from both methods.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="courier_service" className="block text-sm font-medium text-blue-800 mb-2">
              Courier Service
            </label>
            <select
              id="courier_service"
              value={formData.courier_service}
              onChange={(e) => handleCourierServiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {orderConfig?.courierServices.map((service: any) => (
                <option key={service.value} value={service.value}>
                  {service.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="commonPickupLocation" className="block text-sm font-medium text-blue-800 mb-2">
              Pickup Location *
            </label>
            <select
              id="commonPickupLocation"
              value={selectedPickupLocation}
              onChange={(e) => updatePickupLocation(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select pickup location</option>
              {pickupLocations.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tracking_number" className="block text-sm font-medium text-blue-800 mb-2">
              Tracking Number
              <span className="text-xs text-blue-600 ml-2">(Optional)</span>
            </label>
            <input
              type="text"
              id="tracking_number"
              value={formData.tracking_number}
              onChange={(e) => handleInputChange('tracking_number', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              placeholder="Enter tracking number (optional)"
                              required={false}
            />
            {/* DTDC Auto-fill indicator */}
            {formData.courier_service && typeof formData.courier_service === 'string' && formData.courier_service.toLowerCase() === 'dtdc' && formData.tracking_number && (
              <div className="mt-1 flex items-center">
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  🔄 Auto-filled from DTDC slips
                </span>
                <button
                  type="button"
                  onClick={autoFillDtdcTrackingNumber}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Get next available
                </button>
              </div>
            )}
            
            {/* Skip Tracking Checkbox */}
            <div className="mt-3 flex items-center">
              <input
                type="checkbox"
                id="skip_tracking"
                checked={formData.skip_tracking}
                onChange={(e) => handleBooleanChange('skip_tracking', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="skip_tracking" className="ml-2 text-sm text-gray-700">
                Don't assign tracking
                <span className="text-xs text-gray-500 ml-1">(Skip Delhivery API call)</span>
              </label>
            </div>
            {formData.skip_tracking && (
              <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded">
                ⚠️ Order will be saved in Scan2Ship database only. No tracking will be assigned via Delhivery API.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reference_number" className="block text-sm font-medium text-blue-800 mb-2">
              Reference Number
              <span className="text-xs text-blue-600 ml-2">(Optional - Auto-generated if empty)</span>
            </label>
            <input
              type="text"
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => handleInputChange('reference_number', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              placeholder="Enter custom reference (e.g., ABC123) or leave empty for auto-generation"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: {formData.reference_number ? `${formData.reference_number}-${formData.mobile_number.replace(/\D/g, '').slice(-10)}` : 'ALPHANUMERIC-MOBILE'}
            </p>
          </div>
        </div>
      </div>

      {/* Success Message - Moved to top */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start">
            <div className="text-green-600 mr-2">✅</div>
            <div className="text-green-800">{success}</div>
          </div>
        </div>
      )}

      {/* Order Creation Form */}
      {selectedPickupLocation && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Address Detail Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-4">📍 Address Detail</h3>
            
            {/* Image Upload Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-700 mb-2">
                📷 Upload Address Image (Optional)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  selectedImage
                    ? 'border-green-400 bg-green-50'
                    : isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-blue-300 hover:border-blue-400 bg-white'
                }`}
                onClick={() => document.getElementById('imageInput')?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto max-h-32 w-auto rounded-lg shadow-sm border border-gray-200 image-preview"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                    <div className="flex justify-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          processImage()
                        }}
                        disabled={isProcessingImage}
                        className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                          isProcessingImage
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isProcessingImage ? (
                          <>
                            <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                            Processing...
                          </>
                        ) : (
                          '🔄 Process Image'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearImage()
                        }}
                        className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        ❌ Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📷</div>
                    {isDragOver ? (
                      <>
                        <p className="text-blue-600 font-medium">Drop image here</p>
                        <p className="text-xs text-blue-600 mt-1">Release to upload</p>
                      </>
                    ) : (
                      <>
                        <p className="text-blue-600 font-medium">Click to upload image</p>
                        <p className="text-blue-700 font-medium">or drag and drop</p>
                        <p className="text-xs text-blue-600 mt-1">Supports: JPG, PNG, GIF (Max: 5MB)</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              {imageProcessingError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <div className="text-red-600 mr-2">❌</div>
                    <div className="text-red-800 text-sm">{imageProcessingError}</div>
                  </div>
                </div>
              )}
              {!imageProcessingError && isProcessingImage && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    <span className="text-green-800 text-sm">Processing image with AI...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4 flex items-center">
              <div className="flex-1 border-t border-blue-200"></div>
              <span className="px-3 text-sm text-blue-600 bg-blue-50">OR</span>
              <div className="flex-1 border-t border-blue-200"></div>
            </div>

            {/* Manual Address Input */}
            <div className={selectedImage ? 'opacity-50 pointer-events-none' : ''}>
              <label htmlFor="addressDetail" className="block text-sm font-medium text-blue-700 mb-2">
                ✍️ Paste the full address here
              </label>
              <textarea
                id="addressDetail"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                rows={4}
                disabled={!!selectedImage}
                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={selectedImage ? "Manual entry disabled while image is uploaded" : "Enter the complete address details here. This will help in processing the order accurately."}
              />
              <div className="text-xs text-blue-600 mt-1">
                💡 Tip: Include landmarks, building names, floor numbers, and any specific delivery instructions
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={processAddress}
                  disabled={isProcessingAddress || !addressDetail.trim() || !!selectedImage}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                    isProcessingAddress || !addressDetail.trim() || !!selectedImage
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isProcessingAddress ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></span>
                      Processing...
                    </>
                  ) : (
                    '🔄 Process Address'
                  )}
                </button>
              </div>
              {addressProcessingError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <div className="text-red-600 mr-2">❌</div>
                    <div className="text-red-800 text-sm">{addressProcessingError}</div>
                  </div>
                </div>
              )}
              {!addressProcessingError && isProcessingAddress && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    <span className="text-green-800 text-sm">Processing address with AI...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">👤 Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="mobile_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  id="mobile_number"
                  value={formData.mobile_number}
                  onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode *
                </label>
                <input
                  type="text"
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reseller Information */}
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🏪 Reseller Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              💡 <strong>Note:</strong> {clientOrderConfig?.enableResellerFallback ? 
                'If Reseller Name or Mobile are left empty, the system will automatically use your Company Name and Company Phone number respectively.' :
                'Reseller fallback is disabled. You must fill in both Reseller Name and Mobile fields.'
              }
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reseller_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Reseller Name
                </label>
                <input
                  type="text"
                  id="reseller_name"
                  value={formData.reseller_name}
                  onChange={(e) => handleInputChange('reseller_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {clientOrderConfig?.enableResellerFallback && !formData.reseller_name.trim() && currentClient?.companyName && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Will use Company Name: {currentClient.companyName}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="reseller_mobile" className="block text-sm font-medium text-gray-700 mb-1">
                  Reseller Mobile
                </label>
                <input
                  type="tel"
                  id="reseller_mobile"
                  value={formData.reseller_mobile}
                  onChange={(e) => handleInputChange('reseller_mobile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {clientOrderConfig?.enableResellerFallback && !formData.reseller_mobile.trim() && currentClient?.phone && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Will use Company Phone: {currentClient.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Order Details
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Courier Service and Tracking Number moved to Pickup Location Configuration above)
              </span>
              {!configLoaded && (
                <span className="text-blue-600 text-sm ml-2">
                  🔄 Loading client settings...
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label htmlFor="product_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Description {clientOrderConfig?.requireProductDescription && <span className="text-red-500">*</span>} 
                  <span className="text-blue-600 text-xs">(Auto-populated from client settings)</span>
                </label>
                <input
                  type="text"
                  id="product_description"
                  value={formData.product_description}
                  onChange={(e) => handleInputChange('product_description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={clientOrderConfig?.requireProductDescription}
                />
                {clientOrderConfig && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Default value from client settings: {clientOrderConfig.defaultProductDescription}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="package_value" className="block text-sm font-medium text-gray-700 mb-1">
                  Package Value (₹) {clientOrderConfig?.requirePackageValue && <span className="text-red-500">*</span>}
                  <span className="text-blue-600 text-xs">(Auto-populated from client settings)</span>
                </label>
                <input
                  type="number"
                  id="package_value"
                  value={formData.package_value}
                  onChange={(e) => handleInputChange('package_value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={clientOrderConfig?.minPackageValue}
                  max={clientOrderConfig?.maxPackageValue}
                  required={clientOrderConfig?.requirePackageValue}
                />
                {clientOrderConfig && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Default value from client settings: ₹{clientOrderConfig.defaultPackageValue}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (g) {clientOrderConfig?.requireWeight && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  id="weight"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={clientOrderConfig?.minWeight}
                  max={clientOrderConfig?.maxWeight}
                  required={clientOrderConfig?.requireWeight}
                />
                {clientOrderConfig && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Default value from client settings: {clientOrderConfig.defaultWeight}g
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="total_items" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Items {clientOrderConfig?.requireTotalItems && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  id="total_items"
                  value={formData.total_items}
                  onChange={(e) => handleInputChange('total_items', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={clientOrderConfig?.minTotalItems}
                  max={clientOrderConfig?.maxTotalItems}
                  required={clientOrderConfig?.requireTotalItems}
                />
                {clientOrderConfig && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Default value from client settings: {clientOrderConfig.defaultTotalItems}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_cod"
                    checked={formData.is_cod}
                    onChange={(e) => handleFormFieldChange('is_cod', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_cod" className="ml-2 block text-sm text-gray-700">
                    Cash on Delivery (COD)
                    <span className="text-blue-600 text-xs ml-1">(Configurable from client settings)</span>
                  </label>
                </div>
              </div>
              
              {formData.is_cod && (
                <div>
                  <label htmlFor="cod_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    COD Amount (₹)
                  </label>
                  <input
                    type="number"
                    id="cod_amount"
                    value={formData.cod_amount}
                    onChange={(e) => handleInputChange('cod_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Success/Error Messages */}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <div className="text-red-600 mr-2">❌</div>
                <div className="text-red-800">{error}</div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 mt-8">


            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reset Form
            </button>
            
            <button
              type="submit"
              disabled={isProcessing || !selectedPickupLocation}
              className={`px-6 py-3 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isProcessing || !selectedPickupLocation
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Creating Order...
                </>
              ) : (
                'Create Order'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Instructions when no pickup location selected */}
      {!selectedPickupLocation && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Select Pickup Location First
          </h3>
          <p className="text-gray-600">
            Please select a pickup location above to start creating orders.
          </p>
        </div>
      )}
    </div>
  )
}
