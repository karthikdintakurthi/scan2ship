# Shopify Integration Guide

## Overview

This guide explains how to build a Shopify integration app that connects to your Scan2Ship logistics platform hosted on Vercel. Merchants will be able to automatically sync orders from their Shopify store to Scan2Ship for shipping management.

## Architecture

### 1. **API Key Management System**

Your Scan2Ship app now supports API key-based authentication for external integrations:

- **API Keys**: Generated per client with specific permissions
- **Permissions**: Granular access control (e.g., `orders:read`, `orders:write`)
- **Security**: HMAC signature validation for webhooks
- **Expiration**: Optional API key expiration dates

### 2. **Shopify OAuth Flow**

Merchants authenticate through Shopify's OAuth 2.0 flow:

1. **Initiate OAuth**: `GET /api/shopify/auth?client_id=CLIENT_ID&shop=STORE.myshopify.com&redirect_uri=REDIRECT_URI`
2. **Shopify Authorization**: Merchant authorizes your app in Shopify
3. **Callback Handling**: `POST /api/shopify/auth/callback` with authorization code
4. **Token Exchange**: Exchange code for access token
5. **Integration Storage**: Store Shopify credentials securely

### 3. **Webhook Integration**

Real-time order synchronization via Shopify webhooks:

- **Order Creation**: `orders/create` webhook
- **Order Updates**: `orders/updated` webhook  
- **Order Payment**: `orders/paid` webhook
- **Order Cancellation**: `orders/cancelled` webhook

## Setup Instructions

### 1. **Environment Configuration**

Add these variables to your `.env.local`:

```env
# Shopify Integration Configuration
SHOPIFY_CLIENT_ID="your_shopify_app_client_id"
SHOPIFY_CLIENT_SECRET="your_shopify_app_client_secret"
SHOPIFY_WEBHOOK_SECRET="your_shopify_webhook_secret"
SHOPIFY_APP_URL="https://your-app.vercel.app"
```

### 2. **Shopify App Setup**

1. **Create Shopify App**:
   - Go to [Shopify Partners](https://partners.shopify.com/)
   - Create a new app
   - Note your Client ID and Client Secret

2. **Configure App URLs**:
   - **App URL**: `https://your-app.vercel.app`
   - **Allowed redirection URLs**: `https://your-app.vercel.app/api/shopify/auth/callback`

3. **Set Webhook Endpoints**:
   - **Webhook URL**: `https://your-app.vercel.app/api/shopify/webhooks`
   - **Webhook Secret**: Generate a random secret string

### 3. **Database Migration**

The integration requires new database tables. Run:

```bash
npx prisma migrate dev --name add_shopify_integration_tables
```

## API Endpoints

### **API Key Management**

#### Create API Key
```http
POST /api/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Shopify Integration",
  "permissions": ["orders:read", "orders:write"],
  "expiresInDays": 365
}
```

#### List API Keys
```http
GET /api/api-keys
Authorization: Bearer <jwt_token>
```

#### Update API Key
```http
PUT /api/api-keys/{id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "permissions": ["orders:read"],
  "isActive": true
}
```

### **Shopify Authentication**

#### Initiate OAuth
```http
GET /api/shopify/auth?client_id=CLIENT_ID&shop=STORE.myshopify.com&redirect_uri=REDIRECT_URI
```

#### Handle OAuth Callback
```http
POST /api/shopify/auth/callback
Content-Type: application/json

{
  "code": "authorization_code",
  "state": "state_parameter",
  "shop": "store.myshopify.com"
}
```

### **External API (API Key Authentication)**

#### Create Order
```http
POST /api/external/orders
Authorization: Bearer <api_key>
Content-Type: application/json

{
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
  "reference_number": "SHOPIFY-ORDER-1001"
}
```

#### Get Orders
```http
GET /api/external/orders?page=1&limit=10&search=query
Authorization: Bearer <api_key>
```

## Integration Flow

### **For Merchants (Shopify Store Owners)**

1. **Install App**: Merchant installs your app from Shopify App Store
2. **OAuth Authorization**: Merchant authorizes your app to access their store
3. **API Key Generation**: Your app generates an API key for the merchant
4. **Automatic Sync**: Orders automatically sync from Shopify to Scan2Ship
5. **Shipping Management**: Merchant manages shipping through Scan2Ship dashboard

### **For Developers (Building the Integration)**

1. **Create Shopify App**: Set up app in Shopify Partners dashboard
2. **Implement OAuth Flow**: Handle authentication and token exchange
3. **Set Up Webhooks**: Configure webhook endpoints for real-time sync
4. **API Integration**: Use Scan2Ship's external API with API keys
5. **Order Processing**: Transform Shopify orders to Scan2Ship format

## Webhook Payload Examples

### Order Create Webhook
```json
{
  "id": 1234567890,
  "name": "#1001",
  "email": "customer@example.com",
  "phone": "+1234567890",
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address1": "123 Main St",
    "city": "New York",
    "province": "NY",
    "country": "United States",
    "zip": "10001"
  },
  "line_items": [
    {
      "id": 9876543210,
      "title": "Product Name",
      "quantity": 1,
      "price": "29.99"
    }
  ],
  "total_price": "29.99",
  "currency": "USD",
  "financial_status": "pending"
}
```

## Security Considerations

1. **API Key Security**: Store API keys securely, never log them
2. **Webhook Validation**: Always verify Shopify webhook signatures
3. **HTTPS Only**: All communication must use HTTPS
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Data Encryption**: Encrypt sensitive data in database

## Error Handling

### Common Error Responses

```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```

```json
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

```json
{
  "error": "Insufficient credits",
  "code": "INSUFFICIENT_CREDITS"
}
```

## Testing

### Test API Key Authentication
```bash
curl -X GET "https://your-app.vercel.app/api/external/orders" \
  -H "Authorization: Bearer sk_your_api_key_here"
```

### Test Order Creation
```bash
curl -X POST "https://your-app.vercel.app/api/external/orders" \
  -H "Authorization: Bearer sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "mobile": "9876543210",
    "address": "Test Address",
    "city": "Test City",
    "state": "Test State",
    "country": "India",
    "pincode": "123456",
    "courier_service": "DELHIVERY",
    "pickup_location": "Test Location",
    "package_value": 100.00,
    "weight": 1.0,
    "total_items": 1
  }'
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Shopify app created and configured
- [ ] Webhook endpoints tested
- [ ] API key generation working
- [ ] Order sync functionality verified
- [ ] Error handling implemented
- [ ] Security measures in place

## Support

For integration support:
- Check API documentation: `/api-docs`
- Review error logs in Vercel dashboard
- Test with Shopify's webhook testing tools
- Contact development team for assistance

---

**Note**: This integration requires active Scan2Ship credits for order creation. Ensure merchants have sufficient credits before processing orders.
