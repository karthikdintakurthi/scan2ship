# Scan2Ship API Documentation

## Overview
Scan2Ship is a logistics courier aggregator application that provides APIs for external applications to integrate with order management, courier services, and logistics operations.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication
All API endpoints require JWT-based authentication using Bearer tokens.

### Authentication Flow
1. **Login**: `POST /api/auth/login`
2. **Get Token**: Extract `token` from response
3. **Use Token**: Include in `Authorization: Bearer <token>` header

### User Roles
- `master_admin`: Full system access
- `admin`: Client management access
- `user`: Standard user access

---

## API Endpoints

### Authentication APIs

#### POST /api/auth/login
**Description**: Authenticate user and get JWT token

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "isActive": true,
    "clientId": "client-id",
    "clients": {
      "id": "client-id",
      "companyName": "Company Name",
      "isActive": true
    }
  },
  "token": "jwt-token",
  "session": {
    "id": "session-id",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/auth/register-client
**Description**: Register a new client (Admin only)

**Request Body**:
```json
{
  "name": "Client Name",
  "companyName": "Company Name",
  "email": "client@example.com",
  "phone": "+1234567890",
  "address": "Client Address",
  "city": "City",
  "state": "State",
  "country": "India",
  "pincode": "123456"
}
```

#### POST /api/auth/register-user
**Description**: Register a new user under a client

**Request Body**:
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "clientId": "client-id"
}
```

#### GET /api/auth/verify
**Description**: Verify JWT token validity

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "valid": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

### Order Management APIs

#### POST /api/orders
**Description**: Create a new order

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Customer Name",
  "mobile": "9876543210",
  "phone": "9876543210",
  "address": "Delivery Address",
  "city": "City",
  "state": "State",
  "country": "India",
  "pincode": "123456",
  "courier_service": "DELHIVERY",
  "pickup_location": "Pickup Location",
  "package_value": 1000.00,
  "weight": 1.5,
  "total_items": 1,
  "is_cod": false,
  "cod_amount": null,
  "reference_number": "REF123",
  "tracking_id": "TRK123",
  "reseller_name": "Reseller Name",
  "reseller_mobile": "9876543210",
  "product_description": "Product Description",
  "shipment_length": 10.0,
  "shipment_breadth": 10.0,
  "shipment_height": 10.0,
  "return_address": "Return Address",
  "return_pincode": "123456",
  "fragile_shipment": false,
  "seller_name": "Seller Name",
  "seller_address": "Seller Address",
  "seller_gst": "GST123",
  "invoice_number": "INV123",
  "commodity_value": 1000.00,
  "tax_value": 180.00,
  "category_of_goods": "Electronics",
  "vendor_pickup_location": "Vendor Location",
  "hsn_code": "8517",
  "seller_cst_no": "CST123",
  "seller_tin": "TIN123",
  "invoice_date": "2024-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "order": {
    "id": 123,
    "name": "Customer Name",
    "mobile": "9876543210",
    "address": "Delivery Address",
    "city": "City",
    "state": "State",
    "country": "India",
    "pincode": "123456",
    "courier_service": "DELHIVERY",
    "pickup_location": "Pickup Location",
    "package_value": 1000.00,
    "weight": 1.5,
    "total_items": 1,
    "is_cod": false,
    "reference_number": "REF123",
    "tracking_id": "TRK123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "delhivery_waybill_number": "WB123456",
    "delhivery_order_id": "ORD123456",
    "delhivery_api_status": "success"
  }
}
```

#### GET /api/orders
**Description**: Get orders with pagination and filtering

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for name, mobile, tracking ID, or reference number
- `fromDate` (optional): Start date filter (YYYY-MM-DD)
- `toDate` (optional): End date filter (YYYY-MM-DD)
- `pickupLocation` (optional): Filter by pickup location
- `courierService` (optional): Filter by courier service

