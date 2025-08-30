# Enhanced Credit Transaction System

## Overview

The enhanced credit transaction system now captures comprehensive information about each credit recharge, including client details, UTR numbers, and screenshot uploads. This provides complete audit trails and payment verification capabilities.

## Database Schema Enhancement

### Credit Transactions Table

The `credit_transactions` table has been enhanced with additional fields:

```sql
model credit_transactions {
  id                    String   @id
  clientId              String
  clientName            String   // Store client name for easy reference
  userId                String?
  type                  String   // "ADD", "DEDUCT", "RESET"
  amount                Int
  balance               Int      // Balance after transaction
  description           String
  feature               String?  // "ORDER", "WHATSAPP", "IMAGE_PROCESSING", "TEXT_PROCESSING", "MANUAL"
  orderId               Int?     // Reference to order if applicable
  utrNumber             String?  // UTR number for payment tracking
  screenshotFileName    String?  // Name of uploaded screenshot file
  screenshotFileSize    Int?     // Size of screenshot file in bytes
  screenshotFileType    String?  // MIME type of screenshot file
  createdAt             DateTime @default(now())
  clients               clients  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  users                 users?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  orders                Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
}
```

## API Endpoint Enhancement

### `/api/credits/verify-payment`

The API endpoint now handles both JSON and FormData requests with enhanced data capture.

#### Request Format

**JSON Request:**
```json
{
  "transactionRef": "RECHARGE-123456789",
  "amount": 1000,
  "utrNumber": "UTR123456789",
  "paymentDetails": {
    "payeeVpa": "scan2ship@ybl",
    "payeeName": "Scan2Ship",
    "transactionNote": "Credit Recharge - Client Name"
  }
}
```

**FormData Request (with screenshot):**
```javascript
const formData = new FormData();
formData.append('transactionRef', 'RECHARGE-123456789');
formData.append('amount', '1000');
formData.append('utrNumber', 'UTR123456789');
formData.append('screenshot', file); // File object
formData.append('paymentDetails', JSON.stringify({
  payeeVpa: 'scan2ship@ybl',
  payeeName: 'Scan2Ship',
  transactionNote: 'Credit Recharge - Client Name'
}));
```

#### Response Format

```json
{
  "success": true,
  "message": "Payment verified and credits added successfully",
  "transactionRef": "RECHARGE-123456789",
  "amount": 1000,
  "newBalance": 1500,
  "clientDetails": {
    "clientId": "client-123",
    "clientName": "Client Company Name"
  },
  "confirmationReceived": {
    "utrNumber": "UTR123456789",
    "screenshot": {
      "fileName": "payment-screenshot.png",
      "fileSize": 245760,
      "fileType": "image/png"
    }
  }
}
```

## Data Storage Strategy

### Current Implementation (Without Migration)

Since the database migration requires environment setup, the current implementation stores all enhanced information in the existing `description` field:

```
"Credit recharge via UPI - RECHARGE-123456789 | UTR: UTR123456789 | Screenshot: payment-screenshot.png (245760 bytes) | Client: Client Company Name"
```

### Future Implementation (With Migration)

Once the database migration is applied, the data will be stored in dedicated fields:

- `clientName`: Direct client name storage
- `utrNumber`: Dedicated UTR number field
- `screenshotFileName`: Screenshot file name
- `screenshotFileSize`: File size in bytes
- `screenshotFileType`: MIME type

## Enhanced Logging

The API now provides comprehensive logging for each transaction:

```javascript
console.log('✅ [API_CREDITS_VERIFY_PAYMENT] Payment verified and credits added:', {
  clientId: client.id,
  clientName: client.companyName,
  transactionRef,
  amount: creditAmount,
  newBalance: result.newBalance,
  utrNumber: utrNumber || 'Not provided',
  screenshotReceived: !!screenshot,
  screenshotDetails: screenshot ? {
    fileName: screenshot.name,
    fileSize: screenshot.size,
    fileType: screenshot.type
  } : null
});
```

## User Interface Flow

### 3-Step Recharge Process

