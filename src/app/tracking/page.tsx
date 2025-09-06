'use client'

import { useState } from 'react'

interface Order {
  id: number
  name: string
  mobile: string
  tracking_id: string | null
  courier_service: string
  created_at: string
  package_value: number
  weight: number
  total_items: number
  address: string
  city: string
  state: string
  pincode: string
  is_cod: boolean
  cod_amount: number | null
}

interface ClientOrders {
  clientId: string
  clientName: string
  orders: Order[]
}

interface TrackingResponse {
  success: boolean
  data: {
    mobile: string
    totalOrders: number
    ordersByClient: ClientOrders[]
  }
}

export default function TrackingPage() {
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trackingData, setTrackingData] = useState<TrackingResponse['data'] | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [showClientSelection, setShowClientSelection] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mobile.trim()) {
      setError('Please enter your mobile number')
      return
    }

    setLoading(true)
    setError('')
    setTrackingData(null)
    setSelectedClientId('')
    setShowClientSelection(false)

    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile: mobile.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders')
      }

      if (data.success) {
        setTrackingData(data.data)
        if (data.data.totalOrders === 0) {
          setError('No orders found for this mobile number')
        } else {
          // Auto-select first client if only one, show selection if multiple
          if (data.data.ordersByClient.length === 1) {
            setSelectedClientId(data.data.ordersByClient[0].clientId)
            setShowClientSelection(false)
          } else {
            setShowClientSelection(true)
          }
        }
      } else {
        throw new Error(data.error || 'Failed to fetch orders')
      }
    } catch (err) {
      console.error('Tracking error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId)
    setShowClientSelection(false) // Immediately show orders after selection
  }

  const getSelectedClientOrders = () => {
    if (!trackingData || !selectedClientId) return null
    return trackingData.ordersByClient.find(client => client.clientId === selectedClientId)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Track Your Orders
          </h1>
          <p className="text-gray-600">
            Enter your mobile number to view all your orders across different merchants
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter your 10-digit mobile number"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={10}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</span>
              </div>
            </div>
            <div className="sm:pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <span className="mr-1">🔍</span>
                    Track Orders
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Client Selection */}
        {showClientSelection && trackingData && trackingData.totalOrders > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600 text-xl">🏪</span>
              Select a Merchant
            </h2>
            <p className="text-gray-600 mb-6">
              You have orders with {trackingData.ordersByClient.length} different merchant{trackingData.ordersByClient.length !== 1 ? 's' : ''}. 
              Click on any merchant to view their orders.
            </p>
            
            <div className="space-y-3">
              {trackingData.ordersByClient.map((clientGroup) => (
                <button
                  key={clientGroup.clientId}
                  onClick={() => handleClientChange(clientGroup.clientId)}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-lg transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🏪</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {clientGroup.clientName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {clientGroup.orders.length} order{clientGroup.orders.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                        {clientGroup.orders.length}
                      </span>
                      <span className="text-gray-400 text-lg">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Orders Display */}
        {trackingData && trackingData.totalOrders > 0 && !showClientSelection && selectedClientId && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-blue-600 text-xl">📦</span>
                  Your Orders
                </h2>
                <button
                  onClick={() => setShowClientSelection(true)}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Change Merchant
                </button>
              </div>
              <p className="text-gray-600 mb-2">
                Orders for mobile number: <span className="font-medium">{trackingData.mobile}</span>
              </p>
              <p className="text-sm text-gray-500">
                Showing orders from: <span className="font-medium">{getSelectedClientOrders()?.clientName}</span>
              </p>
            </div>

            {/* Orders List */}
            {getSelectedClientOrders() && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {getSelectedClientOrders()?.clientName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getSelectedClientOrders()?.orders.length} order{getSelectedClientOrders()?.orders.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {getSelectedClientOrders()?.orders.map((order) => (
                    <div key={order.id} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-lg font-medium text-gray-900">
                              {order.name}
                            </h4>
                            <span className="text-sm text-gray-500">
                              Order #{order.id}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="text-lg">🚚</span>
                              <span className="font-medium">Courier:</span>
                              <span>{order.courier_service}</span>
                            </div>

                            {order.tracking_id && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-lg">📦</span>
                                <span className="font-medium">Tracking:</span>
                                {order.courier_service.toLowerCase().includes('delhivery') ? (
                                  <a
                                    href={`https://www.delhivery.com/track-v2/package/${order.tracking_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors cursor-pointer"
                                  >
                                    {order.tracking_id}
                                  </a>
                                ) : (
                                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                    {order.tracking_id}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="text-lg">📅</span>
                              <span className="font-medium">Ordered:</span>
                              <span>{formatDate(order.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {order.tracking_id && (
                          <div className="lg:text-right">
                            {order.courier_service.toLowerCase().includes('delhivery') ? (
                              <a
                                href={`https://www.delhivery.com/track-v2/package/${order.tracking_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                <span>📦</span>
                                Track on Delhivery
                              </a>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                                <span>📦</span>
                                Trackable
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {trackingData && trackingData.totalOrders === 0 && !error && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl text-gray-400 mx-auto mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600">
              No orders were found for mobile number <span className="font-medium">{trackingData.mobile}</span>.
              Please check your mobile number and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}