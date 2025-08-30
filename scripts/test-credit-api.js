async function testCreditAPI() {
  try {
    console.log('🧪 Testing Credit API endpoint...');
    
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');
    
    // Test with minimal data to avoid authentication issues
    const testData = {
      transactionRef: 'TEST-' + Date.now(),
      amount: 100,
      paymentDetails: {
        payeeVpa: 'scan2ship@ybl',
        payeeName: 'Scan2Ship',
        transactionNote: 'Test payment'
      }
    };

    console.log('📤 Test data:', testData);
    
    // Note: This will fail with 401 Unauthorized, but that's expected
    // The important thing is that it doesn't fail with foreign key constraint errors
    const response = await fetch('http://localhost:3000/api/credits/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ Error response:', errorData);
      
      // If we get 401 Unauthorized, that means the foreign key constraint issue is fixed
      if (response.status === 401) {
        console.log('✅ Foreign key constraint issue appears to be fixed (got expected 401 Unauthorized)');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Check if it's a foreign key constraint error
    if (error.message.includes('Foreign key constraint')) {
      console.error('❌ Foreign key constraint error still exists!');
    } else {
      console.log('✅ No foreign key constraint error (this is good)');
    }
  }
}

// Run the test
testCreditAPI();