**Response**:
```json
{
  "orders": [
    {
      "id": 123,
      "name": "Customer Name",
      "mobile": "9876543210",
      "address": "Delivery Address",
      "city": "City",
      "state": "State",
      "country": "India",
      "pincode": "123456",
      "courier_service": "DELHIVERY",
      "pickup_location": "Pickup Location",
      "package_value": 1000.00,
      "weight": 1.5,
      "total_items": 1,
      "is_cod": false,
      "reference_number": "REF123",
      "tracking_id": "TRK123",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 100,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### GET /api/orders/[id]
**Description**: Get a specific order by ID

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "order": {
    "id": 123,
    "name": "Customer Name",
    "mobile": "9876543210",
    "address": "Delivery Address",
    "city": "City",
    "state": "State",
    "country": "India",
    "pincode": "123456",
    "courier_service": "DELHIVERY",
    "pickup_location": "Pickup Location",
    "package_value": 1000.00,
    "weight": 1.5,
    "total_items": 1,
    "is_cod": false,
    "reference_number": "REF123",
    "tracking_id": "TRK123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/orders/[id]
**Description**: Update an existing order

**Headers**: `Authorization: Bearer <token>`

**Request Body**: Same as POST /api/orders (partial updates supported)

**Response**:
```json
{
  "success": true,
  "order": {
    "id": 123,
    "name": "Updated Customer Name",
    "mobile": "9876543210",
    "address": "Updated Delivery Address",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE /api/orders/[id]
**Description**: Delete an order

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

#### GET /api/orders/[id]/shipping-label
**Description**: Get shipping label for an order

**Headers**: `Authorization: Bearer <token>`

**Response**: PDF file or JSON with label data

#### GET /api/orders/[id]/waybill
**Description**: Get waybill for an order

**Headers**: `Authorization: Bearer <token>`

**Response**: PDF file or JSON with waybill data

#### POST /api/orders/[id]/retry-delhivery
**Description**: Retry Delhivery API call for an order

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "message": "Delhivery API retry initiated",
  "order": {
    "id": 123,
    "delhivery_retry_count": 1,
    "last_delhivery_attempt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Courier Services APIs

#### GET /api/courier-services
**Description**: Get available courier services for the client

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "courierServices": [
    {
      "id": "service-id",
      "value": "DELHIVERY",
      "label": "Delhivery",
      "isActive": true,
      "isDefault": true
    }
  ],
  "clientId": "client-id",
  "clientName": "Company Name"
}
```

#### POST /api/courier-services
**Description**: Create a new courier service

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Service Name",
  "code": "SERVICE_CODE",
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "service": {
    "id": "service-id",
    "value": "SERVICE_CODE",
    "label": "Service Name",
    "isActive": true,
    "isDefault": false
  }
}
```

#### PUT /api/courier-services
**Description**: Update a courier service

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "id": "service-id",
  "name": "Updated Service Name",
  "code": "UPDATED_CODE",
  "isActive": true
}
```

---

### Pickup Locations APIs

#### GET /api/pickup-locations
**Description**: Get pickup locations for the client

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "pickupLocations": [
    {
      "id": "location-id",
      "value": "LOCATION_CODE",
      "label": "Location Name",
      "delhiveryApiKey": "api-key"
    }
  ],
  "clientId": "client-id",
  "clientName": "Company Name"
}
```

#### POST /api/pickup-locations
**Description**: Create a new pickup location

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "value": "LOCATION_CODE",
  "label": "Location Name",
  "delhiveryApiKey": "api-key"
}
```

#### PUT /api/pickup-locations
**Description**: Update a pickup location

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "id": "location-id",
  "value": "UPDATED_CODE",
  "label": "Updated Location Name",
  "delhiveryApiKey": "updated-api-key"
}
```

---

### Credits Management APIs

