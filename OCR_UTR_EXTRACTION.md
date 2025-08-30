# OCR-Based UTR Extraction System

## Overview

The enhanced credit transaction system now includes Optical Character Recognition (OCR) technology to automatically extract UTR (Unique Transaction Reference) numbers from payment screenshots. This eliminates the need for manual UTR entry and provides a seamless user experience.

## Key Features

### 🔍 **Automatic UTR Extraction**
- **OCR Technology**: Uses Tesseract.js for text recognition
- **Multiple Patterns**: Supports various UTR formats and naming conventions
- **Real-time Processing**: Extracts UTR immediately after image upload
- **No Image Storage**: Images are processed for OCR but not stored

### 📱 **User Experience**
- **Dual Input Methods**: Manual entry OR screenshot upload
- **Instant Feedback**: Shows extracted UTR number immediately
- **Fallback Support**: Manual entry if OCR fails
- **Visual Indicators**: Clear success/error states

## Technical Implementation

### OCR Library
```javascript
import { createWorker } from 'tesseract.js';
```

### UTR Extraction Patterns
The system uses multiple regex patterns to identify UTR numbers:

```javascript
const utrPatterns = [
  /UTR[:\s]*([A-Z0-9]{10,16})/i,                    // UTR: 123456789012
  /Transaction[:\s]*ID[:\s]*([A-Z0-9]{10,16})/i,    // Transaction ID: 123456789012
  /Reference[:\s]*([A-Z0-9]{10,16})/i,              // Reference: 123456789012
  /([A-Z0-9]{10,16})/                               // Generic 10-16 char alphanumeric
];
```

### Processing Flow

1. **Image Upload**: User selects payment screenshot
2. **File Validation**: Checks file type and size
3. **OCR Processing**: Converts image to text using Tesseract.js
4. **Pattern Matching**: Searches for UTR patterns in extracted text
5. **UTR Extraction**: Returns first matching UTR number
6. **User Feedback**: Displays extracted UTR or error message

## User Interface

### Screenshot Upload Section
```jsx
{/* Screenshot Upload for UTR Extraction */}
<div>
  <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-2">
    Upload Payment Screenshot to Extract UTR (Optional)
  </label>
  <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-blue-400 transition-colors">
    <input
      type="file"
      id="screenshot"
      accept="image/*"
      onChange={handleFileChange}
      className="hidden"
      disabled={isLoading}
    />
    <label htmlFor="screenshot" className={`cursor-pointer ${isLoading ? 'opacity-50' : ''}`}>
      <div className="space-y-2">
        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-600">
          {isLoading ? 'Extracting UTR from image...' : 'Click to upload payment screenshot'}
        </p>
        <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</p>
        <p className="text-xs text-blue-600 font-medium">OCR will automatically extract UTR number</p>
      </div>
    </label>
  </div>
  {confirmationDetails.utrNumber && (
    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
      <p className="text-sm text-green-800">
        <span className="font-medium">✅ UTR Extracted:</span> {confirmationDetails.utrNumber}
      </p>
    </div>
  )}
</div>
```

### Success State
When UTR is successfully extracted:
- Green success box appears
- Extracted UTR number is displayed
- User can proceed with submission

### Error Handling
- **OCR Failure**: Shows error message, allows manual entry
- **No UTR Found**: Informs user to enter manually
- **File Issues**: Validates file type and size

## API Integration

### Frontend to Backend
```javascript
// Only UTR number is sent to API, no image data
const response = await fetch('/api/credits/verify-payment', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    transactionRef: paymentDetails.transactionRef,
    amount: paymentDetails.amount,
    utrNumber: confirmationDetails.utrNumber.trim(), // Extracted UTR
    paymentDetails: {
      payeeVpa: paymentDetails.payeeVpa,
      payeeName: paymentDetails.payeeName,
      transactionNote: paymentDetails.transactionNote
    }
  })
});
```

### Database Storage
```sql
-- Only UTR number is stored, no image data
description: "Credit recharge via UPI - RECHARGE-123456789 | UTR: UTR123456789012 | Client: Client Company Name"
```

## Supported UTR Formats

