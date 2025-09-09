'use client'

import { useState, useEffect } from 'react'
import { X, Package, MapPin, Clock, CheckCircle, AlertCircle, Truck } from 'lucide-react'

interface TrackingEvent {
  status: string
  status_description: string
  location: string
  timestamp: string
  remarks?: string
}

interface TrackingData {
  waybill: string
  status: string
  status_description: string
  origin: string
  destination: string
  current_location: string
  current_status: string
  current_status_description: string
  pickup_date: string
  delivered_date?: string
  expected_delivery_date?: string
  tracking_events: TrackingEvent[]
}

interface TrackingModalProps {
  isOpen: boolean
  onClose: () => void
  waybillNumber: string
  courierService: string
}

export default function TrackingModal({ isOpen, onClose, waybillNumber, courierService }: TrackingModalProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && waybillNumber && courierService.toLowerCase() === 'delhivery') {
      fetchTrackingData()
    }
  }, [isOpen, waybillNumber, courierService])

  const fetchTrackingData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setError('Authentication token not found. Please log in again.')
        return
      }

      console.log('🔍 [TRACKING_MODAL] Sending request with headers:', {
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
        'Content-Type': 'application/json'
      });

      const response = await fetch(`/api/tracking/delhivery?waybill=${encodeURIComponent(waybillNumber)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const result = await response.json()
      
      if (response.ok && result.success) {
        setTrackingData(result.data)
      } else {
        setError(result.error || 'Failed to fetch tracking data')
      }
    } catch (err) {
      setError('Network error while fetching tracking data')
      console.error('Tracking fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('delivered')) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (statusLower.includes('out for delivery') || statusLower.includes('in transit')) return <Truck className="w-5 h-5 text-blue-500" />
    if (statusLower.includes('picked up') || statusLower.includes('dispatched')) return <Package className="w-5 h-5 text-purple-500" />
    if (statusLower.includes('exception') || statusLower.includes('failed')) return <AlertCircle className="w-5 h-5 text-red-500" />
    return <Clock className="w-5 h-5 text-gray-500" />
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('delivered')) return 'text-green-600 bg-green-50'
    if (statusLower.includes('out for delivery') || statusLower.includes('in transit')) return 'text-blue-600 bg-blue-50'
    if (statusLower.includes('picked up') || statusLower.includes('dispatched')) return 'text-purple-600 bg-purple-50'
    if (statusLower.includes('exception') || statusLower.includes('failed')) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Package Tracking</h2>
              <p className="text-sm text-gray-600">Waybill: {waybillNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading tracking data...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
              <button
                onClick={fetchTrackingData}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {trackingData && !loading && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Current Status</h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingData.current_status)}`}>
                    {trackingData.current_status}
                  </div>
                </div>
                <p className="text-gray-700 mb-2">{trackingData.current_status_description}</p>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{trackingData.current_location}</span>
                </div>
              </div>

              {/* Package Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Origin</h4>
                  <p className="text-gray-600">{trackingData.origin}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Destination</h4>
                  <p className="text-gray-600">{trackingData.destination}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Pickup Date</h4>
                  <p className="text-gray-600">{formatDate(trackingData.pickup_date)}</p>
                </div>
                {trackingData.expected_delivery_date && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Expected Delivery</h4>
                    <p className="text-gray-600">{formatDate(trackingData.expected_delivery_date)}</p>
                  </div>
                )}
                {trackingData.delivered_date && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Delivered Date</h4>
                    <p className="text-gray-600">{formatDate(trackingData.delivered_date)}</p>
                  </div>
                )}
              </div>

              {/* Tracking Events Timeline */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tracking History</h3>
                <div className="space-y-4">
                  {trackingData.tracking_events.map((event, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{event.status}</p>
                          <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.status_description}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>{event.location}</span>
                        </div>
                        {event.remarks && (
                          <p className="text-xs text-gray-500 mt-1 italic">{event.remarks}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {courierService.toLowerCase() !== 'delhivery' && !loading && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tracking Not Available</h3>
              <p className="text-gray-600">
                Tracking is currently only available for Delhivery shipments.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
          {courierService.toLowerCase() === 'delhivery' && (
            <button
              onClick={fetchTrackingData}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
