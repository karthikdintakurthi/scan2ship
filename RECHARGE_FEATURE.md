# Credit Recharge Feature

## Overview

The Credit Recharge feature allows client users to add credits to their account using UPI payments. This feature provides a seamless payment experience with QR code generation and mobile deep linking support.

## Features

### 1. Amount Selection
- Predefined recharge amounts: ₹1,000, ₹2,000, ₹5,000, ₹10,000
- Each rupee equals 1 credit
- Easy-to-use grid layout for amount selection

### 2. Instant Payment Generation
- **Automatic QR Generation**: QR code appears immediately after amount selection
- **Pre-filled UPI ID**: `scan2ship@ybl` (Official Scan2Ship account)
- **Pre-filled Payee Name**: Scan2Ship
- **No manual input required**: Streamlined user experience
- **Automatic transaction reference generation**
- **Pre-filled transaction note** with client company name

### 3. UPI Payment Integration
- Generates valid UPI payment links in the format:
  ```
  upi://pay?pa={payeeVpa}&pn={payeeName}&am={amount}&cu=INR&tn={transactionNote}
  ```
- **Proper parameter encoding** using URLSearchParams for reliable QR codes
- **Transaction note included** for better payment tracking
- QR code generation with high error correction for easy scanning
- Mobile deep linking for direct UPI app opening

### 4. Payment Verification
- Backend API for payment verification
- Duplicate transaction prevention
- Automatic credit addition to client account
- Transaction history tracking

## User Flow

### Step 1: Access Recharge
1. Navigate to the Credits page (`/credits`)
2. Click the "Recharge" button in the Available Credits card

### Step 2: Select Amount & Generate Payment
1. Choose from available recharge amounts (₹1,000 - ₹10,000)
2. Click on the desired amount to automatically generate the payment QR code
3. **Official UPI ID**: `scan2ship@ybl` (pre-filled and locked)

### Step 3: Complete Payment
1. **Desktop Users**: Scan the generated QR code with any UPI app
2. **Mobile Users**: Click "Open UPI App" for direct deep linking
3. Complete the payment in your UPI app
4. Click "Payment Complete" after successful payment

## Technical Implementation

### Frontend Components

#### RechargeModal.tsx
- Main modal component for the recharge flow
- **Streamlined 2-step process**: Amount selection → Payment completion
- **Instant QR generation**: QR code appears immediately after amount selection
- Mobile detection for deep linking
- **Simplified user experience** with no manual input required

#### Credits Page Integration
- Added recharge button to the Available Credits card
- Success message display
- Automatic credit refresh after successful recharge

### Backend API

#### `/api/credits/verify-payment`
- **Method**: POST
- **Authentication**: Required (Bearer token)
- **Purpose**: Verify payment and add credits to client account

**Request Body:**
```json
{
  "transactionRef": "RECHARGE-CLIENTID-TIMESTAMP-RANDOMID",
  "amount": 1000,
  "paymentDetails": {
    "payeeVpa": "scan2ship@ybl",
    "payeeName": "Scan2Ship",
    "transactionNote": "Credit Recharge - Company Name"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and credits added successfully",
  "transactionRef": "RECHARGE-CLIENTID-TIMESTAMP-RANDOMID",
  "amount": 1000,
  "newBalance": 5000
}
```

### Dependencies

#### QR Code Generation
- **Package**: `qrcode` and `@types/qrcode`
- **Usage**: Generates PNG QR codes for UPI payment links
- **Configuration**: 300px width, 2px margin, black/white colors

#### UPI Link Format
The UPI payment links follow the standard UPI deep link format:
```
upi://pay?pa={payeeVpa}&pn={payeeName}&am={amount}&cu=INR&tn={transactionNote}
```

Where:
- `pa`: Payee VPA/UPI ID (e.g., `scan2ship@ybl`)
- `pn`: Payee Name (e.g., `Scan2Ship`)
- `am`: Amount in rupees (e.g., `1000`)
- `cu`: Currency (INR)
- `tn`: Transaction note (e.g., `Credit Recharge`)

**Note**: Using proper URLSearchParams encoding for reliable QR code generation and high error correction level.

## Security Features

### Transaction Reference Generation
- Unique transaction references prevent duplicate processing
- Format: `RECHARGE-{CLIENTID}-{TIMESTAMP}-{RANDOMID}`
- Includes client ID for tracking and verification

### Duplicate Prevention
- Backend checks for existing transactions with same reference
- Prevents double credit addition
- Returns success for already processed payments

### Authentication
- All API calls require valid JWT authentication
- User and client validation on every request
- Secure token-based session management

## Mobile Support

### Deep Linking
- Automatic mobile device detection
- Direct UPI app opening via deep links
- Fallback to QR code scanning for unsupported devices

### Responsive Design
- Mobile-optimized modal interface
- Touch-friendly button sizes
- Responsive grid layout for amount selection

## Error Handling

### Frontend Errors
- Form validation for required fields
- QR code generation error handling
- Network error handling for API calls
- User-friendly error messages

### Backend Errors
- Authentication failure handling
- Invalid transaction reference handling
- Database error handling
- Comprehensive error logging

## Testing

### QR Code Generation Test
Run the test script to verify QR code generation:
```bash
node scripts/test-upi-qr.js
```

This test:
- Generates sample UPI payment links
- Creates QR codes for different amounts
- Validates QR code data URL generation
- Tests all recharge amounts (₹1,000 - ₹10,000)

## Future Enhancements

### Potential Improvements
1. **Payment Gateway Integration**: Add support for other payment methods
2. **Real-time Payment Verification**: Webhook integration with UPI providers
3. **Payment Status Tracking**: Real-time payment status updates
4. **Bulk Recharge Options**: Support for larger credit amounts
5. **Payment History**: Detailed payment transaction history
6. **Email Notifications**: Payment confirmation emails
7. **Invoice Generation**: Automatic invoice generation for payments

### Configuration Options
1. **Custom UPI IDs**: Allow clients to configure their UPI IDs
2. **Payment Limits**: Configurable minimum/maximum recharge amounts
3. **Currency Support**: Multi-currency payment support
4. **Payment Methods**: Support for cards, net banking, etc.

## Usage Instructions for Clients

### For Recipients (UPI ID Owners)
1. **Official UPI ID**: `scan2ship@ybl` is the designated payment recipient
2. Ensure the UPI ID is active and can receive payments
3. Monitor incoming payments in your UPI app
4. Verify payment amounts and transaction references

### For Clients (Credit Rechargers)
1. **No UPI ID needed**: The system automatically uses the official Scan2Ship UPI ID
2. Use the recharge feature in the credits page
3. **Simple 2-step process**: Select amount → Complete payment
4. **Instant QR generation**: No waiting or manual input required
5. Verify payment completion before closing the modal
6. Check your updated credit balance after successful payment

## Support

For technical support or questions about the recharge feature:
1. Check the transaction history for payment status
2. Verify UPI ID and payment details
3. Contact support if payment issues persist
4. Provide transaction reference for faster resolution
