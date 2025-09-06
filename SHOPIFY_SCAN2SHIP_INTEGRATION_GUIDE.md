# Shopify to Scan2Ship API Integration Guide

## Overview
This guide provides complete documentation for integrating your Shopify app with Scan2Ship APIs for seamless order management and shipping operations.

## Table of Contents
1. [Authentication Setup](#authentication-setup)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [Shopify App Integration Code](#shopify-app-integration-code)
4. [Error Handling](#error-handling)
5. [Testing & Validation](#testing--validation)
6. [Production Deployment](#production-deployment)

---

## Authentication Setup

### 1. Scan2Ship API Credentials

**Base URL**: `https://qa.scan2ship.in/api` (QA Environment)
**Production URL**: `https://scan2ship.in/api` (Production)

**Required Headers for All Requests**:
```javascript
{
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json',
  'x-vercel-protection-bypass': 'scan2shiplogisticssupersecretkey'
}
```

### 2. Authentication Methods

#### Method 1: JWT Authentication (Recommended)
```javascript
// Step 1: Login to get JWT token
const loginResponse = await fetch('https://qa.scan2ship.in/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-vercel-protection-bypass': 'scan2shiplogisticssupersecretkey'
  },
  body: JSON.stringify({
    email: 'test@scan2ship.com',
    password: 'ammananna'
  })
});

const { session, user } = await loginResponse.json();
const jwtToken = session.token; // Use this for all subsequent API calls
```

#### Method 2: API Key Authentication (Alternative)
```javascript
// Use API key directly (temporary solution)
const apiKey = 'sk_karthik_admin_m3t2z3kww7t';
// Use in Authorization header: `Bearer ${apiKey}`
```

---

## API Endpoints Reference

### 1. Authentication Endpoints

#### POST /api/auth/login
**Purpose**: Authenticate user and get JWT token

**Request**:
```javascript
{
  "email": "test@scan2ship.com",
  "password": "ammananna"
}
```

**Response**:
```javascript
{
  "user": {
    "id": "user-id",
    "email": "test@scan2ship.com",
    "name": "Test User",
    "role": "user",
    "isActive": true,
    "clientId": "default-client-001"
  },
  "session": {
    "token": "jwt-token-here",
    "expiresAt": "2025-09-06T10:06:54.568Z"
  }
}
```

### 2. Courier Services

#### GET /api/courier-services
**Purpose**: Get available courier services

**Response**:
```javascript
{
  "courierServices": [
    {
      "id": "courier-id",
      "value": "delhivery",
      "label": "Delhivery",
      "isActive": true,
      "isDefault": true,
      "baseRate": null,
      "ratePerKg": 10,
      "minWeight": 500,
      "maxWeight": 50000,
      "codCharges": 20,
      "freeShippingThreshold": 1000,
      "estimatedDays": 3
    }
  ],
  "clientId": "default-client-001",
  "clientName": "Default Company"
}
```

### 3. Orders Management

#### POST /api/orders
**Purpose**: Create new shipping order

**Request**:
```javascript
{
  "reference_number": "SHOPIFY-ORDER-1001",
  "name": "John Doe",
  "phone": "+91-9876543210",
  "mobile": "+91-9876543210",
  "address": "123 Main Street, Apartment 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "pincode": "400001",
  "product_description": "Electronics - Smartphone",
  "weight": 500,
  "package_value": 25000,
  "is_cod": false,
  "cod_amount": 0,
  "pickup_location": "VIJAYA8 FRANCHISE",
  "courier_service": "delhivery",
  "shipment_length": 20,
  "shipment_breadth": 15,
  "shipment_height": 10,
  "total_items": 1
}
```

**Response**:
```javascript
{
  "success": true,
  "order": {
    "id": "order-id",
    "reference_number": "SHOPIFY-ORDER-1001",
    "tracking_id": "DEL123456789",
    "waybill_number": "DEL123456789",
    "status": "created",
    "courier_service": "delhivery",
    "estimated_delivery": "2025-09-09T00:00:00.000Z"
  }
}
```

#### GET /api/orders
**Purpose**: Get orders with pagination and filtering

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status
- `courier_service`: Filter by courier service

**Response**:
```javascript
{
  "orders": [
    {
      "id": "order-id",
      "reference_number": "SHOPIFY-ORDER-1001",
      "tracking_id": "DEL123456789",
      "status": "in_transit",
      "createdAt": "2025-09-06T02:06:54.568Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 4. Shipping Labels & Waybills

#### GET /api/orders/{id}/shipping-label
**Purpose**: Generate shipping label PDF

**Response**: PDF file download

#### GET /api/orders/{id}/waybill
**Purpose**: Generate waybill PDF

**Response**: PDF file download

### 5. Tracking

#### GET /api/orders/{id}/tracking
**Purpose**: Get order tracking information

**Response**:
```javascript
{
  "orderId": "order-id",
  "trackingId": "DEL123456789",
  "status": "in_transit",
  "trackingHistory": [
    {
      "status": "picked_up",
      "timestamp": "2025-09-06T10:00:00.000Z",
      "location": "Mumbai Hub",
      "description": "Package picked up from origin"
    },
    {
      "status": "in_transit",
      "timestamp": "2025-09-06T14:00:00.000Z",
      "location": "Delhi Hub",
      "description": "Package in transit to destination"
    }
  ]
}
```

---

## Shopify App Integration Code

### 1. Shopify App Setup (app/routes/app._index.tsx)

```typescript
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

// Scan2Ship API Configuration
const SCAN2SHIP_CONFIG = {
  baseUrl: process.env.SCAN2SHIP_BASE_URL || 'https://qa.scan2ship.in/api',
  bypassToken: 'scan2shiplogisticssupersecretkey',
  credentials: {
    email: 'test@scan2ship.com',
    password: 'ammananna'
  }
};

// Scan2Ship API Client
class Scan2ShipAPI {
  private baseUrl: string;
  private bypassToken: string;
  private credentials: { email: string; password: string };
  private jwtToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: typeof SCAN2SHIP_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.bypassToken = config.bypassToken;
    this.credentials = config.credentials;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    // Check if token is expired
    if (!this.jwtToken || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
      await this.authenticate();
    }

    return {
      'Authorization': `Bearer ${this.jwtToken}`,
      'Content-Type': 'application/json',
      'x-vercel-protection-bypass': this.bypassToken
    };
  }

  private async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-protection-bypass': this.bypassToken
        },
        body: JSON.stringify(this.credentials)
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.jwtToken = data.session.token;
      this.tokenExpiry = new Date(data.session.expiresAt);
      
      console.log('✅ Scan2Ship authentication successful');
    } catch (error) {
      console.error('❌ Scan2Ship authentication failed:', error);
      throw error;
    }
  }

  async getCourierServices() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/courier-services`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courier services: ${response.statusText}`);
    }

    return response.json();
  }

  async createOrder(orderData: any) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create order: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async getOrders(params: { page?: number; limit?: number; status?: string } = {}) {
    const headers = await this.getAuthHeaders();
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const url = `${this.baseUrl}/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }

    return response.json();
  }

  async getOrderTracking(orderId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/tracking`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tracking: ${response.statusText}`);
    }

    return response.json();
  }

  async generateShippingLabel(orderId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/shipping-label`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to generate shipping label: ${response.statusText}`);
    }

    return response.blob(); // Returns PDF blob
  }

  async generateWaybill(orderId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/waybill`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to generate waybill: ${response.statusText}`);
    }

    return response.blob(); // Returns PDF blob
  }
}

// Initialize Scan2Ship API client
const scan2shipAPI = new Scan2ShipAPI(SCAN2SHIP_CONFIG);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  try {
    // Fetch courier services
    const courierServices = await scan2shipAPI.getCourierServices();
    
    // Fetch recent orders
    const orders = await scan2shipAPI.getOrders({ page: 1, limit: 10 });

    return json({
      courierServices: courierServices.courierServices,
      orders: orders.orders,
      pagination: orders.pagination
    });
  } catch (error) {
    console.error('Error loading Scan2Ship data:', error);
    return json({
      courierServices: [],
      orders: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default function Index() {
  const { courierServices, orders, pagination, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scan2Ship Integration</h1>
      
      {/* Courier Services */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Courier Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courierServices.map((service: any) => (
            <div key={service.id} className="p-4 border rounded-lg">
              <h3 className="font-medium">{service.label}</h3>
              <p className="text-sm text-gray-600">Code: {service.value}</p>
              <p className="text-sm text-gray-600">
                Status: {service.isActive ? 'Active' : 'Inactive'}
              </p>
              {service.ratePerKg && (
                <p className="text-sm text-gray-600">
                  Rate: ₹{service.ratePerKg}/kg
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Orders */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order: any) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.reference_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'created' ? 'bg-green-100 text-green-800' :
                      order.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### 2. Order Creation Component

```typescript
// components/OrderCreationForm.tsx
import { useState } from 'react';

interface OrderFormData {
  reference_number: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  product_description: string;
  weight: number;
  package_value: number;
  is_cod: boolean;
  cod_amount: number;
  pickup_location: string;
  courier_service: string;
  shipment_length: number;
  shipment_breadth: number;
  shipment_height: number;
  total_items: number;
}

export default function OrderCreationForm({ 
  courierServices, 
  onCreateOrder 
}: { 
  courierServices: any[];
  onCreateOrder: (orderData: OrderFormData) => Promise<void>;
}) {
  const [formData, setFormData] = useState<OrderFormData>({
    reference_number: '',
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    product_description: '',
    weight: 0,
    package_value: 0,
    is_cod: false,
    cod_amount: 0,
    pickup_location: 'VIJAYA8 FRANCHISE',
    courier_service: 'delhivery',
    shipment_length: 20,
    shipment_breadth: 15,
    shipment_height: 10,
    total_items: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateOrder(formData);
      // Reset form or show success message
      setFormData({
        reference_number: '',
        name: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        product_description: '',
        weight: 0,
        package_value: 0,
        is_cod: false,
        cod_amount: 0,
        pickup_location: 'VIJAYA8 FRANCHISE',
        courier_service: 'delhivery',
        shipment_length: 20,
        shipment_breadth: 15,
        shipment_height: 10,
        total_items: 1
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reference Number *
          </label>
          <input
            type="text"
            required
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Customer Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Pincode *
          </label>
          <input
            type="text"
            required
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            City *
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            State *
          </label>
          <input
            type="text"
            required
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Address *
        </label>
        <textarea
          required
          rows={3}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product Description *
          </label>
          <input
            type="text"
            required
            value={formData.product_description}
            onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Courier Service *
          </label>
          <select
            required
            value={formData.courier_service}
            onChange={(e) => setFormData({ ...formData, courier_service: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {courierServices.map((service) => (
              <option key={service.id} value={service.value}>
                {service.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Weight (grams) *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Package Value (₹) *
          </label>
          <input
            type="number"
            required
            min="0"
            value={formData.package_value}
            onChange={(e) => setFormData({ ...formData, package_value: parseInt(e.target.value) })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_cod"
          checked={formData.is_cod}
          onChange={(e) => setFormData({ ...formData, is_cod: e.target.checked })}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="is_cod" className="ml-2 block text-sm text-gray-900">
          Cash on Delivery (COD)
        </label>
      </div>

      {formData.is_cod && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            COD Amount (₹)
          </label>
          <input
            type="number"
            min="0"
            value={formData.cod_amount}
            onChange={(e) => setFormData({ ...formData, cod_amount: parseInt(e.target.value) })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating Order...' : 'Create Order'}
        </button>
      </div>
    </form>
  );
}
```

### 3. Environment Configuration

```bash
# .env
SCAN2SHIP_BASE_URL=https://qa.scan2ship.in/api
SCAN2SHIP_EMAIL=test@scan2ship.com
SCAN2SHIP_PASSWORD=ammananna
SCAN2SHIP_BYPASS_TOKEN=scan2shiplogisticssupersecretkey
```

---

## Error Handling

### 1. API Error Handler

```typescript
// utils/errorHandler.ts
export class Scan2ShipError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'Scan2ShipError';
  }
}

export async function handleScan2ShipResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorData: any = null;

    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use status text
    }

    throw new Scan2ShipError(errorMessage, response.status, errorData);
  }

  return response.json();
}
```

### 2. Retry Logic

```typescript
// utils/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}
```

---

## Testing & Validation

### 1. Test API Connection

```typescript
// utils/testConnection.ts
export async function testScan2ShipConnection() {
  try {
    const scan2shipAPI = new Scan2ShipAPI(SCAN2SHIP_CONFIG);
    
    // Test authentication
    await scan2shipAPI.getCourierServices();
    console.log('✅ Scan2Ship connection successful');
    
    return true;
  } catch (error) {
    console.error('❌ Scan2Ship connection failed:', error);
    return false;
  }
}
```

### 2. Validate Order Data

```typescript
// utils/validation.ts
export function validateOrderData(orderData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!orderData.reference_number) errors.push('Reference number is required');
  if (!orderData.name) errors.push('Customer name is required');
  if (!orderData.phone) errors.push('Phone number is required');
  if (!orderData.address) errors.push('Address is required');
  if (!orderData.city) errors.push('City is required');
  if (!orderData.state) errors.push('State is required');
  if (!orderData.pincode) errors.push('Pincode is required');
  if (!orderData.product_description) errors.push('Product description is required');
  if (!orderData.weight || orderData.weight <= 0) errors.push('Valid weight is required');
  if (!orderData.package_value || orderData.package_value < 0) errors.push('Valid package value is required');
  if (!orderData.courier_service) errors.push('Courier service is required');

  // Validate pincode format (6 digits for India)
  if (orderData.pincode && !/^\d{6}$/.test(orderData.pincode)) {
    errors.push('Pincode must be 6 digits');
  }

  // Validate phone number format
  if (orderData.phone && !/^\+?[\d\s-()]{10,}$/.test(orderData.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## Production Deployment

### 1. Environment Variables

```bash
# Production .env
SCAN2SHIP_BASE_URL=https://scan2ship.in/api
SCAN2SHIP_EMAIL=your-production-email@scan2ship.com
SCAN2SHIP_PASSWORD=your-production-password
SCAN2SHIP_BYPASS_TOKEN=your-production-bypass-token
```

### 2. Security Considerations

```typescript
// utils/security.ts
export function sanitizeOrderData(orderData: any) {
  return {
    ...orderData,
    // Sanitize text fields
    name: orderData.name?.trim().substring(0, 100),
    address: orderData.address?.trim().substring(0, 500),
    product_description: orderData.product_description?.trim().substring(0, 200),
    // Ensure numeric values are valid
    weight: Math.max(1, Math.min(50000, parseInt(orderData.weight) || 1)),
    package_value: Math.max(0, parseInt(orderData.package_value) || 0),
    cod_amount: Math.max(0, parseInt(orderData.cod_amount) || 0)
  };
}
```

### 3. Rate Limiting

```typescript
// utils/rateLimiter.ts
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();
```

---

## Complete Integration Example

Here's a complete example of how to integrate Scan2Ship APIs in your Shopify app:

```typescript
// app/routes/orders.new.tsx
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { scan2shipAPI } from "../utils/scan2shipClient";
import { validateOrderData } from "../utils/validation";
import { withRetry } from "../utils/retry";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  try {
    const courierServices = await scan2shipAPI.getCourierServices();
    return json({ courierServices: courierServices.courierServices });
  } catch (error) {
    return json({ 
      courierServices: [], 
      error: error instanceof Error ? error.message : 'Failed to load courier services' 
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  
  const formData = await request.formData();
  const orderData = Object.fromEntries(formData);

  // Validate order data
  const validation = validateOrderData(orderData);
  if (!validation.isValid) {
    return json({ 
      success: false, 
      errors: validation.errors 
    }, { status: 400 });
  }

  try {
    // Create order with retry logic
    const result = await withRetry(
      () => scan2shipAPI.createOrder(orderData),
      3,
      1000
    );

    return json({ 
      success: true, 
      order: result.order 
    });
  } catch (error) {
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create order' 
    }, { status: 500 });
  }
};

export default function NewOrder() {
  const { courierServices, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Order</h1>
      
      {actionData?.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-6">
          <h3 className="text-green-800 font-medium">Success!</h3>
          <p className="text-green-600 mt-1">
            Order created successfully. Order ID: {actionData.order?.id}
          </p>
        </div>
      )}

      {actionData?.errors && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
          <h3 className="text-red-800 font-medium">Validation Errors</h3>
          <ul className="text-red-600 mt-1 list-disc list-inside">
            {actionData.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <Form method="post" className="space-y-6">
        {/* Form fields here - same as OrderCreationForm component */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Create Order
          </button>
        </div>
      </Form>
    </div>
  );
}
```

This comprehensive guide provides everything you need to integrate your Shopify app with Scan2Ship APIs seamlessly. The code includes proper error handling, validation, retry logic, and production-ready features.
