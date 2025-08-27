# Vanitha Logistics (Scan2Ship) - API Documentation

## Overview

The Vanitha Logistics API provides comprehensive endpoints for managing logistics operations, including order management, client administration, courier integrations, and analytics. The API follows RESTful principles and uses JWT authentication for security.

**Base URL**: `https://scan2ship.vercel.app/api`

## Authentication

### JWT Token Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

**Login Endpoint**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "clientId": "client-456"
    }
  }
}
```

## Order Management API

### Create Order

**Endpoint**: `POST /api/orders`

**Description**: Creates a new order with optional courier integration.

**Request Body**:
```json
{
  "name": "John Doe",
  "mobile": "9876543210",
  "phone": "9876543210",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "pincode": "400001",
  "courier_service": "delhivery",
  "pickup_location": "RVD Jewels",
  "package_value": 5000,
  "weight": 100,
  "total_items": 1,
  "reference_number": "REF123456",
  "is_cod": false,
  "cod_amount": null,
  "reseller_name": "",
  "reseller_mobile": "",
  "shipment_length": 10,
  "shipment_breadth": 10,
  "shipment_height": 10,
  "product_description": "Artificial Jewellery",
  "return_address": "Mahalakshmi Complex-2, 2nd floor Vijayawada",
  "return_pincode": "520002",
  "fragile_shipment": false,
  "seller_name": "RVD Jewels",
  "seller_address": "Mahalakshmi Complex-2, 2nd floor Vijayawada 520002",
  "seller_gst": "",
  "invoice_number": "INV123456",
  "commodity_value": 5000,
  "tax_value": 0,
  "category_of_goods": "Artificial Jewellery",
  "vendor_pickup_location": "RVD Jewels",
  "hsn_code": "",
  "seller_cst_no": "",
  "seller_tin": "",
  "invoice_date": "2024-01-15",
  "return_reason": ""
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "John Doe",
    "mobile": "9876543210",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001",
    "courier_service": "delhivery",
    "pickup_location": "RVD Jewels",
    "package_value": 5000,
    "weight": 100,
    "total_items": 1,
    "reference_number": "REF123456",
    "is_cod": false,
    "created_at": "2024-01-15T10:30:00Z",
    "delhivery_waybill_number": "1234567890123",
    "delhivery_order_id": "DEL123456",
    "delhivery_api_status": "success"
  },
  "message": "Order created successfully"
}
```

### Get Orders

**Endpoint**: `GET /api/orders`

**Description**: Retrieves orders with pagination and search capabilities.

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search term for name, mobile, tracking_id, or reference_number
- `status` (optional): Filter by order status
- `courier_service` (optional): Filter by courier service
- `date_from` (optional): Filter orders from date (YYYY-MM-DD)
- `date_to` (optional): Filter orders to date (YYYY-MM-DD)

**Example Request**:
```http
GET /api/orders?page=1&limit=20&search=John&courier_service=delhivery
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "John Doe",
      "mobile": "9876543210",
      "address": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "pincode": "400001",
      "courier_service": "delhivery",
      "pickup_location": "RVD Jewels",
      "package_value": 5000,
      "weight": 100,
      "total_items": 1,
      "reference_number": "REF123456",
      "is_cod": false,
      "created_at": "2024-01-15T10:30:00Z",
      "delhivery_waybill_number": "1234567890123",
      "delhivery_api_status": "success"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Get Order by ID

**Endpoint**: `GET /api/orders/{id}`

**Description**: Retrieves a specific order by its ID.

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "John Doe",
    "mobile": "9876543210",
    "phone": "9876543210",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001",
    "courier_service": "delhivery",
    "pickup_location": "RVD Jewels",
    "package_value": 5000,
    "weight": 100,
    "total_items": 1,
    "tracking_id": null,
    "reference_number": "REF123456",
    "is_cod": false,
    "cod_amount": null,
    "reseller_name": "",
    "reseller_mobile": "",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "delhivery_waybill_number": "1234567890123",
    "delhivery_order_id": "DEL123456",
    "delhivery_api_status": "success",
    "delhivery_api_error": null,
    "delhivery_retry_count": 0,
    "last_delhivery_attempt": "2024-01-15T10:30:00Z"
  }
}
```

### Update Order

**Endpoint**: `PUT /api/orders/{id}`

**Description**: Updates an existing order.

**Request Body**: Same as create order (all fields optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "John Doe Updated",
    "mobile": "9876543210",
    "updated_at": "2024-01-15T11:00:00Z"
  },
  "message": "Order updated successfully"
}
```

### Delete Order

