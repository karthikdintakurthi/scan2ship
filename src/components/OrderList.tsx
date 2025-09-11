'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { getPickupLocations } from '@/lib/order-form-config'
import { getActiveCourierServices } from '@/lib/courier-service-config'
import { useAuth } from '@/contexts/AuthContext'
import ExcelJS from 'exceljs'
import TrackingModal from './TrackingModal'
import TrackingStatusLabel from './TrackingStatusLabel'

interface Order {
  id: number
  clientId: string
  name: string
  mobile: string
  address: string
  city: string
  state: string
  country: string
  pincode: string
  courier_service: string
  pickup_location: string
  package_value: number
  weight: number
  total_items: number
  tracking_id?: string
  reference_number?: string
  is_cod: boolean
  cod_amount?: number
  reseller_name?: string
  reseller_mobile?: string
  created_at: string
  
  // Delhivery API fields
  delhivery_waybill_number?: string
  delhivery_order_id?: string
  delhivery_api_status?: string
  delhivery_tracking_status?: string
  delhivery_api_error?: string
  delhivery_retry_count?: number
  last_delhivery_attempt?: string
  
  // Shopify integration fields
  shopify_status?: string
  shopify_tracking_number?: string
  shopify_fulfillment_id?: string
  shopify_api_status?: string
  shopify_api_error?: string
  last_shopify_attempt?: string
  
  // Additional Delhivery fields
  shipment_length?: number
  shipment_breadth?: number
  shipment_width?: number
  shipment_height?: number
  product_description?: string
  return_address?: string
  return_pincode?: string
  fragile_shipment?: boolean
  seller_name?: string
  seller_address?: string
  
  seller_gst?: string
  invoice_number?: string
  commodity_value?: number
  tax_value?: number
  category_of_goods?: string
  vendor_pickup_location?: string
  
  // Additional fields from JSON data
  hsn_code?: string
  seller_cst_no?: string
  seller_tin?: string
  invoice_date?: string
  return_reason?: string
  ewbn?: string
}

