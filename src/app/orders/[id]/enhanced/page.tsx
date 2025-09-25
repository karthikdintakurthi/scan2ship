'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import EnhancedOrderDetails from '@/components/EnhancedOrderDetails';
import { useAuth } from '@/contexts/AuthContext';

export default function EnhancedOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { currentClient } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
    }
  }, [params.id]);

  const fetchOrder = async (orderId: string) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found');
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch order');
        }
        return;
      }

      const orderData = await response.json();
      setOrder(orderData);
      
    } catch (error: any) {
      console.error('Error fetching order:', error);
      setError('Failed to fetch order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderUpdate = async (orderData: any) => {
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update order');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      
    } catch (error: any) {
      console.error('Order update error:', error);
      throw error;
    }
  };

  const handleOrderDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete order');
      }

      // Redirect to orders list
      router.push('/orders');
      
    } catch (error: any) {
      console.error('Order deletion error:', error);
      alert('Failed to delete order: ' + error.message);
    }
  };

  if (!currentClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-4">The requested order could not be found.</p>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
              <p className="text-gray-600 mt-2">
                View and manage order with integrated product information
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/orders')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Back to Orders
              </button>
              <button
                onClick={() => router.push(`/orders/enhanced?edit=${order.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Order
              </button>
            </div>
          </div>
        </div>

        <EnhancedOrderDetails
          order={order}
          onOrderUpdate={handleOrderUpdate}
          onOrderDelete={handleOrderDelete}
          canEdit={true}
        />
      </div>
    </div>
  );
}
