'use client'

import { useState, useEffect, useRef } from 'react'
import { getPickupLocations } from '@/lib/order-form-config'
import { getActiveCourierServices } from '@/lib/courier-service-config'
import * as ExcelJS from 'exceljs'

interface Order {
  id: number
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
  delhivery_api_error?: string
  delhivery_retry_count?: number
  last_delhivery_attempt?: string
  
  // Additional Delhivery fields
  shipment_length?: number
  shipment_breadth?: number
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
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [retrying, setRetrying] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPickupLocation, setSelectedPickupLocation] = useState('')
  const [selectedCourierService, setSelectedCourierService] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  
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
  
  // Dynamic configuration state
  const [pickupLocations, setPickupLocations] = useState<Array<{value: string, label: string}>>([])
  const [courierServices, setCourierServices] = useState<Array<{value: string, label: string}>>([])
  const [configLoaded, setConfigLoaded] = useState(false)
  
  // Pagination helper variables
  const hasNextPage = currentPage < (totalPages || 1)
  const hasPrevPage = currentPage > 1



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

  // Initial load - only run once
  useEffect(() => {
    fetchOrders(1, '', '', '', '', '')
  }, [])

  // Handle search with debouncing
  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue)
    setCurrentPage(1) // Reset to first page when searching
    
    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchOrders(1, searchValue, fromDate, toDate, selectedPickupLocation, selectedCourierService)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }

  // Handle pickup location change
  const handlePickupLocationChange = (pickupLocation: string) => {
    setSelectedPickupLocation(pickupLocation)
    setCurrentPage(1) // Reset to first page when filtering
    fetchOrders(1, searchTerm, fromDate, toDate, pickupLocation, selectedCourierService)
  }

  // Handle courier service change
  const handleCourierServiceChange = (courierService: string) => {
    setSelectedCourierService(courierService)
    setCurrentPage(1) // Reset to first page when filtering
    fetchOrders(1, searchTerm, fromDate, toDate, selectedPickupLocation, courierService)
  }

  // Handle date range changes
  const handleDateRangeChange = (from: string, to: string) => {
    setFromDate(from)
    setToDate(to)
    setCurrentPage(1) // Reset to first page when filtering
    fetchOrders(1, searchTerm, from, to, selectedPickupLocation, selectedCourierService)
  }

  // Clear date filters
  const clearDateFilters = () => {
    setFromDate('')
    setToDate('')
    setCurrentPage(1)
    fetchOrders(1, searchTerm, '', '', selectedPickupLocation, selectedCourierService)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('')
    setFromDate('')
    setToDate('')
    setSelectedPickupLocation('')
    setSelectedCourierService('')
    setCurrentPage(1)
    fetchOrders(1, '', '', '', '', '')
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchOrders(page, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setCurrentPage(1) // Reset to first page
    fetchOrders(1, searchTerm, fromDate, toDate, selectedPickupLocation, selectedCourierService)
  }



  const fetchOrders = async (page = 1, search = '', fromDate = '', toDate = '', pickupLocation = '', courierService = '') => {
    try {
      setLoading(true)
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

  const downloadPackingSlip = async (orderId: number) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/orders/${orderId}/shipping-label`, {
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

  const downloadWaybill = async (orderId: number) => {
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
          
          console.log('✅ Waybill opened in new tab. Use browser print function (Ctrl+P) to save as PDF.')
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

      console.log(`🚀 Starting bulk download for ${selectedOrderObjects.length} orders`)

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

          // Determine endpoint based on courier service
          if (order.courier_service.toLowerCase() === 'delhivery' && order.delhivery_waybill_number) {
            // Use Delhivery shipping label for Delhivery orders with waybill numbers
            endpoint = `/api/orders/${order.id}/shipping-label`
            waybillNumber = order.delhivery_waybill_number
          } else {
            // Use universal waybill for all other couriers or Delhivery without waybill
            endpoint = `/api/orders/${order.id}/waybill`
            waybillNumber = order.tracking_id || order.reference_number || `ORDER-${order.id}`
          }

          const response = await fetch(endpoint, {
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
      const combinedHTML = await createCombinedLabelsHTML(labelContents)
      
      // Create a new window/tab with the combined HTML content
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(combinedHTML)
        newWindow.document.close()
        
        // Focus the new window
        newWindow.focus()
        
        console.log('🎉 Bulk download completed!')
        alert(`Bulk download completed! ${labelContents.length} label(s) opened in new tab. Use browser print function (Ctrl+P) to save as PDF.`)
      } else {
        alert('Please allow popups to view the combined labels')
      }
      
    } catch (error) {
      console.error('❌ Error in bulk download:', error)
      alert('Error during bulk download. Please check the console for details.')
    }
  }

  const createCombinedLabelsHTML = async (labelContents: Array<{orderId: number, waybill: string, htmlContent: string}>) => {
    try {
      // Create a combined HTML page with all labels
      const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bulk Labels & Waybills - ${labelContents.length} Orders</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
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
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 2px solid #333;
        }
        .label-header {
            text-align: center;
            padding: 10px;
            background-color: #f0f0f0;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
        }
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
        delhiveryStatus: order.delhivery_api_status || '',
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
      document.body.removeChild(link)
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

    switch (order.delhivery_api_status) {
      case 'success':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✓ Success</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">✗ Failed</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">⏳ Pending</span>
      case 'not_applicable':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">ℹ️ Not Applicable</span>
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Unknown</span>
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

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Order List</h2>
      
      {/* Search Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1 - Search and Filters */}
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  placeholder="Name, Mobile, or Order ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
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
          </div>

          {/* Row 2 - Date Range (Compact) */}
          <div className="md:col-span-3">
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
            {(searchTerm || fromDate || toDate || selectedPickupLocation || selectedCourierService) && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear All Filters
              </button>
            )}
            {/* Export Orders Button - Only show when there are orders and filters are applied */}
            {orders.length > 0 && (searchTerm || fromDate || toDate || selectedPickupLocation || selectedCourierService) && (
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
              <button
                onClick={downloadBulkLabels}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                                            Download {selectedOrders.size} Label{selectedOrders.size !== 1 ? 's' : ''} & Waybill{selectedOrders.size !== 1 ? 's' : ''}
              </button>
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
          {totalOrders > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Max Orders:</span> 1,500
            </div>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? `No orders found matching "${searchTerm}"` : 'No orders found'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Tracking Details
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
                        <div className="font-medium text-gray-900">{order.courier_service}</div>
                        <div className="text-gray-500">{order.pickup_location}</div>
                        {order.is_cod && (
                          <div className="text-orange-600 font-medium">COD: {formatCurrency(order.cod_amount || 0)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {order.courier_service}
                          </label>
                          <p className="text-sm text-gray-900">
                            {order.courier_service.toLowerCase() === 'delhivery' 
                              ? (order.delhivery_waybill_number || order.tracking_id || 'Not assigned')
                              : (order.tracking_id || 'Not provided')
                            }
                          </p>
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
                        {order.courier_service.toLowerCase() === 'delhivery' && order.delhivery_waybill_number ? (
                          <button
                            onClick={() => downloadPackingSlip(order.id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Generate Label
                          </button>
                        ) : (
                          <button
                            onClick={() => downloadWaybill(order.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Generate Waybill
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
                        
                        {order.courier_service.toLowerCase() === 'delhivery' && 
                         order.delhivery_api_status === 'failed' && 
                         (order.delhivery_retry_count || 0) < 3 && (
                          <button
                            onClick={() => retryDelhiveryOrder(order.id)}
                            disabled={retrying === order.id}
                            className="block w-full px-3 py-1 text-xs bg-orange-100 text-orange-800 rounded hover:bg-orange-200 disabled:opacity-50"
                          >
                            {retrying === order.id ? 'Retrying...' : 'Retry Delhivery'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
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
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-2 text-sm text-gray-900">
                    <div><span className="font-medium">Name:</span> {selectedOrder.name}</div>
                    <div><span className="font-medium">Mobile:</span> {selectedOrder.mobile}</div>
                    <div><span className="font-medium">Address:</span> {selectedOrder.address}</div>
                    <div><span className="font-medium">City:</span> {selectedOrder.city}</div>
                    <div><span className="font-medium">State:</span> {selectedOrder.state}</div>
                    <div><span className="font-medium">Country:</span> {selectedOrder.country}</div>
                    <div><span className="font-medium">Pincode:</span> {selectedOrder.pincode}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm text-gray-900">
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
                      <div><span className="font-medium">Tracking ID:</span> {selectedOrder.tracking_id}</div>
                    )}
                    {selectedOrder.reference_number && (
                      <div><span className="font-medium">Reference:</span> {selectedOrder.reference_number}</div>
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
                  
                  {selectedOrder.delhivery_api_status === 'failed' && 
                   (selectedOrder.delhivery_retry_count || 0) < 3 && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          retryDelhiveryOrder(selectedOrder.id)
                          setSelectedOrder(null)
                        }}
                        disabled={retrying === selectedOrder.id}
                        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                      >
                        {retrying === selectedOrder.id ? 'Retrying...' : 'Retry Delhivery API'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
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
              )}



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
    </div>
  )
}
