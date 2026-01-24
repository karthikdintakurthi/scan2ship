'use client'

import { useState, useEffect } from 'react'
import { isDeviceVerified, rememberDevice, forgetDevice } from '@/lib/device-remember'

interface Order {
  id: number
  name: string
  mobile: string
  reseller_mobile?: string | null
  search_type?: 'customer' | 'reseller'
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

function getValidMobile(value: string): string | null {
  const clean = value.replace(/\D/g, '')
  let search = clean
  if (clean.length === 12 && clean.startsWith('91')) search = clean.substring(2)
  else if (clean.length === 13 && clean.startsWith('91')) search = clean.substring(3)
  if (search.length !== 10 || !/^[6-9]\d{9}$/.test(search)) return null
  return search
}

export default function TrackingPage() {
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trackingData, setTrackingData] = useState<TrackingResponse['data'] | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [showClientSelection, setShowClientSelection] = useState(false)
  
  // OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [sessionId, setSessionId] = useState<string>('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [verificationToken, setVerificationToken] = useState<string>('')
  const [otpError, setOtpError] = useState('')
  const [deviceRemembered, setDeviceRemembered] = useState(false)
  const [deviceCheckComplete, setDeviceCheckComplete] = useState(false)

  // Check if device is remembered when mobile number changes (no auto-fetch)
  useEffect(() => {
    setDeviceCheckComplete(false)
    if (otpSent || sendingOtp || verifyingOtp || verificationToken || loading) {
      return
    }

    const checkDevice = () => {
      if (!mobile.trim()) {
        setDeviceRemembered(false)
        setDeviceCheckComplete(true)
        return
      }

      const searchMobile = getValidMobile(mobile)
      if (!searchMobile) {
        setDeviceRemembered(false)
        setDeviceCheckComplete(true)
        return
      }

      setDeviceRemembered(isDeviceVerified(mobile))
      setDeviceCheckComplete(true)
    }

    const timeoutId = setTimeout(checkDevice, 1000)
    return () => clearTimeout(timeoutId)
  }, [mobile, verificationToken, trackingData, otpSent, sendingOtp, verifyingOtp, loading])

  const validMobile = getValidMobile(mobile)
  const ctaDisabled =
    !validMobile ||
    !deviceCheckComplete ||
    sendingOtp ||
    (deviceRemembered && loading)

