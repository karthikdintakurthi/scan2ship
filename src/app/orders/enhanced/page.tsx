'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedOrderForm from '@/components/EnhancedOrderForm';
import { useAuth } from '@/contexts/AuthContext';

export default function EnhancedOrdersPage() {
  const router = useRouter();
  const { currentClient } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleOrderCreate = async (orderData: any) => {
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const result = await response.json();
      
      // Redirect to order details or orders list
      router.push(`/view-orders?orderId=${result.orderId}`);
      
    } catch (error: any) {
      console.error('Order creation error:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleOrderUpdate = async (orderData: any) => {
    // Handle order update logic
    console.log('Order update:', orderData);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enhanced Orders</h1>
              <p className="text-gray-600 mt-2">
                Create orders with integrated product catalog and inventory management
              </p>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Back to Orders
            </button>
          </div>
        </div>

        <EnhancedOrderForm
          onOrderCreate={handleOrderCreate}
          onOrderUpdate={handleOrderUpdate}
        />
      </div>
    </div>
  );
}
