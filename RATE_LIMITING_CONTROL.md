# Rate Limiting Control for Testing

## Overview
Rate limiting has been disabled for testing purposes to allow unlimited API requests during development and integration testing.

## Current Status
✅ **Rate limiting is DISABLED** for testing

## How It Works

### Automatic Disable Conditions
Rate limiting is automatically disabled when:
1. `NODE_ENV` is set to `development` or `test`
2. `DISABLE_RATE_LIMIT` environment variable is set to `true`

### Environment Variables
```bash
# Disable rate limiting for testing
DISABLE_RATE_LIMIT=true

# Or set NODE_ENV to development
NODE_ENV=development
```

## Testing Results
- ✅ 20 concurrent requests completed successfully
- ✅ 0 rate limited requests
- ✅ 0 errors
- ✅ Average response time: ~65ms per request

## Rate Limiting Configuration

### When Enabled (Production)
```javascript
const rateLimitConfig = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },    // 5 requests per 15 minutes
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100 },   // 100 requests per 15 minutes
  upload: { windowMs: 15 * 60 * 1000, maxRequests: 10 }  // 10 requests per 15 minutes
};
```

### When Disabled (Testing)
- No request limits
- No time windows
- Unlimited concurrent requests
- Perfect for integration testing

## Re-enabling Rate Limiting

### For Production
1. Set `NODE_ENV=production`
2. Remove or set `DISABLE_RATE_LIMIT=false`
3. Deploy to production

### For Testing with Rate Limits
1. Set `NODE_ENV=production`
2. Set `DISABLE_RATE_LIMIT=false`
3. Test with rate limits enabled

## Testing Scripts

### Test Rate Limiting Disabled
```bash
node test-rate-limit-disabled.js
```

### Test Full API Integration
```bash
node test-scan2ship-api.js
```

## Security Considerations

### Development/Testing
- Rate limiting disabled for easier testing
- CORS still enabled for security
- Security headers still applied
- Authentication still required

### Production
- Rate limiting enabled by default
- All security measures active
- Proper request throttling
- DDoS protection

## Monitoring

### Console Logs
When rate limiting is disabled, you'll see:
```
🚫 [RATE_LIMIT] Rate limiting disabled for testing/development
```

### Response Headers
Rate limiting status is not exposed in response headers when disabled.

## Troubleshooting

### Rate Limiting Still Active
1. Check `NODE_ENV` environment variable
2. Check `DISABLE_RATE_LIMIT` environment variable
3. Restart the application
4. Check console logs for rate limiting messages

### Performance Issues
- Rate limiting is disabled, so performance should be optimal
- If you experience issues, check:
  - Network connectivity
  - API server performance
  - Database connection limits

## Best Practices

### During Testing
- Use unlimited requests for integration testing
- Test with realistic data volumes
- Monitor API performance
- Test error handling scenarios

### Before Production
- Re-enable rate limiting
- Test with rate limits enabled
- Verify proper error responses
- Monitor rate limit effectiveness

## Current Configuration

```bash
# .env.local
DISABLE_RATE_LIMIT=true
NODE_ENV=development
```

This configuration ensures rate limiting is disabled for all testing scenarios while maintaining other security measures.
