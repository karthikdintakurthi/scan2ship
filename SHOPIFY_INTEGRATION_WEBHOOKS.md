# Shopify Integration with Webhooks

## Overview

The Scan2Ship system now supports seamless integration with Shopify through webhooks. When a Shopify order is created, the system can automatically create a corresponding Scan2Ship order and trigger webhook notifications to external systems.

## Architecture

```
Shopify Store → Shopify Webhook → Scan2Ship → Auto-Create Order → Trigger Webhooks → External Systems
```

## Features

- **Automatic Order Creation**: Convert Shopify orders to Scan2Ship orders automatically
- **Webhook Notifications**: Send webhook notifications when orders are created
- **Configurable**: Enable/disable auto-creation per client
- **Error Handling**: Comprehensive error handling and logging
- **Data Mapping**: Intelligent mapping of Shopify order data to Scan2Ship format

## Setup Process

### 1. Shopify App Installation

1. **OAuth Flow**: Use the existing Shopify OAuth integration
   ```
   GET /api/shopify/auth?client_id={clientId}&shop={shop.myshopify.com}&redirect_uri={redirectUri}
   ```

2. **Callback Handling**: The system handles the OAuth callback and stores the access token

### 2. Webhook Configuration

1. **Set Webhook Secret**: Configure webhook secret for signature validation
   ```bash
   curl -X PUT http://localhost:3000/api/shopify/config \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"webhookSecret": "your-webhook-secret"}'
   ```

2. **Enable Auto-Creation**: Enable automatic order creation
   ```bash
   curl -X PUT http://localhost:3000/api/shopify/config \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"autoCreateOrders": true}'
   ```

### 3. Shopify Webhook Setup

In your Shopify admin, configure webhooks to point to:
```
https://your-domain.com/api/shopify/webhooks
```

Required webhook topics:
- `orders/create` - When orders are created
- `orders/updated` - When orders are updated
- `orders/paid` - When orders are paid
- `orders/cancelled` - When orders are cancelled

## API Endpoints

### Shopify Configuration

#### GET /api/shopify/config
Get current Shopify configuration for the client.

**Response:**
```json
{
  "success": true,
  "config": {
    "integration": {
      "id": "integration-id",
      "shopDomain": "mystore.myshopify.com",
      "syncStatus": "active",
      "lastSyncAt": "2024-01-01T00:00:00.000Z",
      "isActive": true
    },
    "autoCreateOrders": true,
    "webhookSecret": "***configured***"
  }
}
```

#### PUT /api/shopify/config
Update Shopify configuration.

**Request Body:**
```json
{
  "autoCreateOrders": true,
  "webhookSecret": "your-webhook-secret"
}
```

### Webhook Management

Use the existing webhook management APIs to configure external webhook endpoints:

- `GET /api/webhooks` - List webhooks
- `POST /api/webhooks` - Create webhook
- `PUT /api/webhooks/[id]` - Update webhook
- `DELETE /api/webhooks/[id]` - Delete webhook

## Data Mapping

### Shopify Order → Scan2Ship Order

| Shopify Field | Scan2Ship Field | Notes |
|---------------|-----------------|-------|
| `shipping_address.first_name + last_name` | `name` | Customer name |
| `shipping_address.phone` | `mobile` | Customer phone |
| `shipping_address.address1 + address2 + company` | `address` | Full address |
| `shipping_address.city` | `city` | City |
| `shipping_address.province` | `state` | State/Province |
| `shipping_address.country` | `country` | Country |
| `shipping_address.zip` | `pincode` | Postal code |
| `total_price` | `package_value` | Order value |
| `line_items` (calculated) | `weight` | Total weight in grams |
| `line_items` (calculated) | `total_items` | Total quantity |
| `payment_gateway_names` | `is_cod` | COD detection |
| `name` | `reference_number` | Order reference |

### Default Values

- **Courier Service**: Uses client's default courier service
- **Pickup Location**: Uses client's first pickup location
- **Minimum Weight**: 100g if not specified
- **Product Description**: Generated from line items

## Webhook Payload

When a Shopify order creates a Scan2Ship order, webhooks receive:

