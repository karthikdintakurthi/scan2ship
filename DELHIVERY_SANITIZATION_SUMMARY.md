# Delhivery Data Sanitization Implementation

## Summary
Implemented comprehensive data sanitization for all Delhivery API calls to prevent errors caused by special characters in customer addresses and other fields.

## Problem
Delhivery API was throwing errors when order data contained special characters, specifically:
- `&` (ampersand)
- `/` (forward slash)
- Other problematic characters like quotes, brackets, etc.

## Solution
Enhanced the `sanitizeText()` function in `src/lib/delhivery.ts` to automatically clean all text fields before sending to Delhivery API.

## Changes Made

### File Modified: `src/lib/delhivery.ts`

#### Enhanced Sanitization Function
The `sanitizeText()` function now handles the following special characters:

1. **Newlines and tabs** → Replaced with spaces
2. **Semicolons** → Replaced with spaces
3. **Ampersand (&)** → Replaced with "and"
4. **Forward/backslash (/ \\)** → Replaced with spaces
5. **Angle brackets (< >)** → Removed
6. **Quotes (' ")** → Removed
7. **Pipe (|)** → Replaced with space
8. **Braces and brackets ({} [])** → Removed
9. **Special symbols (` ~ ! @ # $ % ^ * ( ) + =)** → Removed
10. **Multiple spaces** → Collapsed to single space
11. **Leading/trailing whitespace** → Trimmed

#### Logging Enhancement
Added logging to show when data is sanitized:
```typescript
if (original !== sanitized && fieldName) {
  console.log(`🧹 [DELHIVERY_SANITIZE] Field "${fieldName}" sanitized:`);
  console.log(`  Original: "${original}"`);
  console.log(`  Sanitized: "${sanitized}"`);
}
```

#### Fields Sanitized
The sanitization is applied to all text fields sent to Delhivery:
- Customer name
- Address
- City, State, Country
- Pincode
- Phone/Mobile numbers
- Reference number
- Product description
- HSN code
- Seller name and address
- Invoice number
- Seller phone
- Return address and pincode

## Examples

### Before Sanitization
```
Address: "Shop No. 5/6 & 7, Main Street"
Name: "John & Jane Enterprises"
Product: "Books & Stationery (Set of 3)"
```

### After Sanitization
```
Address: "Shop No. 5 6 and 7, Main Street"
Name: "John and Jane Enterprises"
Product: "Books and Stationery Set of 3"
```

## Benefits

1. **Error Prevention**: Eliminates Delhivery API errors caused by special characters
2. **Automatic**: No manual intervention required - works for all order creation and retry flows
3. **Transparent**: Logs all sanitization for debugging and audit purposes
4. **Comprehensive**: Covers all text fields sent to Delhivery API
5. **Consistent**: Uses same sanitization logic everywhere (order creation and retry)

## Affected API Routes

The sanitization automatically applies to these routes:
- `/api/orders` (POST) - New order creation
- `/api/orders/[id]/retry-delhivery` (POST) - Order retry

## Testing

Verified sanitization with comprehensive test cases including:
- Addresses with forward slashes (123/456)
- Names with ampersands (John & Jane)
- Special characters in various combinations
- Newlines, tabs, and multiple spaces

All tests passed successfully ✅

## Future Considerations

- The same sanitization approach can be applied to other courier service integrations if needed
- Sanitization rules can be easily adjusted if Delhivery changes their requirements
- Consider creating a shared sanitization utility if other courier services need similar data cleaning

## Notes

- The sanitization is conservative - it's better to remove problematic characters than risk API errors
- Ampersands are replaced with "and" to maintain meaning (e.g., "John & Jane" → "John and Jane")
- Slashes are replaced with spaces to preserve address structure (e.g., "123/456" → "123 456")
- All changes preserve the original data in the database; only the API payload is sanitized

