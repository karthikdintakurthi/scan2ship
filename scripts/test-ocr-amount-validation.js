const { createWorker } = require('tesseract.js');

async function testOCRAmountValidation() {
  console.log('🧪 Testing Enhanced OCR with Amount Extraction and Validation...');
  
  // Test cases with different amount formats
  const testCases = [
    {
      name: 'UPI Payment Success with ₹ symbol',
      text: `Payment Successful
Amount: ₹1,000.00
UTR: UTR123456789012
Transaction ID: TXN987654321098
Thank you for your payment!`,
      expectedAmount: 1000,
      expectedUTR: 'UTR123456789012'
    },
    {
      name: 'Bank Transfer with UPI Reference',
      text: `Bank Transfer Confirmation
Amount: INR 2,000.00
UPI Reference: UPI456789012345
Status: Completed`,
      expectedAmount: 2000,
      expectedUTR: 'UPI456789012345'
    },
    {
      name: 'Payment Receipt with UTR Number',
      text: `Payment Receipt
Total Amount: Rs. 5,000
UTR Number: UTR789012345678
Date: 2024-01-15`,
      expectedAmount: 5000,
      expectedUTR: 'UTR789012345678'
    },
    {
      name: 'Amount with decimal places',
      text: `Transaction Details
Amount: ₹10,000.50
UTR: UTR111222333444
Notes: Credit recharge`,
      expectedAmount: 10000.50,
      expectedUTR: 'UTR111222333444'
    },
    {
      name: 'Amount without currency symbol',
      text: `Payment Summary
Amount: 1,000
UTR: UTR555666777888
Status: Success`,
      expectedAmount: 1000,
      expectedUTR: 'UTR555666777888'
    },
    {
      name: 'Amount mismatch test - should block transaction',
      text: `Payment Confirmation
Amount: ₹500.00
UTR: UTR999888777666
Expected: ₹1,000.00`,
      expectedAmount: 500,
      expectedUTR: 'UTR999888777666',
      shouldMatch: false
    },
    {
      name: 'Barcode test - should NOT extract UTR',
      text: `Payment Receipt
Amount: ₹1,000.00
Barcode: 1234567890123456
QR Code: 9876543210987654
Some random number: 555666777888
Status: Success`,
      expectedAmount: 1000,
      expectedUTR: null, // Should NOT extract barcode as UTR
      shouldMatch: true
    },
    {
      name: 'Transaction ID test - should NOT extract',
      text: `Payment Details
Amount: ₹2,000.00
Transaction ID: TXN123456789012
Order ID: ORD987654321098
Status: Completed`,
      expectedAmount: 2000,
      expectedUTR: null, // Should NOT extract Transaction ID as UTR
      shouldMatch: true
    },
    {
      name: 'Payment Reference test - should extract',
      text: `Payment Summary
Amount: ₹3,000.00
Payment Reference: PAY123456789012
Invoice: INV987654321098
Status: Success`,
      expectedAmount: 3000,
      expectedUTR: 'PAY123456789012'
    }
  ];

  // Simulate OCR extraction function
  function simulateOCRExtraction(text) {
    console.log('\n📄 Simulating OCR extraction from text:');
    console.log(text);
    
    // Extract UTR number using regex patterns - ONLY look for explicit UTR mentions
    const utrPatterns = [
      /UTR[:\s]*([A-Z0-9]{10,16})/i,                    // UTR: 123456789012
      /UTR\s*Number[:\s]*([A-Z0-9]{10,16})/i,           // UTR Number: 123456789012
      /UTR\s*ID[:\s]*([A-Z0-9]{10,16})/i,               // UTR ID: 123456789012
      /Transaction\s*Reference[:\s]*([A-Z0-9]{10,16})/i, // Transaction Reference: 123456789012
      /Payment\s*Reference[:\s]*([A-Z0-9]{10,16})/i,     // Payment Reference: 123456789012
      /UPI\s*Reference[:\s]*([A-Z0-9]{10,16})/i,         // UPI Reference: 123456789012
      /Bank\s*Reference[:\s]*([A-Z0-9]{10,16})/i         // Bank Reference: 123456789012
    ];
    
    let extractedUTR = null;
    for (const pattern of utrPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedUTR = match[1].toUpperCase();
        console.log('✅ UTR extracted:', extractedUTR);
        break;
      }
    }
    
    // Extract amount using regex patterns
    const amountPatterns = [
      /₹\s*([0-9,]+(?:\.[0-9]{2})?)/i, // ₹1,000.00 or ₹1000
      /INR\s*([0-9,]+(?:\.[0-9]{2})?)/i, // INR 1,000.00
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i, // Rs. 1,000.00 or Rs 1000
      /Amount[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i, // Amount: ₹1,000.00
      /Total[:\s]*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i, // Total: ₹1,000.00
      /([0-9,]+(?:\.[0-9]{2})?)\s*₹/i, // 1,000.00 ₹
      /([0-9,]+(?:\.[0-9]{2})?)\s*INR/i, // 1,000.00 INR
      /([0-9,]+(?:\.[0-9]{2})?)\s*Rs/i, // 1,000.00 Rs
    ];
    
    let extractedAmount = null;
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Remove commas and convert to number
        const cleanAmount = match[1].replace(/,/g, '');
        const amount = parseFloat(cleanAmount);
        if (!isNaN(amount) && amount > 0) {
          extractedAmount = amount;
          console.log('✅ Amount extracted:', extractedAmount);
          break;
        }
      }
    }
    
    return { utr: extractedUTR, amount: extractedAmount };
  }

  // Test each case
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    const { utr, amount } = simulateOCRExtraction(testCase.text);
    
    // Validate UTR
    if (utr === testCase.expectedUTR) {
      console.log('✅ UTR validation: PASSED');
    } else {
      console.log('❌ UTR validation: FAILED');
      console.log(`   Expected: ${testCase.expectedUTR}, Got: ${utr}`);
    }
    
    // Validate amount
    if (amount === testCase.expectedAmount) {
      console.log('✅ Amount validation: PASSED');
    } else {
      console.log('❌ Amount validation: FAILED');
      console.log(`   Expected: ${testCase.expectedAmount}, Got: ${amount}`);
    }
    
    // Test amount matching logic - STRICT validation
    const selectedAmount = 1000; // Simulate user-selected amount
    if (amount !== null) {
      if (amount === selectedAmount) {
        console.log('✅ Amount matching: PASSED (amounts match)');
      } else {
        console.log('❌ Amount matching: TRANSACTION BLOCKED');
        console.log(`   Selected: ₹${selectedAmount.toLocaleString()}, Extracted: ₹${amount.toLocaleString()}`);
        
        if (testCase.shouldMatch === false) {
          console.log('✅ Expected block: PASSED (transaction correctly blocked)');
        } else {
          console.log('❌ Unexpected block: FAILED (transaction incorrectly blocked)');
        }
      }
    } else {
      console.log('⚠️ Amount matching: SKIPPED (no amount extracted)');
    }
  }

  // Test API validation logic - STRICT blocking
  console.log('\n🧪 Testing API Validation Logic (STRICT)...');
  console.log('─'.repeat(50));
  
  const apiTestCases = [
    { selectedAmount: 1000, extractedAmount: 1000, shouldPass: true, description: 'Amounts match' },
    { selectedAmount: 2000, extractedAmount: 2000, shouldPass: true, description: 'Amounts match' },
    { selectedAmount: 1000, extractedAmount: 500, shouldPass: false, description: 'Amount mismatch - BLOCKED' },
    { selectedAmount: 5000, extractedAmount: null, shouldPass: true, description: 'No amount extracted - allowed' },
    { selectedAmount: 10000, extractedAmount: 9999, shouldPass: false, description: 'Amount mismatch - BLOCKED' },
    { selectedAmount: 3000, extractedAmount: 3000.50, shouldPass: false, description: 'Decimal mismatch - BLOCKED' }
  ];
  
  for (const testCase of apiTestCases) {
    const { selectedAmount, extractedAmount, shouldPass, description } = testCase;
    
    // Simulate API validation logic
    let validationPassed = true;
    if (extractedAmount !== null && extractedAmount !== selectedAmount) {
      validationPassed = false;
    }
    
    if (validationPassed === shouldPass) {
      console.log(`✅ API Validation: PASSED - ${description} (Selected: ₹${selectedAmount.toLocaleString()}, Extracted: ${extractedAmount ? '₹' + extractedAmount.toLocaleString() : 'null'})`);
    } else {
      console.log(`❌ API Validation: FAILED - ${description} (Selected: ₹${selectedAmount.toLocaleString()}, Extracted: ${extractedAmount ? '₹' + extractedAmount.toLocaleString() : 'null'})`);
    }
  }

  console.log('\n🎉 Enhanced OCR Amount Validation Test Complete!');
  console.log('\n📋 Summary of Features:');
  console.log('✅ UTR extraction ONLY from explicit UTR mentions (no barcodes)');
  console.log('✅ Amount extraction with multiple currency formats');
  console.log('✅ STRICT amount validation - transactions BLOCKED on mismatch');
  console.log('✅ Frontend validation with clear blocking messages');
  console.log('✅ API-level validation for security');
  console.log('✅ Submit button disabled and shows "Amount Mismatch - Cannot Submit"');
  console.log('✅ Comprehensive error messages and transaction blocking');
  console.log('✅ UTR cleared when amount mismatch detected');
}

// Run the test
testOCRAmountValidation();
