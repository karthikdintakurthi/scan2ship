# Catalog App Integration Guide

This guide explains how to integrate scan2ship with catalog-app for seamless product catalog and inventory synchronization.

## Overview

The integration allows scan2ship to:
- Connect to catalog-app for product search and selection
- Automatically sync inventory when orders are created/updated/deleted
- Display detailed product information in order details
- Maintain real-time inventory accuracy across both systems

## Features

### 1. Catalog Authentication
- Secure JWT-based authentication with catalog-app
- Persistent login sessions
- Role-based access control

### 2. Product Search & Selection
- Real-time product search by SKU or name
- Product availability checking
- Stock level validation
- Product details display (images, descriptions, pricing)

### 3. Inventory Synchronization
- Automatic inventory reduction on order creation
- Inventory restoration on order cancellation/updates
- Real-time stock level checking
- Low stock alerts

### 4. Enhanced Order Management
- Product details in order forms
- Visual product selection interface
- Order totals calculation with product pricing
- Order history with product information

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env.local` file:

```env
# Catalog App Integration Configuration
CATALOG_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CATALOG_APP_URL="http://localhost:3000"
```

### 2. Database Schema Updates

The integration uses the existing `client_config` table to store catalog authentication tokens. No additional database changes are required.

### 3. Component Integration

The following components have been added:

- `CatalogAuth` - Handles catalog app authentication
- `ProductSearch` - Product search and selection interface
- `EnhancedOrderForm` - Order creation with product integration
- `EnhancedOrderDetails` - Order details with product information

## Usage Guide

### 1. Connecting to Catalog App

1. Navigate to the "Enhanced Orders" page
2. In the "Catalog Integration" section, enter your catalog app credentials
3. Click "Connect to Catalog"
4. Once connected, you'll see a green confirmation message

### 2. Creating Orders with Products

1. After connecting to catalog app, use the "Product Selection" section
2. Search for products by SKU or name
3. Select products from the search results
4. Adjust quantities as needed
5. Fill in customer and shipping information
6. Create the order - inventory will be automatically reduced

### 3. Viewing Order Details

1. Navigate to order details page
2. View complete product information including:
   - Product images
   - Descriptions
   - Pricing
   - Stock levels
   - Category information

### 4. Managing Inventory

- **Order Creation**: Inventory is automatically reduced
- **Order Cancellation**: Use "Restore Inventory" button to restore stock
- **Order Updates**: Inventory is adjusted based on quantity changes

## API Endpoints

### Catalog Integration API (`/api/catalog`)

#### POST `/api/catalog`
Handles all catalog-related operations:

```json
{
  "action": "authenticate|search_products|get_product|check_inventory|reduce_inventory|restore_inventory",
  "data": {
    // Action-specific data
  }
}
```

#### Actions:

1. **authenticate**
   ```json
   {
     "action": "authenticate",
     "data": {
       "email": "user@example.com",
       "password": "password"
     }
   }
   ```

2. **search_products**
   ```json
   {
     "action": "search_products",
     "data": {
       "query": "product name or SKU",
       "page": 1,
       "limit": 20
     }
   }
   ```

3. **get_product**
   ```json
   {
     "action": "get_product",
     "data": {
       "sku": "PRODUCT-SKU"
     }
   }
   ```

4. **check_inventory**
   ```json
   {
     "action": "check_inventory",
     "data": {
       "items": [
         {
           "sku": "PRODUCT-SKU",
           "quantity": 2
         }
       ]
     }
   }
   ```

5. **reduce_inventory**
   ```json
   {
     "action": "reduce_inventory",
     "data": {
       "items": [
         {
           "sku": "PRODUCT-SKU",
           "quantity": 2
         }
       ]
     }
   }
   ```

6. **restore_inventory**
   ```json
   {
     "action": "restore_inventory",
     "data": {
       "items": [
         {
           "sku": "PRODUCT-SKU",
           "quantity": 2
         }
       ]
     }
   }
   ```

## Data Flow

### Order Creation Flow

1. User connects to catalog app
2. User searches and selects products
3. User fills order form with customer details
4. System validates inventory availability
5. Order is created in scan2ship
6. Inventory is reduced in catalog-app
7. Order confirmation is displayed

### Order Update Flow

1. User modifies order quantities
2. System calculates inventory difference
3. Order is updated in scan2ship
4. Inventory is adjusted in catalog-app
5. Updated order is displayed

### Order Cancellation Flow

1. User cancels order
2. System identifies products to restore
3. Order is cancelled in scan2ship
4. Inventory is restored in catalog-app
5. Cancellation confirmation is displayed

## Error Handling

The integration includes comprehensive error handling:

- **Authentication Errors**: Clear messages for login failures
- **Product Search Errors**: Graceful handling of search failures
- **Inventory Errors**: Validation of stock availability
- **Network Errors**: Retry mechanisms and fallback options

## Security Considerations

1. **JWT Tokens**: Securely stored and transmitted
2. **API Keys**: Protected through environment variables
3. **Client Isolation**: Each client can only access their own products
4. **Rate Limiting**: Prevents abuse of catalog app APIs
5. **Input Validation**: All inputs are validated and sanitized

## Troubleshooting

### Common Issues

1. **"Not authenticated with catalog app"**
   - Solution: Re-authenticate using the catalog integration section

2. **"Product not found"**
   - Solution: Verify SKU exists in catalog app and client has access

3. **"Insufficient stock"**
   - Solution: Check stock levels in catalog app or reduce quantity

4. **"Failed to reduce inventory"**
   - Solution: Check catalog app connectivity and client permissions

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL="debug"
```

## Performance Optimization

1. **Debounced Search**: Product search is debounced to reduce API calls
2. **Caching**: Authentication tokens are cached locally
3. **Pagination**: Large product lists are paginated
4. **Lazy Loading**: Product images are loaded on demand

## Future Enhancements

1. **Bulk Operations**: Support for bulk product imports
2. **Real-time Sync**: WebSocket-based real-time inventory updates
3. **Advanced Search**: Filter by category, price range, etc.
4. **Product Recommendations**: AI-powered product suggestions
5. **Multi-catalog Support**: Support for multiple catalog apps

## Support

For technical support or questions about the integration:

1. Check the error messages in the UI
2. Review the browser console for detailed errors
3. Check the server logs for API errors
4. Verify catalog app connectivity and permissions

## Changelog

### Version 1.0.0
- Initial catalog app integration
- Product search and selection
- Inventory synchronization
- Enhanced order forms and details
- JWT-based authentication
- Comprehensive error handling
