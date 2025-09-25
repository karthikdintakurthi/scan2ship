'use client'

import { useState } from 'react';
import OrderForm from '@/components/OrderForm';
import ProductSelection from '@/components/ProductSelection';
import { useAuth } from '@/contexts/AuthContext';
import { OrderItem } from '@/types/catalog';

export default function OrdersPage() {
  const { currentClient } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);

  const handleProductsChange = (items: OrderItem[]) => {
    setSelectedProducts(items);
  };

  const handleOrderSuccess = () => {
    setSelectedProducts([]); // Reset selected products after successful order
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Create Order
        </h1>
        <p className="text-xl text-gray-600">
          Create orders with product selection and AI-powered address processing
        </p>
      </div>
      
      {/* Product Selection Section */}
      <ProductSelection 
        onProductsChange={handleProductsChange}
        currentClient={currentClient}
      />
      
      {/* Order Form */}
      <OrderForm 
        selectedProducts={selectedProducts} 
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  )
}