1. **Amount Selection**
   - User selects recharge amount (₹1000, ₹2000, ₹5000, ₹10000)
   - QR code is generated immediately

2. **Payment**
   - User scans QR code with UPI app
   - Completes payment in UPI app
   - Clicks "I Have Made Payment"

3. **Confirmation**
   - User enters UTR number (optional)
   - User uploads payment screenshot (optional)
   - At least one field must be provided
   - Submits confirmation

### Form Validation

- **UTR Number**: Optional text input
- **Screenshot**: Optional file upload
  - File type validation: Images only (PNG, JPG, JPEG)
  - File size validation: Maximum 5MB
  - Preview and remove functionality

## Security Features

### File Upload Security

- **File Type Validation**: Only image files allowed
- **File Size Limits**: Maximum 5MB per file
- **Content Type Checking**: Server-side validation
- **Virus Scanning**: Ready for implementation

### Data Validation

- **UTR Number**: Optional but validated if provided
- **Transaction Reference**: Unique per transaction
- **Amount Validation**: Positive integer values only
- **Client Authentication**: Required for all operations

## Error Handling

### Common Error Scenarios

1. **File Upload Errors**
   - Invalid file type
   - File too large
   - Upload failure

2. **Validation Errors**
   - Missing required fields
   - Invalid UTR format
   - Duplicate transaction reference

3. **Database Errors**
   - Foreign key constraint violations
   - Connection issues
   - Transaction rollback

### Error Response Format

```json
{
  "error": "Error message description",
  "details": "Additional error details if available"
}
```

## Testing

### Test Scripts

1. **Basic API Test**: `scripts/test-credit-api.js`
   - Tests JSON endpoint functionality
   - Verifies foreign key constraint fixes

2. **Enhanced API Test**: `scripts/test-enhanced-credit-api.js`
   - Tests both JSON and FormData endpoints
   - Verifies all enhanced features

### Manual Testing

1. **Complete Flow Test**
   - Select amount → Generate QR → Scan → Complete payment → Enter UTR → Upload screenshot → Submit

2. **Edge Cases**
   - No UTR, no screenshot
   - Large file upload
   - Invalid file types
   - Network interruptions

## Future Enhancements

### Planned Features

1. **File Storage Integration**
   - Cloud storage (AWS S3, Google Cloud Storage)
   - Local file system backup
   - CDN integration for fast access

2. **Advanced Analytics**
   - Payment success rates
   - Popular recharge amounts
   - Client payment patterns

3. **Automated Verification**
   - UTR number validation
   - Screenshot OCR for amount extraction
   - Payment confirmation automation

4. **Admin Dashboard**
   - Transaction history view
   - Payment verification interface
   - Bulk operations support

## Migration Guide

### Database Migration

```bash
# Apply the enhanced schema
npx prisma migrate dev --name enhance_credit_transactions

# Generate updated Prisma client
npx prisma generate
```

### Code Updates Required

1. **Update CreditService**: Add new fields to transaction creation
2. **Update API Response**: Include new field data
3. **Update Frontend**: Display new information
4. **Update Logging**: Enhanced transaction logging

## Monitoring and Maintenance

### Key Metrics

- Transaction success rate
- File upload success rate
- Average processing time
- Error rates by type

### Maintenance Tasks

- Regular log rotation
- File cleanup (old screenshots)
- Database optimization
- Performance monitoring

## Support and Troubleshooting

### Common Issues

1. **Foreign Key Constraint Errors**
   - Solution: Ensure user exists in users table
   - Workaround: Pass undefined for userId

2. **File Upload Failures**
   - Check file size limits
   - Verify file type restrictions
   - Monitor disk space

3. **Database Connection Issues**
   - Check DATABASE_URL configuration
   - Verify network connectivity
   - Monitor connection pool

### Debug Information

Enable debug logging by setting:
```bash
DEBUG=app:credits,app:api
LOG_LEVEL=debug
```

This will provide detailed information about:
- API request/response details
- Database operations
- File upload processing
- Error stack traces