### Common Patterns
1. **Standard UTR**: `UTR123456789012`
2. **With Colon**: `UTR: 123456789012`
3. **With Space**: `UTR 123456789012`
4. **Transaction ID**: `Transaction ID: 123456789012`
5. **Reference**: `Reference: 123456789012`
6. **Generic**: Any 10-16 character alphanumeric string

### Example Screenshots
The OCR can extract UTR from various payment app screenshots:
- Google Pay
- PhonePe
- Paytm
- BHIM
- Bank apps
- Any payment confirmation screen

## Performance Considerations

### Processing Time
- **Small Images**: 1-3 seconds
- **Large Images**: 3-5 seconds
- **Loading States**: User feedback during processing

### File Size Limits
- **Maximum Size**: 5MB
- **Supported Formats**: PNG, JPG, JPEG
- **Optimization**: Automatic compression not needed (OCR handles various sizes)

### Memory Usage
- **Temporary Processing**: Images are processed in memory but not stored
- **Worker Cleanup**: OCR workers are properly terminated after use
- **No Persistent Storage**: Images are discarded after UTR extraction

## Error Scenarios

### OCR Processing Errors
```javascript
catch (error) {
  console.error('❌ Error extracting UTR from image:', error);
  setError('Failed to extract UTR from image. Please enter it manually.');
  return null;
}
```

### Pattern Matching Failures
- **No UTR Found**: User prompted to enter manually
- **Multiple Matches**: First match is used
- **Invalid Format**: Generic pattern as fallback

### File Validation Errors
- **Invalid Type**: Only image files allowed
- **Size Exceeded**: Maximum 5MB limit
- **Corrupted File**: Error message displayed

## Testing

### Test Script
```bash
node scripts/test-ocr-utr.js
```

### Test Coverage
- ✅ OCR library installation
- ✅ UTR pattern matching
- ✅ Text extraction simulation
- ✅ Error handling
- ✅ Case conversion

### Manual Testing
1. **Upload Screenshot**: Test with actual payment screenshots
2. **Verify Extraction**: Confirm UTR is correctly extracted
3. **Error Scenarios**: Test with invalid files
4. **Fallback**: Test manual entry when OCR fails

## Security Features

### File Validation
- **Type Checking**: Only image files accepted
- **Size Limits**: Prevents large file uploads
- **Content Validation**: Server-side verification

### Data Privacy
- **No Image Storage**: Images are processed but not saved
- **Temporary Processing**: Images exist only in memory during OCR
- **Secure Transmission**: HTTPS for all uploads

## Future Enhancements

### Planned Improvements
1. **Enhanced OCR Accuracy**
   - Better text recognition for low-quality images
   - Support for more languages
   - Improved pattern matching

2. **Advanced Features**
   - Amount extraction from screenshots
   - Date/time extraction
   - Payment status detection

3. **Performance Optimization**
   - Faster OCR processing
   - Image preprocessing
   - Caching mechanisms

### Integration Possibilities
- **Cloud OCR**: Google Vision API, AWS Textract
- **AI Enhancement**: Machine learning for better accuracy
- **Batch Processing**: Multiple image processing

## Troubleshooting

### Common Issues

1. **OCR Not Working**
   - Check Tesseract.js installation
   - Verify image quality
   - Check browser console for errors

2. **UTR Not Extracted**
   - Verify image contains clear text
   - Check UTR format matches patterns
   - Try manual entry as fallback

3. **Performance Issues**
   - Reduce image size
   - Check file format
   - Monitor memory usage

### Debug Information
```javascript
// Enable debug logging
console.log('📝 Extracted text:', text);
console.log('🔍 Pattern matches:', matches);
console.log('✅ UTR extracted:', extractedUTR);
```

## Best Practices

### For Users
- **Clear Screenshots**: Ensure text is readable
- **Good Lighting**: Avoid blurry or dark images
- **Complete Screenshot**: Include UTR number in image
- **Fallback Option**: Use manual entry if needed

### For Developers
- **Error Handling**: Always provide fallback options
- **User Feedback**: Clear loading and success states
- **Performance**: Optimize for mobile devices
- **Testing**: Test with various image qualities

## Conclusion

The OCR-based UTR extraction system provides a seamless user experience by automatically extracting UTR numbers from payment screenshots. This eliminates manual entry errors and speeds up the payment confirmation process while maintaining security and privacy by not storing sensitive image data.
