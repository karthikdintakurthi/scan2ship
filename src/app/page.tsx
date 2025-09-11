'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Pickup request modal state
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupData, setPickupData] = useState({
    pickup_date: '',
    pickup_time: '12:00:00',
    expected_package_count: 1
  });
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickupLocations, setSelectedPickupLocations] = useState([]);
  const [isSubmittingPickup, setIsSubmittingPickup] = useState(false);
  const [pickupError, setPickupError] = useState('');
  const [pickupSuccess, setPickupSuccess] = useState('');

  // Function to get default pickup date
  const getDefaultPickupDate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // If current time is evening (after 6 PM), set pickup date to next day
    if (currentHour >= 18) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Otherwise, use current date
    return now.toISOString().split('T')[0];
  };

  // Function to fetch pickup locations
  const fetchPickupLocations = async () => {
    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found');
        setPickupLocations([]);
        setSelectedPickupLocations([]);
        return;
      }

      const response = await fetch('/api/pickup-locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPickupLocations(data.pickupLocations || []);
        // Select all locations by default
        setSelectedPickupLocations(data.pickupLocations?.map(loc => loc.value) || []);
      } else {
        console.error('Failed to fetch pickup locations:', response.status, response.statusText);
        setPickupLocations([]);
        setSelectedPickupLocations([]);
      }
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
      setPickupLocations([]);
      setSelectedPickupLocations([]);
    }
  };

  // Handle pickup request submission
  const handlePickupRequest = async () => {
    try {
      setIsSubmittingPickup(true);
      setPickupError('');
      setPickupSuccess('');

      const token = localStorage.getItem('authToken');
      if (!token) {
        setPickupError('Authentication token not found');
        return;
      }

      const response = await fetch('/api/pickup-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...pickupData,
          selectedPickupLocations
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Check if there are any successful results
        if (result.results && result.results.length > 0) {
          const successCount = result.results.length;
          const totalCount = (result.results.length + (result.errors ? result.errors.length : 0));
          
          if (result.errors && result.errors.length > 0) {
            // Partial success - some succeeded, some failed
            const errorDetails = result.errors.map((error: any) => 
              `• ${error.pickup_location}: ${error.error}`
            ).join('\n');
            
            setPickupSuccess(`Pickup requests submitted for ${successCount} out of ${totalCount} locations successfully!`);
            setPickupError(`Some locations failed:\n\n${errorDetails}`);
          } else {
            // Complete success
            setPickupSuccess(`Pickup requests submitted successfully for all ${successCount} location(s)!`);
          }
        } else {
          setPickupSuccess('Pickup request submitted successfully!');
        }
        
        setPickupData({
          pickup_date: '',
          pickup_time: '12:00:00',
          expected_package_count: 1
        });
        setSelectedPickupLocations([]);
        setTimeout(() => {
          setShowPickupModal(false);
          setPickupSuccess('');
          setPickupError('');
        }, 3000);
      } else {
        // Handle detailed error messages from the API
        let errorMessage = result.error || 'Failed to submit pickup request';
        
        // If there are detailed error messages for each location, format them nicely
        if (result.details && Array.isArray(result.details)) {
          const errorDetails = result.details.map((detail: any) => 
            `• ${detail.pickup_location}: ${detail.error}`
          ).join('\n');
          errorMessage = `${result.error}\n\nDetails:\n${errorDetails}`;
        }
        
        setPickupError(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting pickup request:', error);
      setPickupError('An error occurred while submitting the pickup request');
    } finally {
      setIsSubmittingPickup(false);
    }
  };

  // Redirect admin and master_admin users to admin dashboard
  useEffect(() => {
    console.log('🔍 [HOME_PAGE] Auth check:', { isAuthenticated, currentUser: currentUser?.email, role: currentUser?.role });
    
    if (isAuthenticated && currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      console.log('✅ [HOME_PAGE] Redirecting admin user to /admin');
      router.push('/admin');
    }
  }, [isAuthenticated, currentUser, router]);

  // Show loading if authentication is still being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything for admin and master_admin users (they'll be redirected)
  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
    return null;
  }

  // For client users (role: 'user' or 'viewer'), show the client dashboard
  if (currentUser && (currentUser.role === 'user' || currentUser.role === 'viewer')) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              {/* Logo */}
              <div className="inline-flex items-center justify-center mb-8">
                <Image
                  src="/images/scan2ship.png"
                  alt="Scan2Ship Logo"
                  width={120}
                  height={120}
                  className="rounded-xl shadow-2xl"
                  priority
                />
              </div>
              
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Welcome to{' '}
                <span className="text-blue-600">Scan2Ship</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                A software product that brings extra speed to your regular logistics operations. 
                Streamline order management, track shipments, and accelerate your logistics business with our advanced system.
              </p>
                
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/orders"
                    className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Order
                  </Link>
                  
                  <Link
                    href="/view-orders"
                    className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Orders
                  </Link>

                  <Link
                    href="/reports"
                    className="inline-flex items-center px-8 py-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Reports
                  </Link>
                </div>
                
                <button
     onClick={async () => {
       setPickupData(prev => ({
         ...prev,
         pickup_date: getDefaultPickupDate()
       }));
       await fetchPickupLocations();
       setShowPickupModal(true);
     }}
                  className="inline-flex items-center px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Raise Pickup Request
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Accelerate Your Logistics with Smart Features
              </h2>
              <p className="text-lg text-gray-600">
                Built for speed and efficiency - transform your logistics operations with cutting-edge technology
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Order Management</h3>
                <p className="text-gray-600">Create and manage orders with intelligent automation and real-time tracking</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-gray-600">Optimized for speed - process orders in seconds, not minutes</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
                <p className="text-gray-600">Get detailed insights into your operations with comprehensive analytics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Request Modal */}
        {showPickupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Raise Pickup Request</h3>
                  <button
                    onClick={() => setShowPickupModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {pickupSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-800 text-sm">{pickupSuccess}</span>
                    </div>
                  </div>
                )}

                {pickupError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div className="text-red-800 text-sm">
                        <div className="whitespace-pre-line">{pickupError}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Date *
                    </label>
                    <input
                      type="date"
                      value={pickupData.pickup_date}
                      onChange={(e) => {
                        setPickupData(prev => ({ ...prev, pickup_date: e.target.value }));
                        if (pickupError) setPickupError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Time *
                    </label>
                    <input
                      type="time"
                      value={pickupData.pickup_time}
                      onChange={(e) => {
                        setPickupData(prev => ({ ...prev, pickup_time: e.target.value }));
                        if (pickupError) setPickupError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Package Count *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pickupData.expected_package_count}
                      onChange={(e) => {
                        setPickupData(prev => ({ ...prev, expected_package_count: parseInt(e.target.value) || 1 }));
                        if (pickupError) setPickupError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Locations *
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {pickupLocations.length === 0 ? (
                        <p className="text-sm text-gray-500">No pickup locations configured</p>
                      ) : (
                        pickupLocations.map((location) => (
                          <label key={location.value} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedPickupLocations.includes(location.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPickupLocations(prev => [...prev, location.value]);
                                } else {
                                  setSelectedPickupLocations(prev => prev.filter(loc => loc !== location.value));
                                }
                                if (pickupError) setPickupError('');
                              }}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{location.label}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {pickupLocations.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPickupLocations(pickupLocations.map(loc => loc.value));
                            if (pickupError) setPickupError('');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPickupLocations([]);
                            if (pickupError) setPickupError('');
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Deselect All
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowPickupModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isSubmittingPickup}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePickupRequest}
                    disabled={isSubmittingPickup || !pickupData.pickup_date || !pickupData.pickup_time || !pickupData.expected_package_count || selectedPickupLocations.length === 0}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingPickup ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show login screen if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/images/scan2ship.png"
              alt="Scan2Ship Logo"
              width={80}
              height={80}
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan2Ship</h1>
          <p className="text-gray-600">SaaS Logistics Management Platform</p>
          <p className="text-sm text-gray-500 mt-1">Please log in to continue</p>
        </div>
      </div>
    </div>
  );
}