  const fetchOrdersDirectly = async (searchMobile: string) => {
    if (sendingOtp || verifyingOtp || otpSent) return

    setLoading(true)
    setError('')
    setTrackingData(null)
    setSelectedClientId('')
    setShowClientSelection(false)

    try {
      // Call API with device verification
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mobile: searchMobile,
          deviceVerified: true // Signal that device is verified
        }),
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
      // If direct fetch fails, require OTP
      setDeviceRemembered(false)
    } finally {
      setLoading(false)
    }
  }

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ctaDisabled || !deviceRemembered) return
    const searchMobile = getValidMobile(mobile)
    if (!searchMobile) return
    await fetchOrdersDirectly(searchMobile)
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ctaDisabled || deviceRemembered) return

    const searchMobile = getValidMobile(mobile)
    if (!searchMobile) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setSendingOtp(true)
    setError('')
    setOtpError('')
    setOtpSent(false)

    try {
      const response = await fetch('/api/tracking/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile: mobile.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ [FRONTEND] OTP send failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          data: data
        });
        throw new Error(data.error || 'Failed to send OTP. Please try again.')
      }

      if (data.success) {
        console.log('✅ [FRONTEND] OTP sent, Session ID received:', data.sessionId);
        console.log('✅ [FRONTEND] Session ID type:', typeof data.sessionId, 'length:', data.sessionId?.length);
        if (!data.sessionId) {
          throw new Error('Session ID not received from server')
        }
        setSessionId(data.sessionId)
        setOtpSent(true)
        setError('')
      } else {
        throw new Error(data.error || 'Failed to send OTP')
      }
    } catch (err) {
      console.error('OTP send error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otp.trim() || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP')
      return
    }

    if (!sessionId) {
      setOtpError('Session expired. Please request a new OTP.')
      return
    }

    setVerifyingOtp(true)
    setOtpError('')

    console.log('🔍 [FRONTEND] Verifying OTP - Session ID:', sessionId, 'Mobile:', mobile.trim(), 'OTP:', otp.trim());
    console.log('🔍 [FRONTEND] Session ID type:', typeof sessionId, 'length:', sessionId?.length);
    
    if (!sessionId || sessionId.trim() === '') {
      setOtpError('Session expired. Please request a new OTP.')
      return
    }

    try {
      const requestBody = { 
        sessionId: sessionId.trim(),
        otp: otp.trim(),
        mobile: mobile.trim()
      }
      console.log('🔍 [FRONTEND] Request body:', JSON.stringify(requestBody));
      
      const response = await fetch('/api/tracking/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP')
      }

      if (data.success) {
        setVerificationToken(data.verificationToken)
        setOtpError('')
        
        // Remember this device for future visits
        console.log('💾 [FRONTEND] Remembering device for mobile:', mobile.trim());
        rememberDevice(mobile.trim())
        
        // Verify it was stored
        const isNowRemembered = isDeviceVerified(mobile.trim());
        console.log('💾 [FRONTEND] Device remembered check:', isNowRemembered);
        
        // Automatically fetch orders after OTP verification
        await fetchOrders(data.verificationToken)
      } else {
        throw new Error(data.error || 'Failed to verify OTP')
      }
    } catch (err) {
      console.error('OTP verify error:', err)
      setOtpError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const fetchOrders = async (token: string) => {
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
        body: JSON.stringify({ 
          mobile: mobile.trim(),
          verificationToken: token,
          deviceVerified: false // Explicitly set to false when using OTP token
        }),
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

  const handleForgetDevice = () => {
    forgetDevice(mobile.trim())
    setDeviceRemembered(false)
    setTrackingData(null)
    setSelectedClientId('')
    setShowClientSelection(false)
    setVerificationToken('')
    setOtpSent(false)
    setSessionId('')
    setOtp('')
  }

  const handleReset = () => {
    setMobile('')
    setOtp('')
    setOtpSent(false)
    setSessionId('')
    setVerificationToken('')
    setTrackingData(null)
    setError('')
    setOtpError('')
    setSelectedClientId('')
    setShowClientSelection(false)
    setDeviceRemembered(false)
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
          <div className="flex items-center justify-center gap-4 mb-6">
            <img 
              src="/images/scan2ship.png" 
              alt="Scan2Ship Logo" 
              className="h-16 w-auto"
            />
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-1">
                Scan2Ship
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                SaaS Logistics Platform
              </p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Track Your Orders
          </h2>
          <p className="text-gray-600">
            Enter your mobile number to receive an OTP and view all your orders across different merchants.
            <br />
            <span className="text-sm text-gray-500">
              Search works for both customer mobile numbers and reseller mobile numbers.
            </span>
          </p>
        </div>

        {/* Loading: fetching orders (Track Order click or post-OTP) */}
        {loading && (verificationToken || deviceRemembered) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Fetching your orders...</p>
          </div>
        )}

        {/* Mobile Number Form */}
        {!otpSent && !verificationToken && !trackingData && !(loading && deviceRemembered) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (ctaDisabled) return
                if (deviceRemembered) handleTrackOrder(e)
                else handleSendOTP(e)
              }}
              className="flex flex-col sm:flex-row gap-4"
            >
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
                    disabled={sendingOtp || (deviceRemembered && loading)}
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">📱</span>
                </div>
              </div>
              <div className="sm:pt-6">
                <button
                  type="submit"
                  disabled={ctaDisabled}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deviceRemembered ? (
                    loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <span className="mr-1">📦</span>
                        Track Order
                      </>
                    )
                  ) : sendingOtp ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <span className="mr-1">📱</span>
                      Send OTP
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Device Remembered Notice */}
            {deviceRemembered && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <p className="text-green-800 text-sm font-medium">
                      This device is remembered. Click Track Order to view your orders.
                    </p>
                  </div>
                  <button
                    onClick={handleForgetDevice}
                    className="text-xs text-green-700 hover:text-green-900 underline"
                  >
                    Forget this device
                  </button>
                </div>
              </div>
            )}

            {/* OTP SMS Format Information */}
            {!deviceRemembered && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm font-medium mb-2">
                  📱 What to expect:
                </p>
                <p className="text-blue-700 text-sm">
                  You will receive an SMS in the following format:
                </p>
                <div className="mt-2 p-3 bg-white border border-blue-200 rounded-md">
                  <p className="text-sm font-mono text-gray-800">
                    Your OTP for tracking your orders is <span className="font-bold text-blue-600">123456</span> - JUNIOR KIDS HUB
                  </p>
                </div>
                <p className="text-blue-600 text-xs mt-2">
                  The OTP is valid for 6 minutes. Do not share this OTP with anyone.
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  💡 After verification, this device will be remembered for 30 days.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* OTP Verification Form */}
        {otpSent && !verificationToken && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify OTP</h3>
              <p className="text-sm text-gray-600">
                We've sent a 6-digit OTP to <span className="font-medium">{mobile}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Please enter the OTP to view your orders</p>
            </div>

            {/* OTP SMS Format Reminder */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-xs font-medium mb-1">
                📱 SMS Format:
              </p>
              <p className="text-blue-700 text-xs">
                Your OTP for tracking your orders is <span className="font-mono font-bold">XXXXXX</span> - JUNIOR KIDS HUB
              </p>
            </div>
            
            <form onSubmit={handleVerifyOTP} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    disabled={verifyingOtp}
                    autoFocus
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔐</span>
                </div>
              </div>
              <div className="sm:pt-6">
                <button
                  type="submit"
                  disabled={verifyingOtp || otp.length !== 6}
                  className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifyingOtp ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <span className="mr-1">✓</span>
                      Verify OTP
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handleSendOTP}
                disabled={sendingOtp}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                Resend OTP
              </button>
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Change Mobile Number
              </button>
            </div>

            {otpError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{otpError}</p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && verificationToken && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

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
              <p className="text-sm text-gray-500 mb-3">
                Showing orders from: <span className="font-medium">{getSelectedClientOrders()?.clientName}</span>
              </p>
              
              {/* Search Type Summary */}
              {getSelectedClientOrders() && (
                <div className="flex gap-4 text-sm">
                  {(() => {
                    const customerOrders = getSelectedClientOrders()?.orders.filter(o => o.search_type === 'customer').length || 0;
                    const resellerOrders = getSelectedClientOrders()?.orders.filter(o => o.search_type === 'reseller').length || 0;
                    
                    return (
                      <>
                        {customerOrders > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            {customerOrders} as Customer
                          </span>
                        )}
                        {resellerOrders > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {resellerOrders} as Reseller
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
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
                            {order.search_type && (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                order.search_type === 'customer' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {order.search_type === 'customer' ? '👤 Customer' : '🏪 Reseller'}
                              </span>
                            )}
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
                                {order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase().includes('delhivery') ? (
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

                            {/* Tracking Links for DTDC and India Post */}
                            {order.tracking_id && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-lg">🔗</span>
                                <span className="font-medium">Track:</span>
                                {order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase() === 'dtdc' && (
                                  <a
                                    href="https://www.dtdc.in/trace.asp"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                                  >
                                    DTDC →
                                  </a>
                                )}
                                {order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase() === 'india_post' && (
                                  <a
                                    href="https://www.indiapost.gov.in/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                                  >
                                    India Post →
                                  </a>
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
                            {order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase().includes('delhivery') ? (
                              <a
                                href={`https://www.delhivery.com/track-v2/package/${order.tracking_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                <span>📦</span>
                                Track on Delhivery
                              </a>
                            ) : (order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase() === 'dtdc') ? (
                              <a
                                href="https://www.dtdc.in/trace.asp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                <span>📦</span>
                                Track on DTDC
                              </a>
                            ) : (order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase() === 'india_post') ? (
                              <a
                                href="https://www.indiapost.gov.in/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                <span>📦</span>
                                Track on India Post
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
              <br />
              <span className="text-sm text-gray-500">
                This searches both customer orders and reseller orders. Please check your mobile number and try again.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}