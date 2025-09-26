# Cross-App Integration Setup Guide

This guide will help you set up the cross-app integration between Scan2Ship and Catalog App with API key-based authentication.

## 🚀 Quick Start

### Step 1: Start Both Applications

**Terminal 1 - Scan2Ship:**
```bash
cd /Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship
PORT=3000 npm run dev
```

**Terminal 2 - Catalog App:**
```bash
cd /Users/karthiknaidudintakurthi/Documents/GitHub/catalog-app
PORT=3001 npm run dev
```

### Step 2: Access Admin Interfaces

**Scan2Ship Admin:**
- URL: http://localhost:3000/admin
- Login: karthik@scan2ship.in
- Password: admin123

**Catalog App Admin:**
- URL: http://localhost:3001/admin
- Login: karthik@scan2ship.in
- Password: admin123

## 🔧 Setup Process

### 1. Create API Keys in Catalog App

1. Go to http://localhost:3001/admin/api-keys
2. Click "Create API Key"
3. Fill in the form:
   - **Key Name**: "Scan2Ship Integration Key"
   - **Client**: Select your client
   - **Permissions**: Select required permissions
   - **Expiration**: Optional
4. Click "Create API Key"
5. **Copy the generated API key** (you'll need this for the next step)

### 2. Create Cross-App Mapping in Scan2Ship

1. Go to http://localhost:3000/admin/cross-app-mappings
2. Click "Create Mapping"
3. Fill in the form:
   - **Scan2Ship Client**: Select your Scan2Ship client
   - **Catalog Client ID**: Enter the client ID from Catalog App
   - **Catalog API Key**: Paste the API key from step 1
4. Click "Create Mapping"

### 3. Test the Integration

1. Go to http://localhost:3000/admin/cross-app-mappings
2. Click "Test" on your mapping
3. Verify the connection is successful

## 📋 API Endpoints

### Scan2Ship Endpoints

**Catalog Integration API:**
```
POST http://localhost:3000/api/catalog
Authorization: Bearer [scan2ship-jwt-token]
Content-Type: application/json

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

**Available Actions:**
- `reduce_inventory` - Reduce inventory for an order
- `check_inventory` - Check inventory availability
- `search_products` - Search products
- `get_product` - Get product by SKU

### Catalog App Endpoints

**Inventory Check:**
```
POST http://localhost:3001/api/public/inventory/check?client=your-client-slug
X-API-Key: [catalog-api-key]
X-Client-ID: [catalog-client-id]
Content-Type: application/json

{
  "items": [
    {
      "sku": "VFJ-08916",
      "quantity": 1
    }
  ]
}
```

**Inventory Reduce:**
```
POST http://localhost:3001/api/public/inventory/reduce?client=your-client-slug
X-API-Key: [catalog-api-key]
X-Client-ID: [catalog-client-id]
Content-Type: application/json

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

## 🔐 Authentication Flow

1. **Scan2Ship User** makes a request to `/api/catalog`
2. **Scan2Ship** authenticates the user with JWT
3. **Scan2Ship** looks up the cross-app mapping for the user's client
4. **Scan2Ship** makes a request to **Catalog App** using the stored API key
5. **Catalog App** validates the API key and processes the request
6. **Catalog App** returns the response to **Scan2Ship**
7. **Scan2Ship** returns the response to the user

## 🛠️ Troubleshooting

### Common Issues

**1. "Authentication required" error**
- Ensure you're using a valid Scan2Ship JWT token
- Check that the user has the correct permissions

**2. "API key validation failed" error**
- Verify the API key is correct and active
- Check that the client ID matches the API key's client

**3. "Client not found" error**
- Ensure the client exists in both applications
- Verify the client is active

**4. "Cross-app mapping not found" error**
- Create a cross-app mapping in Scan2Ship admin
- Ensure the mapping is active

### Debug Steps

1. **Check API Key Status:**
   - Go to Catalog App admin → API Keys
   - Verify the key is active and not expired

2. **Check Cross-App Mapping:**
   - Go to Scan2Ship admin → Cross-App Mappings
   - Verify the mapping exists and is active

3. **Test Individual APIs:**
   - Test Catalog App API directly with the API key
   - Test Scan2Ship API with a valid JWT token

4. **Check Logs:**
   - Monitor both applications' console logs
   - Look for error messages and debug information

## 📊 Monitoring

### Scan2Ship Admin Dashboard
- **API Keys**: Manage Scan2Ship API keys
- **Cross-App Mappings**: View and manage integrations
- **Clients**: Manage client accounts

### Catalog App Admin Dashboard
- **API Keys**: Manage Catalog App API keys
- **Clients**: Manage client accounts
- **Inventory**: View inventory status

## 🔒 Security Features

- **API Key Authentication**: Secure key-based authentication
- **Client Validation**: API keys can only access their client's data
- **Permission Scoping**: Granular permissions for API keys
- **Audit Logging**: All API calls are logged
- **Rate Limiting**: Configurable rate limiting per API key

## 📚 Additional Resources

- **API Documentation**: See individual API endpoint documentation
- **Error Codes**: Reference for common error codes and solutions
- **Best Practices**: Guidelines for secure integration setup

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the application logs
3. Verify all configuration steps were completed
4. Test individual components separately

For additional help, refer to the application documentation or contact the development team.
