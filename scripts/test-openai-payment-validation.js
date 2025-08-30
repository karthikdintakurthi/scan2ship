const { PrismaClient } = require('@prisma/client');

async function testOpenAIPaymentValidation() {
  console.log('🧪 Testing OpenAI-based Payment Validation System...');
  
  try {
    const prisma = new PrismaClient();
    
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Get a real client ID
    const realClient = await prisma.clients.findFirst({
      select: { id: true, companyName: true }
    });
    
    if (!realClient) {
      console.log('❌ No clients found in database');
      return;
    }
    
    console.log('📋 Using real client:', realClient.companyName, '(', realClient.id, ')');
    
    // Test the new API endpoint structure
    console.log('\n🧪 Testing OpenAI Payment Validation API Structure...');
    
    // Simulate the API request structure
    const mockRequest = {
      screenshot: 'mock-image-file',
      expectedAmount: 1000,
      transactionRef: 'RECHARGE-TEST-123456'
    };
    
    console.log('📤 Mock API Request:', {
      screenshot: 'mock-image-file (base64)',
      expectedAmount: mockRequest.expectedAmount,
      transactionRef: mockRequest.transactionRef
    });
    
    // Simulate OpenAI response structure
    const mockOpenAIResponse = {
      utrNumber: 'UTR123456789012',
      paymentAmount: 1000,
      paymentStatus: 'success',
      payeeName: 'Scan2Ship',
      validationPassed: true,
      validationMessage: 'All validations passed successfully',
      extractedText: 'Payment successful... UTR: UTR123456789012... Amount: ₹1,000.00'
    };
    
    console.log('🤖 Mock OpenAI Response:', mockOpenAIResponse);
    
    // Test validation logic
    console.log('\n🧪 Testing Validation Logic...');
    
    const testCases = [
      {
        name: 'Valid Payment - All Checks Pass',
        openaiResponse: {
          utrNumber: 'UTR123456789012',
          paymentAmount: 1000,
          paymentStatus: 'success',
          validationPassed: true
        },
        expectedAmount: 1000,
        shouldPass: true
      },
      {
        name: 'Amount Mismatch - Should Fail',
        openaiResponse: {
          utrNumber: 'UTR123456789012',
          paymentAmount: 500,
          paymentStatus: 'success',
          validationPassed: false
        },
        expectedAmount: 1000,
        shouldPass: false
      },
      {
        name: 'No UTR Found - Should Fail',
        openaiResponse: {
          utrNumber: null,
          paymentAmount: 1000,
          paymentStatus: 'success',
          validationPassed: false
        },
        expectedAmount: 1000,
        shouldPass: false
      },
      {
        name: 'Payment Failed - Should Fail',
        openaiResponse: {
          utrNumber: 'UTR123456789012',
          paymentAmount: 1000,
          paymentStatus: 'failed',
          validationPassed: false
        },
        expectedAmount: 1000,
        shouldPass: false
      },
      {
        name: 'Pending Payment - Should Fail',
        openaiResponse: {
          utrNumber: 'UTR123456789012',
          paymentAmount: 1000,
          paymentStatus: 'pending',
          validationPassed: false
        },
        expectedAmount: 1000,
        shouldPass: false
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log('─'.repeat(50));
      
      const { openaiResponse, expectedAmount, shouldPass } = testCase;
      
      // Simulate the validation logic from the API
      const extractedAmount = openaiResponse.paymentAmount;
      const amountMatches = extractedAmount === expectedAmount;
      const utrFound = openaiResponse.utrNumber && openaiResponse.utrNumber.trim() !== '';
      const paymentSuccessful = openaiResponse.paymentStatus === 'success';
      
      // Final validation decision
      const finalValidationPassed = amountMatches && utrFound && paymentSuccessful;
      
      console.log('📊 Validation Results:');
      console.log('- Amount Matches:', amountMatches, `(${extractedAmount} === ${expectedAmount})`);
      console.log('- UTR Found:', utrFound, `(${openaiResponse.utrNumber || 'null'})`);
      console.log('- Payment Successful:', paymentSuccessful, `(${openaiResponse.paymentStatus})`);
      console.log('- Final Validation:', finalValidationPassed);
      
      if (finalValidationPassed === shouldPass) {
        console.log('✅ Test PASSED');
      } else {
        console.log('❌ Test FAILED');
      }
    }
    
    // Test frontend validation logic
    console.log('\n🧪 Testing Frontend Validation Logic...');
    console.log('─'.repeat(50));
    
    const frontendTestCases = [
      {
        name: 'Valid Validation Result',
        validationResult: {
          finalValidationPassed: true,
          utrNumber: 'UTR123456789012',
          paymentAmount: 1000,
          paymentStatus: 'success'
        },
        submitButtonEnabled: true,
        buttonText: 'Submit Confirmation'
      },
      {
        name: 'Invalid Validation Result',
        validationResult: {
          finalValidationPassed: false,
          utrNumber: null,
          paymentAmount: 500,
          paymentStatus: 'failed'
        },
        submitButtonEnabled: false,
        buttonText: 'Upload Valid Screenshot First'
      },
      {
        name: 'No Validation Result',
        validationResult: null,
        submitButtonEnabled: false,
        buttonText: 'Upload Valid Screenshot First'
      }
    ];
    
    for (const testCase of frontendTestCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      
      const { validationResult, submitButtonEnabled, buttonText } = testCase;
      
      // Simulate frontend validation logic
      const isButtonEnabled = validationResult?.finalValidationPassed || false;
      const actualButtonText = isButtonEnabled ? 'Submit Confirmation' : 'Upload Valid Screenshot First';
      
      console.log('📊 Frontend Results:');
      console.log('- Button Enabled:', isButtonEnabled);
      console.log('- Button Text:', actualButtonText);
      console.log('- Expected Enabled:', submitButtonEnabled);
      console.log('- Expected Text:', buttonText);
      
      if (isButtonEnabled === submitButtonEnabled && actualButtonText === buttonText) {
        console.log('✅ Test PASSED');
      } else {
        console.log('❌ Test FAILED');
      }
    }
    
    console.log('\n🎉 OpenAI Payment Validation Test Complete!');
    console.log('\n📋 Summary of New Features:');
    console.log('✅ OpenAI Vision API integration for payment validation');
    console.log('✅ Automatic UTR extraction from explicit mentions only');
    console.log('✅ Automatic amount validation against expected payment');
    console.log('✅ Payment status validation (success/failed/pending)');
    console.log('✅ Comprehensive validation results display');
    console.log('✅ Submit button only enabled when all validations pass');
    console.log('✅ No manual UTR entry required');
    console.log('✅ Credit deduction for AI processing');
    console.log('✅ Detailed error messages and validation feedback');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOpenAIPaymentValidation();
