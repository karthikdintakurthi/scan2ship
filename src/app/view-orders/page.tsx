'use client'

import OrderList from '@/components/OrderList'

export default function ViewOrdersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          View Orders
        </h1>
        <p className="text-xl text-gray-600">
          Monitor and manage all your orders
        </p>
      </div>

      {/* Orders List */}
      <OrderList />
    </div>
  )
}
