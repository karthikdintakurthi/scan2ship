'use client'

import OrderForm from '@/components/OrderForm'

export default function OrdersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Create Order
        </h1>
        <p className="text-xl text-gray-600">
          Create orders using AI-powered address processing or manual entry
        </p>
      </div>
      <OrderForm />
    </div>
  )
}
