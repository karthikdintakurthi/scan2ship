# CORS Configuration Fixes

## Issue
The QA environment origin `https://qa.scan2ship.in/` was not included in the allowed origins list, causing CORS errors when making requests from the QA environment.

## Changes Made

### 1. Updated Security Middleware (`src/lib/security-middleware.ts`)
- Added `https://qa.scan2ship.in` to the default allowed origins list
- Enhanced CORS logic to handle production vs development environments
- Improved security by restricting wildcard CORS in production

### 2. Updated Upload Route (`src/app/api/upload/route.ts`)
- Fixed OPTIONS method to use consistent CORS configuration
- Removed hardcoded wildcard CORS header
- Added proper origin validation for file uploads

### 3. Updated Environment Template (`env-template.env`)
- Added QA environment to `ALLOWED_ORIGINS` configuration
- Provided clear examples for production deployment

### 4. Added CORS Testing Script (`scripts/test-cors.js`)
- Created comprehensive CORS testing utility
- Tests multiple origins including QA environment
- Validates security by testing malicious origins

## CORS Configuration

### Allowed Origins
- `http://localhost:3000` (Development)
- `http://localhost:3001` (Development)
- `https://qa.scan2ship.in` (QA Environment)
- `https://yourdomain.com` (Production - replace with actual domain)

### Environment Variables
```bash
# Add to your .env file
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,https://qa.scan2ship.in,https://yourdomain.com"
```

## Testing

### Run CORS Tests
```bash
npm run test:cors
```

### Manual Testing
1. Start your local development server
2. Make a request from `https://qa.scan2ship.in` to your API endpoints
3. Check that CORS headers are properly set
4. Verify that malicious origins are blocked

## Security Features

### Production Environment
- Requires origin headers for all requests
- Defaults to QA environment for requests without origin
- Blocks unauthorized origins

### Development Environment
- Allows requests without origin headers
- Permits localhost origins
- More permissive for development convenience

### File Uploads
- Consistent CORS handling across all endpoints
- Proper preflight request handling
- Secure origin validation

## Verification

After deploying these changes:

1. **QA Environment**: Should now work without CORS errors
2. **Production**: Maintains security while allowing legitimate origins
3. **Development**: Continues to work as expected
4. **Security**: Malicious origins are properly blocked

## Next Steps

1. Deploy the updated code to your QA environment
2. Test API endpoints from `https://qa.scan2ship.in`
3. Verify CORS headers are properly set
4. Update production environment variables when deploying to production
5. Run CORS tests to validate configuration

## Troubleshooting

If CORS issues persist:

1. Check that environment variables are properly set
2. Verify the server has been restarted after changes
3. Check browser console for specific CORS error messages
4. Use the CORS testing script to diagnose issues
5. Ensure all API endpoints are using the security middleware
