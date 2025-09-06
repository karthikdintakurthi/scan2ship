# Webhook System Documentation

## Overview

The Scan2Ship webhook system allows clients to receive real-time notifications when orders are created, updated, or other events occur in the system. This enables seamless integration with external systems and automated workflows.

## Features

- **Event-driven notifications**: Receive notifications for specific events
- **Secure webhooks**: HMAC signature validation for security
- **Retry mechanism**: Automatic retry for failed webhook deliveries
- **Comprehensive logging**: Track all webhook attempts and responses
- **Client isolation**: Each client can only manage their own webhooks
- **Flexible configuration**: Custom headers, timeouts, and retry counts

## Supported Events

### Order Events
- `order.created` - Triggered when a new order is created
- `order.updated` - Triggered when an order is updated (future)
- `order.cancelled` - Triggered when an order is cancelled (future)

### Wildcard Events
- `*` - Receive all events (use with caution)

## API Endpoints

### Webhook Management

#### GET /api/webhooks
List all webhooks for the authenticated client.

**Response:**
```json
{
  "success": true,
  "webhooks": [
    {
      "id": "webhook-id",
      "name": "My Webhook",
      "url": "https://example.com/webhook",
      "events": ["order.created"],
      "isActive": true,
      "retryCount": 3,
      "timeout": 30000,
      "headers": {}
    }
  ]
}
```

#### POST /api/webhooks
Create a new webhook.

**Request Body:**
```json
{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "events": ["order.created"],
  "secret": "optional-secret-for-signature-validation",
  "isActive": true,
  "retryCount": 3,
  "timeout": 30000,
  "headers": {
    "Authorization": "Bearer your-token"
  }
}
```

#### GET /api/webhooks/[id]
Get a specific webhook by ID.

#### PUT /api/webhooks/[id]
Update a webhook configuration.

#### DELETE /api/webhooks/[id]
Delete a webhook.

### Webhook Logs

#### GET /api/webhooks/[id]/logs
Get webhook delivery logs for a specific webhook.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 50)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-id",
      "eventType": "order.created",
      "orderId": 123,
      "status": "success",
      "responseCode": 200,
      "responseBody": "OK",
      "errorMessage": null,
      "attemptCount": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/webhooks/retry/[logId]
Retry a failed webhook delivery.

## Webhook Payload Format

### Order Created Event

```json
{
  "event": "order.created",
  "data": {
    "order": {
      "id": 123,
      "orderNumber": "ORDER-123",
      "referenceNumber": "REF-1234567890",
      "trackingId": "TRACK123",
      "name": "Customer Name",
      "mobile": "9876543210",
      "address": "Customer Address",
      "city": "City",
      "state": "State",
      "country": "India",
      "pincode": "123456",
      "courierService": "Delhivery",
      "pickupLocation": "Pickup Location",
      "packageValue": 1000,
      "weight": 500,
      "totalItems": 1,
      "isCod": false,
      "codAmount": null,
      "resellerName": null,
      "resellerMobile": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "delhiveryWaybillNumber": "WB123456",
      "delhiveryOrderId": "DO123456",
      "delhiveryApiStatus": "success"
    },
    "client": {
      "id": "client-id",
      "companyName": "Client Company",
      "name": "Client Name",
      "email": "client@example.com"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "orderId": 123
}
```

## Security

### HMAC Signature Validation

If a webhook has a secret configured, the system will include an HMAC-SHA256 signature in the `X-Webhook-Signature` header:

```
X-Webhook-Signature: sha256=<signature>
```

To validate the signature:

```javascript
const crypto = require('crypto');

function validateWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

## Configuration Options

### Webhook Settings

- **name**: Human-readable name for the webhook
- **url**: Target URL to receive webhook notifications
- **events**: Array of events to subscribe to
- **secret**: Optional secret for signature validation
- **isActive**: Whether the webhook is active
- **retryCount**: Number of retry attempts (default: 3)
- **timeout**: Request timeout in milliseconds (default: 30000)
- **headers**: Custom headers to include with webhook requests

### Retry Behavior

- Failed webhooks are automatically retried up to the configured retry count
- Retries are performed with exponential backoff
- All attempts are logged for debugging

## Error Handling

### HTTP Status Codes

- **200**: Webhook delivered successfully
- **4xx**: Client error (webhook endpoint issue)
- **5xx**: Server error (webhook endpoint issue)
- **Timeout**: Request exceeded timeout limit

### Error Logging

All webhook attempts are logged with:
- Event type
- Order ID (if applicable)
- HTTP status code
- Response body
- Error message
- Attempt count
- Timestamp

## Best Practices

### Webhook Endpoint Implementation

1. **Idempotency**: Handle duplicate webhook deliveries gracefully
2. **Quick Response**: Return HTTP 200 quickly, process asynchronously
3. **Signature Validation**: Always validate HMAC signatures for security
4. **Error Handling**: Return appropriate HTTP status codes
5. **Logging**: Log webhook receipts for debugging

### Example Webhook Endpoint

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Validate signature
  if (signature && !validateWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Received webhook:', req.body);
  
  // Return success quickly
  res.status(200).send('OK');
});

function validateWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

## Testing

### Test Webhook Endpoint

Use services like [webhook.site](https://webhook.site) to test webhook deliveries:

1. Create a webhook endpoint
2. Configure the webhook in Scan2Ship
3. Create a test order
4. Verify the webhook is received

### Local Testing

```bash
# Start the development server
npm run dev

# Test webhook creation
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-url",
    "events": ["order.created"]
  }'
```

## Troubleshooting

### Common Issues

1. **Webhook not triggering**: Check if webhook is active and events are configured correctly
2. **Signature validation failing**: Verify secret is configured correctly on both ends
3. **Timeout errors**: Increase timeout value or optimize webhook endpoint
4. **Retry failures**: Check webhook endpoint logs for errors

### Debugging

1. Check webhook logs via API: `GET /api/webhooks/[id]/logs`
2. Verify webhook configuration: `GET /api/webhooks/[id]`
3. Test webhook endpoint independently
4. Check Scan2Ship server logs for webhook delivery attempts

## Rate Limiting

Webhook deliveries are subject to the same rate limiting as other API endpoints. Consider implementing rate limiting in your webhook endpoints to handle high-volume scenarios.

## Support

For webhook-related issues or questions, please contact the Scan2Ship support team or refer to the main API documentation.