**Endpoint**: `DELETE /api/orders/{id}`

**Description**: Deletes an order.

**Response**:
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

### Retry Delhivery API

**Endpoint**: `POST /api/orders/{id}/retry-delhivery`

**Description**: Retries the Delhivery API call for a specific order.

**Response**:
```json
{
  "success": true,
  "data": {
    "delhivery_waybill_number": "1234567890123",
    "delhivery_order_id": "DEL123456",
    "delhivery_api_status": "success"
  },
  "message": "Delhivery order created successfully"
}
```

## Client Management API

### Get Clients (Admin Only)

**Endpoint**: `GET /api/admin/clients`

**Description**: Retrieves all clients (admin access required).

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by company name or email
- `status` (optional): Filter by subscription status

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "client-123",
      "name": "John Smith",
      "companyName": "RVD Jewels",
      "email": "john@rvdjewels.com",
      "phone": "9876543210",
      "address": "Mahalakshmi Complex-2",
      "city": "Vijayawada",
      "state": "Andhra Pradesh",
      "country": "India",
      "pincode": "520002",
      "subscriptionPlan": "professional",
      "subscriptionStatus": "active",
      "subscriptionExpiresAt": "2024-12-31T23:59:59Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Create Client (Admin Only)

**Endpoint**: `POST /api/admin/clients`

**Description**: Creates a new client.

**Request Body**:
```json
{
  "name": "John Smith",
  "companyName": "RVD Jewels",
  "email": "john@rvdjewels.com",
  "phone": "9876543210",
  "address": "Mahalakshmi Complex-2",
  "city": "Vijayawada",
  "state": "Andhra Pradesh",
  "country": "India",
  "pincode": "520002",
  "subscriptionPlan": "professional"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "client-123",
    "name": "John Smith",
    "companyName": "RVD Jewels",
    "email": "john@rvdjewels.com",
    "subscriptionPlan": "professional",
    "subscriptionStatus": "active",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "message": "Client created successfully"
}
```

### Update Client (Admin Only)

**Endpoint**: `PUT /api/admin/clients/{id}`

**Description**: Updates client information.

**Request Body**: Same as create client (all fields optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "client-123",
    "companyName": "RVD Jewels Updated",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Client updated successfully"
}
```

## Configuration Management API

### Get Pickup Locations

**Endpoint**: `GET /api/pickup-locations`

**Description**: Retrieves pickup locations for the authenticated client.

**Response**:
```json
{
  "success": true,
  "data": {
    "pickupLocations": [
      {
        "value": "rvd jewels",
        "label": "RVD Jewels",
        "delhiveryApiKey": "2bce24815f3e4da2513ab4aafb7ecb251469c4a9",
        "productDetails": {
          "description": "ARTIFICAL JEWELLERY",
          "commodity_value": 5000,
          "tax_value": 0,
          "category": "ARTIFICAL JEWELLERY",
          "hsn_code": ""
        },
        "returnAddress": {
          "address": "Mahalakshmi Complex-2, 2nd floor Vijayawada",
          "pincode": "520002"
        },
        "sellerDetails": {
          "name": "RVD Jewels",
          "address": "Mahalakshmi Complex-2, 2nd floor Vijayawada 520002",
          "gst": "",
          "cst_no": "",
          "tin": ""
        },
        "vendorPickupLocation": "rvd jewels",
        "shipmentDimensions": {
          "length": 10,
          "breadth": 10,
          "height": 10
        },
        "fragileShipment": false
      }
    ],
    "clientId": "client-123",
    "clientName": "RVD Jewels"
  }
}
```

### Get Courier Services

**Endpoint**: `GET /api/courier-services`

**Description**: Retrieves available courier services for the authenticated client.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "courier-123",
      "code": "delhivery",
      "name": "Delhivery",
      "isActive": true,
      "isDefault": true
    },
    {
      "id": "courier-124",
      "code": "dtdc",
      "name": "DTDC",
      "isActive": true,
      "isDefault": false
    }
  ]
}
```

### Get Order Configuration

**Endpoint**: `GET /api/order-config`

**Description**: Retrieves order configuration settings for the authenticated client.

**Response**:
```json
{
  "success": true,
  "data": {
    "defaultProductDescription": "ARTIFICAL JEWELLERY",
    "defaultPackageValue": 5000,
    "defaultWeight": 100,
    "defaultTotalItems": 1,
    "codEnabledByDefault": false,
    "defaultCodAmount": null,
    "minPackageValue": 100,
    "maxPackageValue": 100000,
    "minWeight": 1,
    "maxWeight": 50000,
    "minTotalItems": 1,
    "maxTotalItems": 100,
    "requireProductDescription": true,
    "requirePackageValue": true,
    "requireWeight": true,
    "requireTotalItems": true
  }
}
```

