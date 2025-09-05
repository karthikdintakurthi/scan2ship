'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { authenticatedGet } from '@/lib/api-client';

interface Order {
  id: number;
  name: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  courier_service: string;
  pickup_location: string;
  package_value: number;
  weight: number;
  total_items: number;
  tracking_id?: string;
  reference_number?: string;
  is_cod: boolean;
  cod_amount?: number;
  created_at: string;
  updated_at: string;
  product_description?: string;
  seller_name?: string;
  seller_address?: string;
  delhivery_waybill_number?: string;
  delhivery_order_id?: string;
  delhivery_api_status?: string;
  delhivery_api_error?: string;
}

interface PickupLocation {
  id: string;
  value: string;
  label: string;
  clientId: string;
}


export default function AdminOrdersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupLocationFilter, setPickupLocationFilter] = useState('all');

  // Check if user is admin (client admin)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/');
    }
  }, [currentUser, router]);

  // Fetch orders and users for the client
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch orders for the client
        const ordersResponse = await authenticatedGet('/api/orders');
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          setOrders(ordersData.orders || []);
        } else {
          setError('Failed to fetch orders');
        }

        // Fetch pickup locations for the client
        const pickupLocationsResponse = await authenticatedGet('/api/pickup-locations');
        if (pickupLocationsResponse.ok) {
          const pickupLocationsData = await pickupLocationsResponse.json();
          setPickupLocations(pickupLocationsData.pickupLocations || []);
        } else {
          setError('Failed to fetch pickup locations');
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data');
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && currentUser.role === 'admin') {
      fetchData();
    }
  }, [currentUser, router]);

  // Filter orders based on search and pickup location
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.mobile.includes(searchTerm) ||
      order.tracking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPickupLocation = pickupLocationFilter === 'all' || 
      order.pickup_location === pickupLocationFilter;
    
    return matchesSearch && matchesPickupLocation;
  });

  // Show loading if checking authentication
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (currentUser.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Orders</h1>
        <p className="text-gray-600 mt-2">View and manage all orders from your client organization</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Location Filter
            </label>
            <select
              id="pickupLocation"
              value={pickupLocationFilter}
              onChange={(e) => setPickupLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Pickup Locations</option>
              {pickupLocations.map((location) => (
                <option key={location.id} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Orders
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name, mobile, tracking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Orders ({filteredOrders.length})
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            All orders created by users in your client organization
          </p>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || pickupLocationFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No orders have been created yet.'
              }
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <li key={order.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.mobile} • {order.city}, {order.state} {order.pincode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ₹{order.package_value.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.total_items} item{order.total_items !== 1 ? 's' : ''} • {order.weight}g
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {order.courier_service}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {order.pickup_location}
                        </span>
                        {order.is_cod && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            COD: ₹{order.cod_amount}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Created: {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        {order.tracking_id && (
                          <p className="text-xs text-gray-500">
                            Tracking: {order.tracking_id}
                          </p>
                        )}
                      </div>
                    </div>

                    {order.product_description && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          {order.product_description}
                        </p>
                      </div>
                    )}

                    {order.delhivery_waybill_number && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Waybill: {order.delhivery_waybill_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