export default function OrderList() {
  const { currentUser, currentClient } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [refreshingStatuses, setRefreshingStatuses] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState<{
    isRunning: boolean
    totalOrders: number
    processedOrders: number
    updatedOrders: number
    errors: number
    callsMade: number
    totalCallsNeeded: number
    currentCall: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Helper function to convert database status to UI label
  const getTrackingStatusLabel = (status: string) => {
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === 'delivered') {
      return '✅ Delivered';
    }
    
    if (lowerStatus === 'manifested' || lowerStatus === 'not picked' || lowerStatus === 'null') {
      return '⏳ Not Dispatched';
    }
    
    if (lowerStatus === 'returned') {
      return '↩️ Returned';
    }
    
    if (lowerStatus === 'failed') {
      return '❌ Failed';
    }
    
    if (lowerStatus === 'pending') {
      return '⏳ Pending';
    }
    
    // Everything else (in_transit, dispatched, success, etc.) → In Transit
    return '🚚 In Transit';
  };

  // Helper function to convert UI label back to database values for filtering
  const getTrackingStatusDbValue = (uiLabel: string) => {
    switch (uiLabel) {
      case '⏳ Not Dispatched':
        return 'null'; // Use null to match both null and manifested in database
      case '🚚 In Transit':
        return 'in_transit'; // Use in_transit to match in_transit, dispatched, success, etc.
      case '✅ Delivered':
        return 'delivered';
      case '↩️ Returned':
        return 'returned';
      case '❌ Failed':
        return 'failed';
      case '⏳ Pending':
        return 'pending';
      default:
        return uiLabel; // Return as-is if it's already a database value
    }
  };
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [retrying, setRetrying] = useState<number | null>(null)
  const [isFulfilling, setIsFulfilling] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Order>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPickupLocation, setSelectedPickupLocation] = useState('')
  const [selectedCourierService, setSelectedCourierService] = useState('')
  const [selectedTrackingStatus, setSelectedTrackingStatus] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef<number>(0)
  
  // Date range filter state
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [ordersPerPage] = useState(25)
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Tracking modal state
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null)
  
  
  
  // Dynamic configuration state
  const [pickupLocations, setPickupLocations] = useState<Array<{value: string, label: string}>>([])
  const [courierServices, setCourierServices] = useState<Array<{value: string, label: string}>>([])
  const [configLoaded, setConfigLoaded] = useState(false)
  const [thermalPrintEnabled, setThermalPrintEnabled] = useState(false)
  
  // Pagination helper variables
  const hasNextPage = currentPage < (totalPages || 1)
  const hasPrevPage = currentPage > 1

  // Helper functions to get human-readable labels
  const getCourierServiceLabel = (value: string) => {
    const service = courierServices.find(s => s.value === value);
    return service ? service.label : value;
  };

  const getPickupLocationLabel = (value: string) => {
    const location = pickupLocations.find(l => l.value === value);
    return location ? location.label : value;
  };

  // Load dynamic configuration
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        // Load pickup locations and courier services from API
        const config = await import('@/lib/order-form-config');
        const dynamicConfig = await config.getOrderFormConfig();
        
        setPickupLocations(dynamicConfig.pickupLocations);
        setCourierServices(dynamicConfig.courierServices);
        setConfigLoaded(true);
      } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback to default values
        setPickupLocations(getPickupLocations());
        const defaultCourierServices = await getActiveCourierServices();
        setCourierServices(defaultCourierServices.map(service => ({
          value: service.value,
          label: service.label
        })));
        setConfigLoaded(true);
      }
    };

    loadConfiguration();
  }, []);

  // Load thermal print setting
  useEffect(() => {
    const loadThermalPrintSetting = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/order-config', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setThermalPrintEnabled(data.orderConfig?.enableThermalPrint || false);
        }
      } catch (error) {
        console.error('Error loading thermal print setting:', error);
      }
    };

    loadThermalPrintSetting();
  }, []);

  // Initial load - only run once
  useEffect(() => {
    fetchOrders(1, '', '', '', '', '', '')
  }, [])

  // Debounced search with proper implementation
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const handleSearch = useCallback((searchValue: string) => {
    setSearchTerm(searchValue)
    setCurrentPage(1) // Reset to first page when searching
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // If search is cleared, fetch immediately
    if (!searchValue.trim()) {
      setSearchLoading(false)
      fetchOrders(1, '', fromDate, toDate, selectedPickupLocation, selectedCourierService)
      return
    }
    
    // Only search if at least 2 characters (improves performance and UX)
    if (searchValue.trim().length < 2) {
      setSearchLoading(false)
      return
    }
    
    // Show search loading indicator immediately
    setSearchLoading(true)
    
    // Set new timeout for debounced search
    const timeoutId = setTimeout(() => {
      fetchOrders(1, searchValue, fromDate, toDate, selectedPickupLocation, selectedCourierService)
      setSearchLoading(false)
    }, 500) // Increased to 500ms for better UX
    
    setSearchTimeout(timeoutId)
  }, [searchTimeout, fromDate, toDate, selectedPickupLocation, selectedCourierService])
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  // Handle pickup location change
  const handlePickupLocationChange = useCallback((pickupLocation: string) => {
    setSelectedPickupLocation(pickupLocation)
    setCurrentPage(1) // Reset to first page when filtering
    fetchOrders(1, searchTerm, fromDate, toDate, pickupLocation, selectedCourierService, selectedTrackingStatus)
  }, [searchTerm, fromDate, toDate, selectedCourierService, selectedTrackingStatus])

  // Handle courier service change
  const handleCourierServiceChange = useCallback((courierService: string) => {
    setSelectedCourierService(courierService)
    setCurrentPage(1) // Reset to first page when filtering
    fetchOrders(1, searchTerm, fromDate, toDate, selectedPickupLocation, courierService, selectedTrackingStatus)
  }, [searchTerm, fromDate, toDate, selectedPickupLocation, selectedTrackingStatus])

  // Handle tracking status change
  const handleTrackingStatusChange = useCallback((trackingStatus: string) => {
    setSelectedTrackingStatus(trackingStatus)
    setCurrentPage(1) // Reset to first page when filtering
    fetchOrders(1, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService, trackingStatus)
  }, [searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService])

  // Handle date range changes
  const handleDateRangeChange = useCallback((from: string, to: string) => {
    setFromDate(from)
    setToDate(to)
    setCurrentPage(1) // Reset to first page when filtering
    fetchOrders(1, searchTerm, from, to, selectedPickupLocation, selectedCourierService, selectedTrackingStatus)
  }, [searchTerm, selectedPickupLocation, selectedCourierService, selectedTrackingStatus])

  // Refresh all order statuses
  // Smart refresh all order statuses - processes ALL orders automatically
  const handleRefreshAllStatuses = useCallback(async () => {
    if (!currentClient?.id) {
      setError('Client information not available. Please refresh the page.')
      return
    }
    
    setRefreshingStatuses(true)
    setRefreshProgress({
      isRunning: true,
      totalOrders: 0,
      processedOrders: 0,
      updatedOrders: 0,
      errors: 0,
      callsMade: 0,
      totalCallsNeeded: 0,
      currentCall: 0
    })
    setError(null)
    
    try {
      console.log('🚀 Starting smart refresh for client:', currentClient.id)
      
      const response = await fetch('/api/cron/smart-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer default-cron-secret'
        },
        body: JSON.stringify({ 
          clientId: currentClient.id,
          triggerType: 'manual'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Smart refresh completed:', data)
        
        // Update progress with final results
        setRefreshProgress({
          isRunning: false,
          totalOrders: data.stats.totalOrders,
          processedOrders: data.stats.processedOrders,
          updatedOrders: data.stats.updatedOrders,
          errors: data.stats.errors,
          callsMade: data.stats.callsMade,
          totalCallsNeeded: data.stats.totalCallsNeeded,
          currentCall: data.stats.callsMade
        })
        
        // Refresh the current page to show updated statuses
        fetchOrders(currentPage, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService)
        
        // Clear progress after 5 seconds
        setTimeout(() => {
          setRefreshProgress(null)
        }, 5000)
        
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to refresh statuses')
        setRefreshProgress(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh statuses')
      setRefreshProgress(null)
    } finally {
      setRefreshingStatuses(false)
    }
  }, [currentClient?.id, currentPage, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService])

  // Clear date filters
  const clearDateFilters = () => {
    setFromDate('')
    setToDate('')
    setCurrentPage(1)
    fetchOrders(1, searchTerm, '', '', selectedPickupLocation, selectedCourierService, selectedTrackingStatus)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('')
    setFromDate('')
    setToDate('')
    setSelectedPickupLocation('')
    setSelectedCourierService('')
    setSelectedTrackingStatus('')
    setCurrentPage(1)
    fetchOrders(1, '', '', '', '', '', '')
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchOrders(page, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService, selectedTrackingStatus)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setCurrentPage(1) // Reset to first page
    fetchOrders(1, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService, selectedTrackingStatus)
  }



  const fetchOrders = async (page = 1, search = '', fromDate = '', toDate = '', pickupLocation = '', courierService = '', trackingStatus = '') => {
    try {
      // Store current scroll position
      scrollPositionRef.current = tableContainerRef.current?.scrollTop || 0
      
      // Only show main loading on initial load, not on search/filter changes
      if (page === 1 && !search && !fromDate && !toDate && !pickupLocation && !courierService && !trackingStatus) {
        setLoading(true)
      } else {
        // Show table loading for search/filter/pagination changes
        setTableLoading(true)
      }
      setError(null) // Clear any previous errors
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ordersPerPage.toString()
      })
      
      if (search) {
        params.append('search', search)
      }

      if (fromDate) {
        params.append('fromDate', fromDate)
      }
      if (toDate) {
        params.append('toDate', toDate)
      }
      
      if (pickupLocation) {
        params.append('pickupLocation', pickupLocation)
      }

      if (courierService) {
        params.append('courierService', courierService)
      }

      if (trackingStatus) {
        // Convert UI label to database value for API filtering
        const dbValue = getTrackingStatusDbValue(trackingStatus)
        params.append('trackingStatus', dbValue)
      }
      
      console.log('🔍 [FETCH_ORDERS] Fetching orders with params:', params.toString())
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('📡 [FETCH_ORDERS] Response status:', response.status, response.statusText)
      console.log('📡 [FETCH_ORDERS] Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ [FETCH_ORDERS] Orders fetched successfully:', data)
        const ordersData = data.orders || []
        const currentPageData = data.pagination?.currentPage || 1
        const totalPagesData = data.pagination?.totalPages || 1
        const totalOrdersData = data.pagination?.totalCount || data.pagination?.totalOrders || 0
        

        
        setOrders(ordersData)
        setCurrentPage(currentPageData)
        setTotalPages(totalPagesData)
        setTotalOrders(totalOrdersData)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        console.error('❌ [FETCH_ORDERS] Failed to fetch orders:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        setError(`Failed to fetch orders: ${errorData.error || 'Unknown error'}`)
        // Reset pagination state on error
        setOrders([])
        setTotalOrders(0)
        setTotalPages(1)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('❌ [FETCH_ORDERS] Error fetching orders:', error)
      setError(`Error fetching orders: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Reset pagination state on error
      setOrders([])
      setTotalOrders(0)
      setTotalPages(1)
      setCurrentPage(1)
    } finally {
      setLoading(false)
      setTableLoading(false)
    }
  }

  const retryDelhiveryOrder = async (orderId: number) => {
    setRetrying(orderId)
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/orders/${orderId}/retry-delhivery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Success! Waybill: ${result.waybill}`)
        fetchOrders(currentPage, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService) // Refresh the list
      } else {
        const error = await response.json()
        alert(`Failed to retry: ${error.error}`)
      }
    } catch (error) {
      alert('Error retrying order')
      console.error('Error retrying order:', error)
    } finally {
      setRetrying(null)
    }
  }

  const handleFulfillOrder = async (orderId: number) => {
    setIsFulfilling(true)
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Order fulfilled successfully! Tracking ID: ${result.trackingId}`)
        
        // Refresh the orders list
        fetchOrders(currentPage, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService)
        
        // Update the selected order if it's the same one
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({
            ...selectedOrder,
            tracking_id: result.trackingId,
            delhivery_waybill_number: result.waybillNumber,
            delhivery_api_status: 'success'
          })
        }
      } else {
        const error = await response.json()
        alert(`Failed to fulfill order: ${error.error || error.message}`)
      }
    } catch (error) {
      alert('Error fulfilling order')
      console.error('Error fulfilling order:', error)
    } finally {
      setIsFulfilling(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedOrder || !editFormData) return

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // If order has Delhivery tracking code, update Delhivery first, then update database
      if (selectedOrder.delhivery_waybill_number && selectedOrder.courier_service.toLowerCase() === 'delhivery') {
        console.log('🔄 [ORDER_UPDATE] Delhivery order detected - updating Delhivery first')
        
        // Create updated order data for Delhivery call
        const updatedOrderData = {
          ...selectedOrder,
          ...editFormData
        }
        
        // Update Delhivery first
        const delhiveryUpdateSuccess = await updateDelhiveryOrder(updatedOrderData)
        
        if (delhiveryUpdateSuccess) {
          // Delhivery update successful - now update database
          console.log('✅ [ORDER_UPDATE] Delhivery update successful, now updating database')
          
          const response = await fetch(`/api/orders/${selectedOrder.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(editFormData),
          })

          if (response.ok) {
            const updatedOrder = await response.json()
            setSelectedOrder(updatedOrder)
            setIsEditMode(false)
            setEditFormData({})
            
            // Refresh the orders list
            fetchOrders(currentPage, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService)
            
            alert('Order updated successfully!')
          } else {
            const error = await response.json()
            alert(`Delhivery update succeeded but database update failed: ${error.error || error.message}`)
          }
        } else {
          // Delhivery update failed - don't update database
          console.log('❌ [ORDER_UPDATE] Delhivery update failed, skipping database update')
          alert('Order update failed. Delhivery update was unsuccessful, so no changes were made.')
        }
      } else {
        // For non-Delhivery orders, update database immediately
        const response = await fetch(`/api/orders/${selectedOrder.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editFormData),
        })

        if (response.ok) {
          const updatedOrder = await response.json()
          setSelectedOrder(updatedOrder)
          setIsEditMode(false)
          setEditFormData({})
          
          // Refresh the orders list
          fetchOrders(currentPage, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService)
          
          alert('Order updated successfully!')
        } else {
          const error = await response.json()
          alert(`Failed to update order: ${error.error || error.message}`)
        }
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update order. Please try again.')
    }
  }

  const handleEditInputChange = (field: keyof Order, value: string | number | boolean) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateDelhiveryOrder = async (order: Order): Promise<boolean> => {
    try {
      console.log('🔄 [DELHIVERY_UPDATE] Updating Delhivery order:', order.delhivery_waybill_number)
      
      // Prepare Delhivery update payload according to official documentation
      // Note: pickupLocation is internal Scan2Ship field, not sent to Delhivery
      // Note: shipment dimensions are not sent to Delhivery update API
      const delhiveryPayload: any = {
        waybill: order.delhivery_waybill_number,
        pt: order.is_cod ? 'COD' : 'Pre-paid',
        cod: order.is_cod ? (order.cod_amount || 0) : 0,
        weight: order.weight || 100, // Weight in grams
        
        // Customer details for address updates
        name: order.name,
        phone: order.mobile,
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        country: order.country
      }

      console.log('📦 [DELHIVERY_UPDATE] Clean Delhivery Payload (no internal fields):', delhiveryPayload)

      // Call Delhivery API to update order
      // Include pickupLocation for API key lookup only
      const apiPayload = {
        ...delhiveryPayload,
        pickupLocation: order.pickup_location // Internal field for API key lookup
      }
      
      const delhiveryResponse = await fetch('/api/delhivery/update-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      })

      if (delhiveryResponse.ok) {
        const delhiveryResult = await delhiveryResponse.json()
        console.log('✅ [DELHIVERY_UPDATE] Success:', delhiveryResult)
        
        // Check if the response indicates success
        if (delhiveryResult.success) {
          console.log('✅ [DELHIVERY_UPDATE] Order updated successfully in Delhivery')
          return true
        } else {
          console.error('❌ [DELHIVERY_UPDATE] Delhivery API returned success: false')
          return false
        }
      } else {
        const delhiveryError = await delhiveryResponse.json()
        console.error('❌ [DELHIVERY_UPDATE] Failed:', delhiveryError)
        
        // Show specific error for authentication issues
        if (delhiveryResponse.status === 401) {
          console.warn('⚠️ [DELHIVERY_UPDATE] API key authentication failed - order updated locally but not in Delhivery')
        } else {
          console.warn('⚠️ [DELHIVERY_UPDATE] Delhivery update failed - order updated locally but not in Delhivery')
        }
        return false
      }
    } catch (error) {
      console.error('❌ [DELHIVERY_UPDATE] Error:', error)
      // Don't show error to user as the main order update was successful
      // Just log it for debugging
      return false
    }
  }

  const downloadPackingSlip = async (orderId: number) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/orders/${orderId}/waybill`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // Get HTML content
        const htmlContent = await response.text()
        
        // Create a new window/tab with the HTML content
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(htmlContent)
          newWindow.document.close()
          
          // Focus the new window
          newWindow.focus()
          
          console.log('✅ Packing slip opened in new tab. Use browser print function (Ctrl+P) to save as PDF.')
        } else {
          alert('Please allow popups to view the packing slip')
        }
      } else {
        const error = await response.json()
        alert(`Failed to download packing slip: ${error.error}`)
      }
    } catch (error) {
      alert('Error downloading packing slip')
      console.error('Error downloading packing slip:', error)
    }
  }

  const downloadWaybill = async (orderId: number, isThermal: boolean = false) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Add thermal parameter if needed
      const url = new URL(`/api/orders/${orderId}/waybill`, window.location.origin)
      if (isThermal) {
        url.searchParams.set('thermal', 'true')
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // Get HTML content
        const htmlContent = await response.text()
        
        // Create a new window/tab with the HTML content
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(htmlContent)
          newWindow.document.close()
          
          // Focus the new window
          newWindow.focus()
          
          const labelType = isThermal ? 'thermal' : 'standard'
          console.log(`✅ ${labelType} waybill opened in new tab. Use browser print function (Ctrl+P) to save as PDF.`)
        } else {
          alert('Please allow popups to view the waybill')
        }
      } else {
        const error = await response.json()
        alert(`Failed to download waybill: ${error.error}`)
      }
    } catch (error) {
      alert('Error downloading waybill')
      console.error('Error downloading waybill:', error)
    }
  }

  const downloadBulkLabels = async () => {
    if (selectedOrders.size === 0) return

    try {
      // Get all selected orders
      const selectedOrderObjects = orders.filter(order => selectedOrders.has(order.id))

      if (selectedOrderObjects.length === 0) {
        alert('No orders found in selection')
        return
      }

      console.log(`🚀 Starting bulk download for ${selectedOrderObjects.length} orders (thermal: ${thermalPrintEnabled})`)

      // Fetch all labels/waybills and combine them
      const labelContents = []
      
      for (let i = 0; i < selectedOrderObjects.length; i++) {
        const order = selectedOrderObjects[i]
        console.log(`📥 Fetching ${i + 1}/${selectedOrderObjects.length} for order ${order.id} (${order.courier_service})`)
        
        try {
          // Get auth token from localStorage
          const token = localStorage.getItem('authToken');
          if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
          }

          let endpoint = ''
          let waybillNumber = ''

          // Use universal waybill endpoint for all courier services
          endpoint = `/api/orders/${order.id}/waybill`
          
          // Determine waybill number based on courier service
          if (order.courier_service.toLowerCase() === 'delhivery' && order.delhivery_waybill_number) {
            waybillNumber = order.delhivery_waybill_number
          } else {
            waybillNumber = order.tracking_id || order.reference_number || `ORDER-${order.id}`
          }

          // Add thermal parameter if needed
          const url = new URL(endpoint, window.location.origin)
          if (thermalPrintEnabled) {
            url.searchParams.set('thermal', 'true')
          }

          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const htmlContent = await response.text()
            labelContents.push({
              orderId: order.id,
              waybill: waybillNumber,
              htmlContent: htmlContent,
              courier: order.courier_service
            })
            console.log(`✅ ${order.courier_service} ${i + 1}/${selectedOrderObjects.length} fetched successfully`)
          } else {
            const error = await response.json()
            console.error(`❌ Failed to fetch ${order.courier_service} for order ${order.id}: ${error.error}`)
          }
        } catch (error) {
          console.error(`❌ Error fetching ${order.courier_service} for order ${order.id}:`, error)
        }
      }

      if (labelContents.length === 0) {
        alert('No labels could be fetched. Please try again.')
        return
      }

      // Create combined HTML content
      const combinedHTML = await createCombinedLabelsHTML(labelContents, thermalPrintEnabled)
      
      // Create a new window/tab with the combined HTML content
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(combinedHTML)
        newWindow.document.close()
        
        // Focus the new window
        newWindow.focus()
        
        console.log('🎉 Bulk download completed!')
        const labelType = thermalPrintEnabled ? 'thermal printer' : 'standard'
        alert(`Bulk download completed! ${labelContents.length} ${labelType} label(s) opened in new tab. Use browser print function (Ctrl+P) to save as PDF.`)
      } else {
        alert('Please allow popups to view the combined labels')
      }
      
    } catch (error) {
      console.error('❌ Error in bulk download:', error)
      alert('Error during bulk download. Please check the console for details.')
    }
  }

  const createCombinedLabelsHTML = async (labelContents: Array<{orderId: number, waybill: string, htmlContent: string}>, isThermal: boolean = false) => {
    try {
      // Create a combined HTML page with all labels
      const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bulk ${isThermal ? 'Thermal' : 'Standard'} Labels & Waybills - ${labelContents.length} Orders</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: ${isThermal ? '0' : '20px'};
            background-color: #f5f5f5;
        }
        .page-break {
            page-break-before: always;
        }
        .page-break:first-child {
            page-break-before: avoid;
        }
        .label-container {
            background-color: white;
            margin-bottom: ${isThermal ? '0' : '20px'};
            border-radius: ${isThermal ? '0' : '8px'};
            box-shadow: ${isThermal ? 'none' : '0 2px 10px rgba(0,0,0,0.1)'};
            border: ${isThermal ? 'none' : '2px solid #333'};
            ${isThermal ? 'width: 80mm; max-width: 80mm; margin: 0 auto;' : ''}
        }
        .label-header {
            text-align: center;
            padding: 10px;
            background-color: #f0f0f0;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
        }
        ${isThermal ? `
        @page {
            size: 80mm auto;
            margin: 0;
        }
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .label-container {
                page-break-inside: avoid;
                margin: 0;
            }
        }
        ` : ''}
    </style>
</head>
<body>

    
    ${labelContents.map((label, index) => `
        <div class="label-container ${index > 0 ? 'page-break' : ''}">
            ${label.htmlContent}
        </div>
    `).join('')}
</body>
</html>
      `
      
      return combinedHTML
      
    } catch (error) {
      console.error('Error creating combined HTML:', error)
      throw error
    }
  }

  const exportOrders = async () => {
    if (orders.length === 0) {
      alert('No orders to export')
      return
    }

    try {
      let ordersToExport = orders
      let exportMessage = `Exporting ${orders.length} orders from current page`

      // If specific orders are manually selected, export only those
      if (selectedOrders.size > 0) {
        ordersToExport = orders.filter(order => selectedOrders.has(order.id))
        exportMessage = `Exporting ${ordersToExport.length} manually selected orders`
      } else {
        // If no specific selection, fetch ALL orders matching the current filters
        exportMessage = 'Fetching all orders matching current filters...'
        
        // Build query parameters for fetching all filtered orders
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (fromDate) params.append('fromDate', fromDate)
        if (toDate) params.append('toDate', toDate)
        if (selectedPickupLocation) params.append('pickupLocation', selectedPickupLocation)
        if (selectedCourierService) params.append('courierService', selectedCourierService)
        params.append('limit', '10000') // Set a high limit to get all orders
        params.append('page', '1') // Start from first page
        
        // Get auth token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('Authentication token not found. Please log in again.');
        }

        const response = await fetch(`/api/orders?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          ordersToExport = data.orders || []
          exportMessage = `Fetched ${ordersToExport.length} total orders matching filters`
        } else {
          console.error('Failed to fetch all orders for export')
          // Fall back to current page orders
          exportMessage = `Exporting ${orders.length} orders from current page (failed to fetch all)`
        }
      }

      if (ordersToExport.length === 0) {
        alert('No orders to export')
        return
      }

      console.log(exportMessage)

      // Prepare data for export
      const exportData = ordersToExport.map(order => ({
        orderId: order.id,
        customerName: order.name,
        mobile: order.mobile,
        address: order.address,
        city: order.city,
        state: order.state,
        country: order.country,
        pincode: order.pincode,
        courierService: order.courier_service,
        pickupLocation: order.pickup_location,
        packageValue: order.package_value,
        weight: order.weight,
        totalItems: order.total_items,
        trackingId: order.tracking_id || '',
        referenceNumber: order.reference_number || '',
        isCod: order.is_cod ? 'Yes' : 'No',
        codAmount: order.cod_amount || '',
        resellerName: order.reseller_name || '',
        resellerMobile: order.reseller_mobile || '',
        createdDate: new Date(order.created_at).toLocaleDateString('en-IN'),
        productDescription: order.product_description || '',
        delhiveryWaybill: order.delhivery_waybill_number || '',
        delhiveryOrderId: order.delhivery_order_id || '',
        delhiveryStatus: order.delhivery_tracking_status || '',
        shipmentLength: order.shipment_length || '',
        shipmentBreadth: order.shipment_breadth || '',
        shipmentHeight: order.shipment_height || '',
        returnAddress: order.return_address || '',
        sellerName: order.seller_name || '',
        sellerGst: order.seller_gst || '',
        hsnCode: order.hsn_code || '',
        category: order.category_of_goods || ''
      }))

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Orders')

      // Define columns with headers
      const columns = [
        { header: 'Order ID', key: 'orderId', width: 10 },
        { header: 'Customer Name', key: 'customerName', width: 20 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Customer City', key: 'city', width: 15 },
        { header: 'Customer State', key: 'state', width: 15 },
        { header: 'Customer Country', key: 'country', width: 15 },
        { header: 'Customer Pincode', key: 'pincode', width: 10 },
        { header: 'Courier Service', key: 'courierService', width: 15 },
        { header: 'Pickup Location', key: 'pickupLocation', width: 20 },
        { header: 'Package Value', key: 'packageValue', width: 15 },
        { header: 'Weight', key: 'weight', width: 12 },
        { header: 'Total Items', key: 'totalItems', width: 12 },
        { header: 'Tracking ID', key: 'trackingId', width: 20 },
        { header: 'Reference Number', key: 'referenceNumber', width: 20 },
        { header: 'Is COD', key: 'isCod', width: 8 },
        { header: 'COD Amount', key: 'codAmount', width: 12 },
        { header: 'Reseller Name', key: 'resellerName', width: 20 },
        { header: 'Reseller Mobile', key: 'resellerMobile', width: 15 },
        { header: 'Created Date', key: 'createdDate', width: 15 },
        { header: 'Product Description', key: 'productDescription', width: 25 },
        { header: 'Delhivery Waybill', key: 'delhiveryWaybill', width: 20 },
        { header: 'Delhivery Order ID', key: 'delhiveryOrderId', width: 20 },
        { header: 'Delhivery Status', key: 'delhiveryStatus', width: 15 },
        { header: 'Shipment Length', key: 'shipmentLength', width: 15 },
        { header: 'Shipment Breadth', key: 'shipmentBreadth', width: 15 },
        { header: 'Shipment Height', key: 'shipmentHeight', width: 15 },
        { header: 'Return Address', key: 'returnAddress', width: 40 },
        { header: 'Seller Name', key: 'sellerName', width: 20 },
        { header: 'Seller GST', key: 'sellerGst', width: 15 },
        { header: 'HSN Code', key: 'hsnCode', width: 12 },
        { header: 'Category', key: 'category', width: 20 }
      ]

      // Set column definitions
      worksheet.columns = columns

      // Add data rows
      exportData.forEach(row => {
        worksheet.addRow(row)
      })

      // Style the header row
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }

      // Generate filename with current date and filter info
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      let filename = `orders_export_${dateStr}`
      
      if (selectedPickupLocation) {
        const locationName = pickupLocations.find(loc => loc.value === selectedPickupLocation)?.label || selectedPickupLocation
        filename += `_${locationName.replace(/\s+/g, '_')}`
      }
      
      if (fromDate || toDate) {
        filename += `_${fromDate || 'start'}_to_${toDate || 'end'}`
      }
      
      if (searchTerm) {
        filename += `_search_${searchTerm.replace(/\s+/g, '_')}`
      }

      if (selectedCourierService) {
        const courierName = courierServices.find(service => service.value === selectedCourierService)?.label || selectedCourierService
        filename += `_${courierName.replace(/\s+/g, '_')}`
      }

      // Add selection info to filename
      if (selectedOrders.size > 0) {
        filename += `_${selectedOrders.size}_selected`
      } else {
        filename += `_all_filtered`
      }
      
      filename += '.xlsx'

      // Save the file using ExcelJS
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Safely remove the link element
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      } catch (error) {
        console.error('Error removing download link:', error)
      }
      window.URL.revokeObjectURL(url)
      
      console.log(`✅ Exported ${ordersToExport.length} orders to ${filename}`)
      
      // Show success message
      if (selectedOrders.size > 0) {
        alert(`Successfully exported ${ordersToExport.length} manually selected orders to ${filename}`)
      } else {
        alert(`Successfully exported ${ordersToExport.length} orders matching current filters to ${filename}`)
      }
    } catch (error) {
      console.error('❌ Error exporting orders:', error)
      alert('Error exporting orders. Please check the console for details.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }



  const getDelhiveryStatusBadge = (order: Order) => {
    if (order.courier_service.toLowerCase() !== 'delhivery') {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✓ Success</span>
    }

    const status = order.delhivery_tracking_status || null;
    switch (status) {
      case 'delivered':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✓ Delivered</span>
      case 'returned':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">↩️ Returned</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">✗ Failed</span>
      case 'manifested':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">📦 Manifested</span>
      case 'in_transit':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">🚚 In Transit</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">⏳ Pending</span>
      case 'dispatched':
        return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">🚀 Dispatched</span>
      case 'success':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✓ Success</span>
      case 'not_applicable':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">ℹ️ Not Applicable</span>
      case null:
      case undefined:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">📦 Not Dispatched</span>
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">📦 Not Dispatched</span>
    }
  }

  const getShopifyStatusBadge = (order: Order) => {
    switch (order.shopify_status) {
      case 'fulfilled':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✓ Fulfilled</span>
      case 'error':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">✗ Error</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">⏳ Pending</span>
      case 'synced':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">🔄 Synced</span>
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">❓ Not Connected</span>
    }
  }

  const getCourierServiceName = (courierCode: string): string => {
    const courierMap: { [key: string]: string } = {
      'delhivery': 'Delhivery',
      'dtdc': 'DTDC',
      'india_post': 'India Post',
      'manual': 'Manual'
    }
    return courierMap[courierCode.toLowerCase()] || courierCode
  }



  // Checkbox functions
  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      // If all are selected, unselect all
      setSelectedOrders(new Set())
    } else {
      // Select all current page items
      const allIds = new Set(orders.map(order => order.id))
      setSelectedOrders(allIds)
    }
  }

  const handleSelectOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const isAllSelected = orders.length > 0 && selectedOrders.size === orders.length
  const isIndeterminate = selectedOrders.size > 0 && selectedOrders.size < orders.length

  // Update header checkbox indeterminate state
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

  // Restore scroll position after orders update
  useLayoutEffect(() => {
    if (tableContainerRef.current && scrollPositionRef.current > 0 && !loading) {
      tableContainerRef.current.scrollTop = scrollPositionRef.current
    }
  }, [orders, loading])

  // Track scroll position changes
  useEffect(() => {
    const tableContainer = tableContainerRef.current
    if (!tableContainer) return

    const handleScroll = () => {
      scrollPositionRef.current = tableContainer.scrollTop
    }

    tableContainer.addEventListener('scroll', handleScroll)
    return () => {
      // Safely remove event listener
      try {
        if (tableContainer && tableContainer.removeEventListener) {
          tableContainer.removeEventListener('scroll', handleScroll)
        }
      } catch (error) {
        console.error('Error removing scroll event listener:', error)
      }
    }
  }, [])

  // Helper function to get tracking number
  const getTrackingNumber = (order: Order) => {
    const trackingNumber = order.courier_service.toLowerCase() === 'delhivery' 
      ? (order.delhivery_waybill_number || order.tracking_id)
      : order.tracking_id

    return trackingNumber || (order.courier_service.toLowerCase() === 'delhivery' ? 'Not assigned' : 'Not provided')
  }


  // Memoize table body to prevent unnecessary re-renders
  const tableBody = useMemo(() => {
    return (
      <tbody className="bg-white divide-y divide-gray-200">
        {orders.map((order) => (
          <tr key={order.id} className="hover:bg-gray-50">
            <td className="px-6 py-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedOrders.has(order.id)}
                  onChange={() => handleSelectOrder(order.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{order.name}</div>
                <div className="text-gray-500">{order.mobile}</div>
                <div className="text-gray-500">{order.city}, {order.state}</div>
                <div className="text-gray-500">{formatCurrency(order.package_value)} • {order.weight} g</div>
                <div className="text-gray-400 text-xs">{formatDate(order.created_at)}</div>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{getCourierServiceLabel(order.courier_service)}</div>
                <div className="text-gray-500">{getPickupLocationLabel(order.pickup_location)}</div>
                {order.is_cod && (
                  <div className="text-orange-600 font-medium">COD: {formatCurrency(order.cod_amount || 0)}</div>
                )}
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="space-y-2">
                <div>
                  <div className="space-y-2">
                    {(() => {
                      const trackingNumber = getTrackingNumber(order)
                      
                      if (trackingNumber && trackingNumber !== 'Not assigned' && trackingNumber !== 'Not provided') {
                        return (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleTrackingClick(order)}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm block"
                              title="Click to track package"
                            >
                              {trackingNumber}
                            </button>
                            <TrackingStatusLabel 
                              status={order.delhivery_tracking_status || order.shopify_status} 
                              className="text-xs"
                            />
                          </div>
                        )
                      }
                      
                      return (
                        <div className="space-y-2">
                          <span className="text-gray-500 text-sm">
                            {trackingNumber}
                          </span>
                          <TrackingStatusLabel 
                            status={order.delhivery_tracking_status || order.shopify_status} 
                            className="text-xs"
                          />
                        </div>
                      )
                    })()}
                  </div>
                </div>
                {order.delhivery_api_error && (
                  <div className="text-xs text-red-600 max-w-xs">
                    Error: {order.delhivery_api_error}
                  </div>
                )}
                {(order.delhivery_retry_count || 0) > 0 && (
                  <div className="text-xs text-gray-500">
                    Retries: {order.delhivery_retry_count || 0}/3
                  </div>
                )}
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="space-y-2">
                {order.reference_number && (
                  <div className="text-sm text-gray-900">
                    {order.reference_number}
                  </div>
                )}
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="space-y-2">
                {thermalPrintEnabled ? (
                  // Show only thermal option when thermal print is enabled
                  <button
                    onClick={() => downloadWaybill(order.id, true)}
                    className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                    Thermal
                  </button>
                ) : (
                  // Show only standard option when thermal print is disabled
                  <button
                    onClick={() => downloadWaybill(order.id, false)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Standard
                  </button>
                )}
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    )
  }, [orders, selectedOrders, thermalPrintEnabled, getCourierServiceLabel, getPickupLocationLabel])

  const deleteOrders = async () => {
    if (selectedOrders.size === 0) return
    
    setDeleting(true)
    try {
      const orderIds = Array.from(selectedOrders)
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('Authentication token not found. Please log in again.')
        return
      }

      const response = await fetch('/api/orders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderIds }),
      })
      
      if (response.ok) {
        // Remove deleted orders from local state
        setOrders(prevOrders => prevOrders.filter(order => !selectedOrders.has(order.id)))
        // Clear selection
        setSelectedOrders(new Set())
        // Close modal
        setShowDeleteModal(false)
        // Refresh orders to update pagination
        fetchOrders(currentPage, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService)
        alert(`Successfully deleted ${orderIds.length} order${orderIds.length !== 1 ? 's' : ''}`)
      } else {
        const error = await response.json()
        alert(`Failed to delete orders: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting orders:', error)
      alert('Error deleting orders. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleTrackingClick = (order: Order) => {
    const trackingNumber = order.courier_service.toLowerCase() === 'delhivery' 
      ? (order.delhivery_waybill_number || order.tracking_id)
      : order.tracking_id

    if (trackingNumber) {
      setSelectedTrackingOrder(order)
      setShowTrackingModal(true)
    }
  }




  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Order List</h2>
      
      {/* Search Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Row 1 - Search and Filters */}
          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  placeholder="Search by name, mobile, or order ID (min 2 chars)..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {searchLoading ? (
                    <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
                {searchTerm && !searchLoading && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Pickup Location Filter */}
            <div>
              <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Location
              </label>
              <select
                id="pickupLocation"
                value={selectedPickupLocation}
                onChange={(e) => handlePickupLocationChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">All Pickup Locations</option>
                {pickupLocations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Courier Service Filter */}
            <div>
              <label htmlFor="courierService" className="block text-sm font-medium text-gray-700 mb-2">
                Courier Service
              </label>
              <select
                id="courierService"
                value={selectedCourierService}
                onChange={(e) => handleCourierServiceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">All Courier Services</option>
                {courierServices.map((service) => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tracking Status Filter */}
            <div>
              <label htmlFor="trackingStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Tracking Status
              </label>
              <select
                id="trackingStatus"
                value={selectedTrackingStatus}
                onChange={(e) => handleTrackingStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">All Tracking Statuses</option>
                <option value="⏳ Not Dispatched">⏳ Not Dispatched</option>
                <option value="🚚 In Transit">🚚 In Transit</option>
                <option value="✅ Delivered">✅ Delivered</option>
                <option value="↩️ Returned">↩️ Returned</option>
                <option value="❌ Failed">❌ Failed</option>
                <option value="⏳ Pending">⏳ Pending</option>
              </select>
            </div>
          </div>

          {/* Row 2 - Date Range (Compact) */}
          <div className="md:col-span-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="fromDate" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  From:
                </label>
                <input
                  type="date"
                  id="fromDate"
                  value={fromDate}
                  onChange={(e) => handleDateRangeChange(e.target.value, toDate)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label htmlFor="toDate" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  To:
                </label>
                <input
                  type="date"
                  id="toDate"
                  value={toDate}
                  onChange={(e) => handleDateRangeChange(fromDate, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                />
              </div>
              
              {(fromDate || toDate) && (
                <button
                  onClick={clearDateFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Filter Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {(searchTerm || fromDate || toDate || selectedPickupLocation || selectedCourierService || selectedTrackingStatus) && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear All Filters
              </button>
            )}
            <button
              onClick={handleRefreshAllStatuses}
              disabled={refreshingStatuses}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {refreshingStatuses ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Statuses
                </>
              )}
            </button>
            {/* Export Orders Button - Only show when there are orders and filters are applied */}
            {orders.length > 0 && (searchTerm || fromDate || toDate || selectedPickupLocation || selectedCourierService || selectedTrackingStatus) && (
              <button
                onClick={exportOrders}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>
                  {selectedOrders.size > 0 
                    ? `Export Selected (${selectedOrders.size})` 
                    : `Export All Filtered (${orders.length}+)`
                  }
                </span>
              </button>
            )}
          </div>
          
          {/* Active Filters Display */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {selectedPickupLocation && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                📍 {pickupLocations.find(loc => loc.value === selectedPickupLocation)?.label}
              </span>
            )}
            {selectedCourierService && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md">
                🚚 {courierServices.find(service => service.value === selectedCourierService)?.label}
              </span>
            )}
            {selectedTrackingStatus && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md">
                📊 {selectedTrackingStatus}
              </span>
            )}
            {fromDate && toDate && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md">
                📅 {fromDate} to {toDate}
              </span>
            )}
            {searchTerm && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
                🔍 "{searchTerm}"
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium text-red-900">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete Orders Section */}
      {selectedOrders.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-red-900">
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected for deletion
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete {selectedOrders.size} Order{selectedOrders.size !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Orders Summary */}
      {selectedOrders.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {thermalPrintEnabled ? (
                <button
                  onClick={() => downloadBulkLabels()}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                  Thermal Labels
                </button>
              ) : (
                <button
                  onClick={() => downloadBulkLabels()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Standard Labels
                </button>
              )}
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Orders Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {searchTerm ? `Search Results for "${searchTerm}"` : 'All Orders'}
              {selectedPickupLocation && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  from {pickupLocations.find(loc => loc.value === selectedPickupLocation)?.label}
                </span>
              )}
              {(fromDate || toDate) && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  {fromDate && toDate ? `(${fromDate} to ${toDate})` : 
                   fromDate ? `(from ${fromDate})` : `(until ${toDate})`}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              Showing {orders.length} of {totalOrders || 0} orders
              {(totalPages || 1) > 1 && ` (Page ${currentPage} of ${totalPages || 1})`}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {totalOrders > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Max Orders:</span> 1,500
              </div>
            )}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? `No orders found matching "${searchTerm}"` : 'No orders found'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden relative" ref={tableContainerRef}>
          {tableLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2 text-gray-600">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">Loading orders...</span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Courier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Status & Tracking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Reference Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Labels & Waybills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              {tableBody}
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {totalOrders > 0 ? (
                      <>
                        Showing <span className="font-medium">{((currentPage - 1) * ordersPerPage) + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * ordersPerPage, totalOrders)}
                        </span>{' '}
                        of <span className="font-medium">{totalOrders}</span> results
                      </>
                    ) : (
                      'No results found'
                    )}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPrevPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages || 1) }, (_, i) => {
                      let pageNum
                      if ((totalPages || 1) <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= (totalPages || 1) - 2) {
                        pageNum = (totalPages || 1) - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
                <div className="flex items-center gap-2">
                  {!isEditMode ? (
                    <button
                      onClick={() => {
                        setIsEditMode(true)
                        // Only include editable fields in the form data
                        if (selectedOrder) {
                          setEditFormData({
                            name: selectedOrder.name,
                            mobile: selectedOrder.mobile,
                            address: selectedOrder.address,
                            city: selectedOrder.city,
                            state: selectedOrder.state,
                            country: selectedOrder.country,
                            pincode: selectedOrder.pincode,
                            courier_service: selectedOrder.courier_service,
                            pickup_location: selectedOrder.pickup_location,
                            package_value: selectedOrder.package_value,
                            weight: selectedOrder.weight,
                            total_items: selectedOrder.total_items,
                            is_cod: selectedOrder.is_cod,
                            cod_amount: selectedOrder.cod_amount,
                            tracking_id: selectedOrder.tracking_id,
                            reference_number: selectedOrder.reference_number
                          })
                        } else {
                          setEditFormData({})
                        }
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditMode(false)
                          setEditFormData({})
                        }}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedOrder(null)
                      setIsEditMode(false)
                      setEditFormData({})
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-2 text-sm text-gray-900">
                    {isEditMode ? (
                      <>
                        <div>
                          <label className="font-medium">Name:</label>
                          <input
                            type="text"
                            value={editFormData.name || ''}
                            onChange={(e) => handleEditInputChange('name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Mobile:</label>
                          <input
                            type="text"
                            value={editFormData.mobile || ''}
                            onChange={(e) => handleEditInputChange('mobile', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Address:</label>
                          <textarea
                            value={editFormData.address || ''}
                            onChange={(e) => handleEditInputChange('address', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="font-medium">City:</label>
                          <input
                            type="text"
                            value={editFormData.city || ''}
                            onChange={(e) => handleEditInputChange('city', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">State:</label>
                          <input
                            type="text"
                            value={editFormData.state || ''}
                            onChange={(e) => handleEditInputChange('state', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Country:</label>
                          <input
                            type="text"
                            value={editFormData.country || ''}
                            onChange={(e) => handleEditInputChange('country', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Pincode:</label>
                          <input
                            type="text"
                            value={editFormData.pincode || ''}
                            onChange={(e) => handleEditInputChange('pincode', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div><span className="font-medium">Name:</span> {selectedOrder.name}</div>
                        <div><span className="font-medium">Mobile:</span> {selectedOrder.mobile}</div>
                        <div><span className="font-medium">Address:</span> {selectedOrder.address}</div>
                        <div><span className="font-medium">City:</span> {selectedOrder.city}</div>
                        <div><span className="font-medium">State:</span> {selectedOrder.state}</div>
                        <div><span className="font-medium">Country:</span> {selectedOrder.country}</div>
                        <div><span className="font-medium">Pincode:</span> {selectedOrder.pincode}</div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm text-gray-900">
                    {isEditMode ? (
                      <>
                        <div>
                          <label className="font-medium">Courier:</label>
                          <select
                            value={editFormData.courier_service || ''}
                            onChange={(e) => handleEditInputChange('courier_service', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="delhivery">Delhivery</option>
                            <option value="dtdc">DTDC</option>
                            <option value="india_post">India Post</option>
                            <option value="blue_dart">Blue Dart</option>
                            <option value="fedex">FedEx</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-medium">Pickup Location:</label>
                          <input
                            type="text"
                            value={editFormData.pickup_location || ''}
                            onChange={(e) => handleEditInputChange('pickup_location', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Package Value:</label>
                          <input
                            type="number"
                            value={editFormData.package_value || ''}
                            onChange={(e) => handleEditInputChange('package_value', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Weight:</label>
                          <input
                            type="number"
                            value={editFormData.weight || ''}
                            onChange={(e) => handleEditInputChange('weight', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Total Items:</label>
                          <input
                            type="number"
                            value={editFormData.total_items || ''}
                            onChange={(e) => handleEditInputChange('total_items', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">COD:</label>
                          <input
                            type="checkbox"
                            checked={editFormData.is_cod || false}
                            onChange={(e) => handleEditInputChange('is_cod', e.target.checked)}
                            className="ml-2"
                          />
                        </div>
                        {(editFormData.is_cod || selectedOrder.is_cod) && (
                          <div>
                            <label className="font-medium">COD Amount:</label>
                            <input
                              type="number"
                              value={editFormData.cod_amount || ''}
                              onChange={(e) => handleEditInputChange('cod_amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        )}
                        <div>
                          <label className="font-medium">Tracking ID:</label>
                          <input
                            type="text"
                            value={editFormData.tracking_id || ''}
                            onChange={(e) => handleEditInputChange('tracking_id', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="font-medium">Reference:</label>
                          <input
                            type="text"
                            value={editFormData.reference_number || ''}
                            onChange={(e) => handleEditInputChange('reference_number', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div><span className="font-medium">Courier:</span> {selectedOrder.courier_service}</div>
                        <div><span className="font-medium">Pickup Location:</span> {selectedOrder.pickup_location}</div>
                        <div><span className="font-medium">Package Value:</span> {formatCurrency(selectedOrder.package_value)}</div>
                        <div><span className="font-medium">Weight:</span> {selectedOrder.weight} g</div>
                        <div><span className="font-medium">Total Items:</span> {selectedOrder.total_items}</div>
                        <div><span className="font-medium">COD:</span> {selectedOrder.is_cod ? 'Yes' : 'No'}</div>
                        {selectedOrder.is_cod && selectedOrder.cod_amount && (
                          <div><span className="font-medium">COD Amount:</span> {formatCurrency(selectedOrder.cod_amount)}</div>
                        )}
                        {selectedOrder.tracking_id && (
                          <div className="space-y-2">
                            <div><span className="font-medium">Tracking ID:</span> {selectedOrder.tracking_id}</div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Status:</span>
                              <TrackingStatusLabel 
                                status={selectedOrder.delhivery_tracking_status || selectedOrder.shopify_status} 
                              />
                            </div>
                          </div>
                        )}
                        {selectedOrder.reference_number && (
                          <div><span className="font-medium">Reference:</span> {selectedOrder.reference_number}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tracking Information */}
              {selectedOrder.courier_service.toLowerCase() === 'delhivery' ? (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Delhivery API Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
                    <div>
                      <div><span className="font-medium">Status:</span> {getDelhiveryStatusBadge(selectedOrder)}</div>
                      <div><span className="font-medium">Waybill:</span> {selectedOrder.delhivery_waybill_number || 'Not assigned'}</div>
                      <div><span className="font-medium">Order ID:</span> {selectedOrder.delhivery_order_id || 'Not assigned'}</div>
                    </div>
                    <div>
                      <div><span className="font-medium">Retry Count:</span> {selectedOrder.delhivery_retry_count || 0}/3</div>
                      {selectedOrder.last_delhivery_attempt && (
                        <div><span className="font-medium">Last Attempt:</span> {formatDate(selectedOrder.last_delhivery_attempt)}</div>
                      )}
                      {selectedOrder.delhivery_api_error && (
                        <div><span className="font-medium text-red-600">Error:</span> {selectedOrder.delhivery_api_error}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Fulfill Button */}
                  {(!selectedOrder.tracking_id || selectedOrder.delhivery_api_status !== 'success') && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleFulfillOrder(selectedOrder.id)}
                        disabled={isFulfilling}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isFulfilling ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Fulfilling...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Fulfill Order
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Click to create waybill and update tracking information
                      </p>
                    </div>
                  )}

                </div>
              ) : null}


              {selectedOrder.courier_service.toLowerCase() !== 'delhivery' ? (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">{getCourierServiceName(selectedOrder.courier_service)} Tracking</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
                    <div>
                      <div><span className="font-medium">Tracking Number:</span> {selectedOrder.tracking_id || selectedOrder.reference_number || 'Not assigned'}</div>
                      <div><span className="font-medium">Reference Number:</span> {selectedOrder.reference_number || 'Not assigned'}</div>
                    </div>
                    <div>
                      <div><span className="font-medium">Service:</span> {getCourierServiceName(selectedOrder.courier_service)}</div>
                      <div><span className="font-medium">Status:</span> <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✅ Active</span></div>
                    </div>
                  </div>
                </div>
              ) : null}



              {selectedOrder.reseller_name && 
               selectedOrder.reseller_name.trim() !== '' && 
               selectedOrder.reseller_name.toLowerCase() !== 'no name' && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Reseller Information</h4>
                  <div className="text-sm space-y-1 text-gray-900">
                    <div><span className="font-medium">Name:</span> {selectedOrder.reseller_name}</div>
                    {selectedOrder.reseller_mobile && 
                     selectedOrder.reseller_mobile.trim() !== '' && 
                     selectedOrder.reseller_mobile.toLowerCase() !== 'no number' && (
                      <div><span className="font-medium">Mobile:</span> {selectedOrder.reseller_mobile}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete {selectedOrders.size} Order{selectedOrders.size !== 1 ? 's' : ''}?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  This action cannot be undone. This will permanently delete the selected order{selectedOrders.size !== 1 ? 's' : ''} and all associated data.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteOrders}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    {deleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {selectedTrackingOrder && (
        <TrackingModal
          isOpen={showTrackingModal}
          onClose={() => {
            setShowTrackingModal(false)
            setSelectedTrackingOrder(null)
          }}
          waybillNumber={
            selectedTrackingOrder.courier_service.toLowerCase() === 'delhivery' 
              ? (selectedTrackingOrder.delhivery_waybill_number || selectedTrackingOrder.tracking_id || '')
              : (selectedTrackingOrder.tracking_id || '')
          }
          courierService={selectedTrackingOrder.courier_service}
        />
      )}
    </div>
  )
}