## Analytics API

### Get Order Analytics

**Endpoint**: `GET /api/analytics/orders`

**Description**: Retrieves order analytics for the authenticated client.

**Query Parameters**:
- `period` (optional): Time period (daily, weekly, monthly, yearly)
- `date_from` (optional): Start date (YYYY-MM-DD)
- `date_to` (optional): End date (YYYY-MM-DD)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "totalRevenue": 750000,
    "averageOrderValue": 5000,
    "ordersByStatus": {
      "pending": 25,
      "in_transit": 80,
      "delivered": 40,
      "failed": 5
    },
    "ordersByCourier": {
      "delhivery": 120,
      "dtdc": 30
    },
    "dailyOrders": [
      {
        "date": "2024-01-15",
        "orders": 10,
        "revenue": 50000
      }
    ],
    "topProducts": [
      {
        "description": "Artificial Jewellery",
        "orders": 100,
        "revenue": 500000
      }
    ]
  }
}
```

### Get Client Analytics (Admin Only)

**Endpoint**: `GET /api/analytics/clients`

**Description**: Retrieves client analytics (admin access required).

**Response**:
```json
{
  "success": true,
  "data": {
    "totalClients": 25,
    "activeClients": 20,
    "totalRevenue": 2500000,
    "clientsByPlan": {
      "basic": 10,
      "professional": 12,
      "enterprise": 3
    },
    "clientsByStatus": {
      "active": 20,
      "inactive": 5
    },
    "topClients": [
      {
        "clientId": "client-123",
        "companyName": "RVD Jewels",
        "orders": 500,
        "revenue": 2500000
      }
    ]
  }
}
```

## Utility APIs

### Validate Pincode

**Endpoint**: `POST /api/validate-pincode`

**Description**: Validates if a pincode is serviceable by Delhivery.

**Request Body**:
```json
{
  "pincode": "400001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "pincode": "400001",
    "isServiceable": true,
    "city": "Mumbai",
    "state": "Maharashtra",
    "message": "✅ Serviceable by Delhivery"
  }
}
```

### Format Address

**Endpoint**: `POST /api/format-address`

**Description**: Formats and validates address using AI.

**Request Body**:
```json
{
  "address": "123 main st mumbai maharashtra 400001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "formattedAddress": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

## Error Handling

### Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required or invalid token |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_SERVER_ERROR` | Server error |

### Example Error Response

```json
{
  "success": false,
  "error": "Order not found",
  "code": "NOT_FOUND"
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authentication endpoints**: 10 requests per minute
- **Order endpoints**: 100 requests per minute
- **Analytics endpoints**: 30 requests per minute
- **Configuration endpoints**: 50 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## Webhooks

### Delhivery Webhook

**Endpoint**: `POST /api/webhooks/delhivery`

**Description**: Receives delivery status updates from Delhivery.

**Request Body**:
```json
{
  "waybill": "1234567890123",
  "status": "Delivered",
  "timestamp": "2024-01-15T10:30:00Z",
  "location": "Mumbai",
  "remarks": "Delivered to recipient"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```typescript
import { VanithaLogisticsAPI } from '@vanitha-logistics/sdk';

const api = new VanithaLogisticsAPI({
  baseUrl: 'https://scan2ship.vercel.app/api',
  token: 'your-jwt-token'
});

// Create order
const order = await api.orders.create({
  name: 'John Doe',
  mobile: '9876543210',
  // ... other fields
});

// Get orders
const orders = await api.orders.list({
  page: 1,
  limit: 20,
  search: 'John'
});
```

## Testing

### Postman Collection

A complete Postman collection is available for testing all API endpoints:

[Download Postman Collection](https://scan2ship.vercel.app/api/postman-collection.json)

### API Testing Endpoints

**Health Check**
```http
GET /api/health
```

**Test Authentication**
```http
POST /api/test-auth
Authorization: Bearer <token>
```

## Support

For API support and questions:

- **Documentation**: https://scan2ship.vercel.app/docs
- **GitHub Issues**: https://github.com/vanitha-logistics/scan2ship/issues
- **Email Support**: api-support@vanithalogistics.com

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Order management endpoints
- Client management endpoints
- Delhivery integration
- Analytics endpoints
- Multi-tenant support

### Upcoming Features
- Additional courier integrations
- Advanced analytics
- Real-time notifications
- Mobile API endpoints