#### GET /api/credits
**Description**: Get client credit balance

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": 1000,
    "totalAdded": 2000,
    "totalUsed": 1000
  }
}
```

#### GET /api/credits/transactions
**Description**: Get credit transaction history

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response**:
```json
{
  "transactions": [
    {
      "id": "transaction-id",
      "type": "debit",
      "amount": 10,
      "balance": 990,
      "description": "Order creation",
      "feature": "ORDER",
      "orderId": 123,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### POST /api/credits/verify-payment
**Description**: Verify payment screenshot for credit addition

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": 1000,
  "utrNumber": "UTR123456789",
  "screenshot": "base64-encoded-image"
}
```

---

### Analytics APIs

#### POST /api/analytics/track
**Description**: Track analytics events

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "eventType": "order_created",
  "eventData": {
    "orderId": 123,
    "courierService": "DELHIVERY",
    "packageValue": 1000
  }
}
```

#### GET /api/analytics/platform
**Description**: Get platform-wide analytics (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "totalClients": 50,
  "totalOrders": 1000,
  "totalUsers": 150,
  "activeClients": 45,
  "recentOrders": 100
}
```

#### GET /api/analytics/clients
**Description**: Get client analytics (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "clients": [
    {
      "id": "client-id",
      "companyName": "Company Name",
      "totalOrders": 100,
      "totalUsers": 5,
      "lastOrderDate": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/analytics/clients/[id]
**Description**: Get specific client analytics (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "client": {
    "id": "client-id",
    "companyName": "Company Name",
    "totalOrders": 100,
    "totalUsers": 5,
    "ordersByMonth": [
      {
        "month": "2024-01",
        "count": 10
      }
    ],
    "ordersByCourier": [
      {
        "courier": "DELHIVERY",
        "count": 80
      }
    ]
  }
}
```

---

### Admin APIs

#### GET /api/admin/clients
**Description**: Get all clients (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "clients": [
    {
      "id": "client-id",
      "name": "Client Name",
      "companyName": "Company Name",
      "email": "client@example.com",
      "phone": "+1234567890",
      "address": "Client Address",
      "city": "City",
      "state": "State",
      "country": "India",
      "pincode": "123456",
      "subscriptionPlan": "basic",
      "subscriptionStatus": "active",
      "subscriptionExpiresAt": "2024-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "users": 5,
        "orders": 100
      }
    }
  ]
}
```

#### POST /api/admin/clients
**Description**: Create a new client (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Client Name",
  "companyName": "Company Name",
  "email": "client@example.com",
  "phone": "+1234567890",
  "address": "Client Address",
  "city": "City",
  "state": "State",
  "country": "India",
  "pincode": "123456",
  "subscriptionPlan": "basic"
}
```

#### GET /api/admin/clients/[id]
**Description**: Get specific client details (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### PUT /api/admin/clients/[id]
**Description**: Update client details (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### DELETE /api/admin/clients/[id]
**Description**: Delete a client (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### GET /api/admin/users
**Description**: Get all users (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### POST /api/admin/users
**Description**: Create a new user (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### GET /api/admin/credits
**Description**: Get all clients with credit balances (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### GET /api/admin/credits/[clientId]
**Description**: Get specific client credits (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### POST /api/admin/credits/[clientId]
**Description**: Add credits to client (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": 1000,
  "description": "Credit addition"
}
```

#### PUT /api/admin/credits/[clientId]
**Description**: Update client credits (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### GET /api/admin/credits/[clientId]/transactions
**Description**: Get client credit transactions (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### GET /api/admin/credits/[clientId]/costs
**Description**: Get client credit costs configuration (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### POST /api/admin/credits/[clientId]/costs
**Description**: Set client credit costs (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### PUT /api/admin/credits/[clientId]/costs
**Description**: Update client credit costs (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### GET /api/admin/system-config
**Description**: Get system configuration (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### POST /api/admin/system-config
**Description**: Create system configuration (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### PUT /api/admin/system-config
**Description**: Update system configuration (Admin only)

**Headers**: `Authorization: Bearer <token>`

#### GET /api/admin/client-configurations
**Description**: Get all client configurations (Admin only)

**Headers**: `Authorization: Bearer <token>`

---

### Utility APIs

#### GET /api/validate-pincode
**Description**: Validate pincode for delivery

**Query Parameters**:
- `pincode`: Pincode to validate

**Response**:
```json
{
  "valid": true,
  "pincode": "123456",
  "city": "City Name",
  "state": "State Name"
}
```

#### POST /api/process-image
**Description**: Process image for OCR or other operations

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "image": "base64-encoded-image",
  "operation": "ocr"
}
```

#### POST /api/process-text
**Description**: Process text for various operations

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "text": "Text to process",
  "operation": "extract_address"
}
```

#### POST /api/format-address
**Description**: Format address data

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "address": "Raw address string"
}
```

#### POST /api/format-address-image
**Description**: Format address from image

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "image": "base64-encoded-image"
}
```

#### POST /api/validate-payment-screenshot
**Description**: Validate payment screenshot

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "image": "base64-encoded-image",
  "expectedAmount": 1000
}
```

#### GET /api/users/profile
**Description**: Get user profile

**Headers**: `Authorization: Bearer <token>`

#### PUT /api/client-settings
**Description**: Update client settings

**Headers**: `Authorization: Bearer <token>`

#### GET /api/order-config
**Description**: Get order configuration for client

**Headers**: `Authorization: Bearer <token>`

#### PUT /api/order-config
**Description**: Update order configuration for client

**Headers**: `Authorization: Bearer <token>`

#### GET /api/dtdc-slips
**Description**: Get DTDC slips

**Headers**: `Authorization: Bearer <token>`

#### PUT /api/dtdc-slips
**Description**: Update DTDC slips

**Headers**: `Authorization: Bearer <token>`

#### GET /api/pwa/manifest
**Description**: Get PWA manifest

**Response**: JSON manifest file

#### GET /api/env-check
**Description**: Check environment configuration

**Response**:
```json
{
  "environment": "development",
  "database": "connected",
  "services": {
    "delhivery": "configured",
    "whatsapp": "configured"
  }
}
```

---

## Error Responses

All APIs return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)",
  "code": "ERROR_CODE (optional)"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `402`: Payment Required (Insufficient Credits)
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

### Common Error Codes
- `INSUFFICIENT_CREDITS`: Client doesn't have enough credits
- `INVALID_TOKEN`: JWT token is invalid or expired
- `UNAUTHORIZED`: User doesn't have permission
- `VALIDATION_ERROR`: Request validation failed
- `SERVICE_UNAVAILABLE`: External service is down

---

## Rate Limiting
- Standard endpoints: 100 requests per minute per client
- Image processing endpoints: 10 requests per minute per client
- Admin endpoints: 200 requests per minute per admin

## Webhooks
The system supports webhooks for order status updates. Configure webhook URLs in client settings to receive real-time notifications.

## SDKs and Libraries
- JavaScript/Node.js SDK available
- Python SDK available
- PHP SDK available
- cURL examples provided for all endpoints

## Support
For API support and integration assistance, contact the development team or refer to the integration guides.
