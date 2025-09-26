# Cross-App Integration Guide

This guide explains how to set up and test the API key-based integration between Scan2Ship and Catalog App.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Scan2Ship     │    │   Catalog App   │    │   Database      │
│   (Client A)    │    │   (Client X)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. API Key Auth       │                       │
         ├──────────────────────►│                       │
         │                       │ 2. Validate Key       │
         │                       ├──────────────────────►│
         │                       │                       │
         │ 3. Inventory Call     │                       │
         ├──────────────────────►│                       │
         │                       │ 4. Process Request    │
         │                       ├──────────────────────►│
         │                       │                       │
         │ 5. Return Data        │                       │
         │◄──────────────────────┤                       │
```

## Setup Instructions

### 1. Start Both Applications

**Scan2Ship (Port 3000):**
```bash
cd /Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship
npm run dev
```

**Catalog App (Port 3001):**
```bash
cd /Users/karthiknaidudintakurthi/Documents/GitHub/catalog-app
npm run dev
```

### 2. Database Setup

**Scan2Ship Database:**
- The `cross_app_mappings` table is already created
- No additional setup required

**Catalog App Database:**
- Run migration to create `api_keys` table:
```bash
cd /Users/karthiknaidudintakurthi/Documents/GitHub/catalog-app
npx prisma db push
```

### 3. Create Cross-App Integration

#### Step 1: Create Catalog App Client
1. Go to Catalog App admin panel
2. Create a new client with:
   - Name: "Test Integration Client"
   - Slug: "test-integration-client"
   - Email: "test@integration.com"
   - Plan: "PROFESSIONAL"

#### Step 2: Generate API Key
1. Go to API Keys section in Catalog App admin
2. Create new API key for the client with permissions:
   - `inventory:read`
   - `inventory:write`
   - `products:read`

#### Step 3: Create Cross-App Mapping
1. Go to Scan2Ship admin panel
2. Navigate to Cross-App Mappings
3. Create new mapping:
   - Scan2Ship Client ID: [Your Scan2Ship client ID]
   - Catalog Client ID: [Catalog client ID from step 1]
   - Catalog API Key: [API key from step 2]

## API Endpoints

### Scan2Ship Catalog API

**Endpoint:** `POST /api/catalog`

**Headers:**
```
Authorization: Bearer [scan2ship-jwt-token]
Content-Type: application/json
```

**Actions:**
- `reduce_inventory` - Reduce inventory for an order
- `check_inventory` - Check inventory availability
- `search_products` - Search products
- `get_product` - Get product by SKU

**Example Request:**
```json
{
  "action": "reduce_inventory",
  "data": {
    "items": [
      {
        "sku": "VFJ-08916",
        "quantity": 1
      }
    ],
    "orderId": "ORDER-325"
  }
}
```

### Catalog App Inventory API

**Endpoint:** `POST /api/public/inventory/reduce`

**Headers:**
```
X-API-Key: [catalog-api-key]
X-Client-ID: [catalog-client-id]
Content-Type: application/json
```

**Query Parameters:**
- `client` - Client slug (e.g., `?client=test-integration-client`)

**Example Request:**
```json
{
  "items": [
    {
      "sku": "VFJ-08916",
      "quantity": 1
    }
  ],
  "orderId": "ORDER-325"
}
```

## Testing

### 1. Test API Integration

Run the test script:
```bash
cd /Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship
node test-api-integration.js
```

### 2. Test Cross-App Setup

Run the setup script:
```bash
cd /Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship
node setup-cross-app-integration.js
```

### 3. Manual Testing

**Test 1: Check Inventory**
```bash
curl -X POST 'http://localhost:3001/api/public/inventory/check?client=test-integration-client' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: [your-api-key]' \
  -H 'X-Client-ID: [catalog-client-id]' \
  --data-raw '{"items":[{"sku":"VFJ-08916","quantity":1}]}'
```

**Test 2: Reduce Inventory**
```bash
curl -X POST 'http://localhost:3001/api/public/inventory/reduce?client=test-integration-client' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: [your-api-key]' \
  -H 'X-Client-ID: [catalog-client-id]' \
  --data-raw '{"items":[{"sku":"VFJ-08916","quantity":1}],"orderId":"TEST-ORDER-001"}'
```

**Test 3: Scan2Ship Integration**
```bash
curl -X POST 'http://localhost:3000/api/catalog' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [scan2ship-jwt-token]' \
  --data-raw '{"action":"reduce_inventory","data":{"items":[{"sku":"VFJ-08916","quantity":1}],"orderId":"ORDER-325"}}'
```

## Error Handling

### Common Errors

1. **"Catalog app integration not configured"**
   - Solution: Create cross-app mapping in Scan2Ship admin

2. **"Invalid API key"**
   - Solution: Check API key is correct and active

3. **"Client slug does not match API key client"**
   - Solution: Ensure client slug matches the API key's client

4. **"Client not found or inactive"**
   - Solution: Verify client exists and is active in Catalog App

### Debugging

1. Check Scan2Ship logs for catalog API calls
2. Check Catalog App logs for API key validation
3. Verify cross-app mapping in database
4. Test API keys individually

## Security Features

1. **API Key Authentication**: Secure authentication between apps
2. **Client Validation**: Ensures API keys can only access their client's data
3. **Permission Scoping**: API keys have specific permissions
4. **Audit Logging**: All API calls are logged for security

## Production Deployment

1. **Environment Variables**: Set proper database URLs
2. **API Key Management**: Use secure key generation
3. **Monitoring**: Set up monitoring for API calls
4. **Rate Limiting**: Implement rate limiting for API endpoints

## Troubleshooting

### Database Connection Issues
- Check DATABASE_URL environment variables
- Ensure databases are running and accessible
- Verify Prisma schema is up to date

### API Key Issues
- Verify API key is active and not expired
- Check client is active in both apps
- Ensure permissions are correctly set

### Cross-App Mapping Issues
- Verify mapping exists in Scan2Ship database
- Check client IDs match between apps
- Ensure API key is correct

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify all setup steps are completed
3. Test individual components separately
4. Check database connectivity and permissions
