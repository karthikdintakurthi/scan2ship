# Tracking Page OTP Authentication

## Overview

The tracking page (`/tracking`) now requires OTP-based authentication to view orders. Users must verify their mobile number via SMS OTP before accessing their order information.

## Implementation Details

### User Flow

1. **Enter Mobile Number**
   - User enters their 10-digit mobile number
   - System validates the format and checks if orders exist for that number
   - Click "Send OTP" button

2. **Receive OTP**
   - System generates a 6-digit OTP
   - OTP is sent via Fast2SMS to the user's mobile number
   - OTP is valid for 6 minutes

3. **Verify OTP**
   - User enters the 6-digit OTP received via SMS
   - System validates the OTP against the stored session
   - Upon successful verification, a verification token is generated (valid for 30 minutes)

4. **View Orders**
   - Orders are automatically fetched and displayed after OTP verification
   - User can view orders from all merchants associated with their mobile number

### API Endpoints

#### 1. Send OTP
**Endpoint:** `POST /api/tracking/send-otp`

**Request:**
```json
{
  "mobile": "9948550555"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-session-id",
  "message": "OTP sent to 9948550555",
  "hasOrders": true
}
```

#### 2. Verify OTP
**Endpoint:** `POST /api/tracking/verify-otp`

**Request:**
```json
{
  "sessionId": "uuid-session-id",
  "otp": "123456",
  "mobile": "9948550555"
}
```

**Response:**
```json
{
  "success": true,
  "verificationToken": "uuid-verification-token",
  "message": "OTP verified successfully"
}
```

#### 3. Fetch Orders (Requires Verification Token)
**Endpoint:** `POST /api/tracking`

**Request:**
```json
{
  "mobile": "9948550555",
  "verificationToken": "uuid-verification-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mobile": "9948550555",
    "totalOrders": 5,
    "ordersByClient": [...]
  }
}
```

### Fast2SMS Integration

The system uses Fast2SMS for sending OTP messages. It supports both DLT SMS (recommended for India) and Quick SMS routes.

#### Configuration

Add these environment variables to `.env.local`:

```bash
# Fast2SMS API Key (Required)
FAST2SMS_API_KEY="your_fast2sms_api_key_here"

# DLT SMS Configuration (Recommended for India)
FAST2SMS_DLT_SENDER_ID="JKSHUB"  # Short sender ID code
FAST2SMS_DLT_TEMPLATE_ID="208015"  # Template ID from DLT Manager
FAST2SMS_DLT_ENTITY_ID=""  # Optional - usually embedded in template
```

#### DLT Template Format

The DLT template should be registered in Fast2SMS DLT Manager with the format:
```
Your OTP for tracking your orders is {#VAR#} - JUNIOR KIDS HUB
```

Where `{#VAR#}` is the variable placeholder that will be replaced with the OTP value.

#### API Request Format

For DLT SMS, the request format is:
```json
{
  "route": "dlt",
  "sender_id": "JKSHUB",
  "message": "208015",
  "variables_values": "123456",
  "numbers": "9948550555",
  "flash": 0
}
```

If DLT configuration is not available, the system automatically falls back to Quick SMS route.

### Security Features

1. **OTP Expiration**: OTPs expire after 6 minutes
2. **Verification Token**: Valid for 30 minutes after OTP verification
3. **Mobile Number Validation**: Ensures 10-digit Indian mobile numbers
4. **Session Management**: OTP sessions are stored in-memory (consider Redis for production)
5. **Automatic Cleanup**: Expired sessions are automatically cleaned up

### Files Modified/Created

1. **Frontend:**
   - `src/app/tracking/page.tsx` - Updated UI with OTP flow

2. **Backend:**
   - `src/app/api/tracking/send-otp/route.ts` - Send OTP endpoint
   - `src/app/api/tracking/verify-otp/route.ts` - Verify OTP endpoint
   - `src/app/api/tracking/route.ts` - Updated to require verification token

3. **Libraries:**
   - `src/lib/fast2sms.ts` - Fast2SMS service utility
   - `src/lib/otp-store.ts` - Shared OTP session store

### Environment Variables

Required environment variables:

```bash
# Fast2SMS Configuration
FAST2SMS_API_KEY="your_fast2sms_api_key"

# DLT Configuration (Optional - falls back to Quick SMS if not set)
FAST2SMS_DLT_SENDER_ID="JKSHUB"
FAST2SMS_DLT_TEMPLATE_ID="208015"
FAST2SMS_DLT_ENTITY_ID=""  # Optional
```

### Setup Instructions

1. **Get Fast2SMS API Key**
   - Sign up at https://www.fast2sms.com
   - Get your API key from the dashboard

2. **Register DLT Template (Recommended)**
   - Go to https://www.fast2sms.com/dlt-manager
   - Register your sender ID (e.g., "JKSHUB")
   - Create/approve template: "Your OTP for tracking your orders is {#VAR#} - JUNIOR KIDS HUB"
   - Get the Template ID (e.g., "208015")

3. **Configure Environment Variables**
   - Copy values to `.env.local`
   - Restart the development server

4. **Test the Flow**
   - Visit `/tracking` page
   - Enter a mobile number with existing orders
   - Complete the OTP verification flow

### Production Considerations

1. **Use Redis for OTP Storage**: Replace in-memory Map with Redis for better scalability
2. **Rate Limiting**: Implement rate limiting for OTP requests to prevent abuse
3. **Monitoring**: Add monitoring for OTP send success rates
4. **Error Handling**: Implement retry logic for failed SMS sends
5. **Analytics**: Track OTP verification success/failure rates

### Troubleshooting

#### OTP Not Received
- Check Fast2SMS API key is correct
- Verify DLT template is approved (if using DLT)
- Check Fast2SMS account balance
- Review server logs for SMS sending errors

#### "Invalid or expired session" Error
- OTP may have expired (6 minutes)
- Request a new OTP
- Check server logs for session details

#### "Invalid or expired verification token" Error
- Verification token expired (30 minutes)
- Re-verify mobile number with new OTP
- Check server logs for token verification details

### References

- Fast2SMS API Documentation: https://docs.fast2sms.com/reference/authorization
- Fast2SMS DLT SMS API: https://docs.fast2sms.com/reference/new-endpoint-2
- Fast2SMS DLT Manager: https://www.fast2sms.com/dlt-manager