```json
{
  "event": "order.created",
  "data": {
    "order": {
      "id": 123,
      "orderNumber": "ORDER-123",
      "referenceNumber": "SHOP-456789",
      "name": "John Doe",
      "mobile": "9876543210",
      "address": "123 Main St, Apt 4B, Company Name",
      "city": "New York",
      "state": "NY",
      "country": "United States",
      "pincode": "10001",
      "courierService": "Delhivery",
      "pickupLocation": "Default Location",
      "packageValue": 99.99,
      "weight": 500,
      "totalItems": 2,
      "isCod": false,
      "productDescription": "T-Shirt (Qty: 1), Jeans (Qty: 1)",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "client": {
      "id": "client-id"
    },
    "source": "shopify",
    "shopifyOrder": {
      "id": 456789,
      "name": "#1001",
      "shopifyOrderId": "456789"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "orderId": 123
}
```

## Error Handling

### Common Issues

1. **Missing Shipping Address**: Order creation fails if no shipping address
2. **Invalid Client Configuration**: Missing pickup locations or courier services
3. **Webhook Signature Mismatch**: Invalid webhook secret
4. **Database Errors**: Transaction failures

### Error Logging

All errors are logged with:
- Error message
- Client ID
- Shopify order ID
- Timestamp
- Stack trace

### Status Tracking

Shopify orders have status tracking:
- `pending` - Order received, processing
- `synced` - Successfully created Scan2Ship order
- `error` - Failed to create Scan2Ship order

## Security

### Webhook Signature Validation

All Shopify webhooks are validated using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const hash = hmac.digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(hash, 'base64')
  );
}
```

### Client Isolation

- Each client can only access their own Shopify integrations
- Webhook configurations are client-specific
- Order data is isolated by client ID

## Testing

### Test Webhook Endpoint

1. **Create Test Webhook**:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Webhook",
       "url": "https://webhook.site/your-unique-url",
       "events": ["order.created"]
     }'
   ```

2. **Enable Auto-Creation**:
   ```bash
   curl -X PUT http://localhost:3000/api/shopify/config \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"autoCreateOrders": true}'
   ```

3. **Create Test Order in Shopify**: The webhook should trigger automatically

### Local Testing

Use tools like ngrok to expose your local server:

```bash
ngrok http 3000
# Use the ngrok URL for Shopify webhook configuration
```

## Monitoring

### Webhook Logs

Monitor webhook delivery via:
```
GET /api/webhooks/[id]/logs
```

### Order Status

Check Shopify order sync status:
```sql
SELECT 
  so.shopifyOrderId,
  so.shopifyOrderName,
  so.status,
  so.errorMessage,
  o.id as scan2shipOrderId
FROM shopify_orders so
LEFT JOIN orders o ON so.scan2shipOrderId = o.id
WHERE so.clientId = 'your-client-id'
ORDER BY so.createdAt DESC;
```

## Best Practices

### Configuration

1. **Enable Auto-Creation**: Only for clients who want automatic processing
2. **Set Webhook Secret**: Always use webhook signature validation
3. **Configure Defaults**: Ensure pickup locations and courier services are set
4. **Monitor Logs**: Regularly check webhook delivery logs

### Error Handling

1. **Graceful Degradation**: System continues working even if auto-creation fails
2. **Retry Logic**: Failed webhooks are automatically retried
3. **Manual Processing**: Failed orders can be processed manually
4. **Alerting**: Set up alerts for critical errors

### Performance

1. **Async Processing**: Webhook processing doesn't block Shopify responses
2. **Batch Processing**: Consider batching for high-volume stores
3. **Rate Limiting**: Respect Shopify's webhook rate limits
4. **Database Indexing**: Ensure proper indexes for fast lookups

## Troubleshooting

### Common Issues

1. **Webhook Not Triggering**:
   - Check webhook URL configuration
   - Verify webhook secret
   - Check Shopify webhook logs

2. **Order Creation Failing**:
   - Verify client configuration
   - Check pickup locations
   - Verify courier services

3. **Webhook Delivery Failing**:
   - Check webhook endpoint availability
   - Verify webhook signature validation
   - Check rate limiting

### Debug Commands

```bash
# Check webhook configuration
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/shopify/config

# Check webhook logs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/webhooks/WEBHOOK_ID/logs

# Test webhook endpoint
curl -X POST https://your-webhook-endpoint.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Support

For Shopify integration issues:
1. Check the logs for error messages
2. Verify webhook configuration
3. Test webhook endpoints independently
4. Contact support with specific error details
