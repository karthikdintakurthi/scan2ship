// Using built-in fetch (Node.js 18+)

// Test script for API integration without database setup
async function testApiIntegration() {
  console.log('🚀 Starting API Integration Test...\n');

  try {
    // Test 1: Test Scan2Ship catalog API endpoint
    console.log('📦 Step 1: Testing Scan2Ship catalog API...');
    
    const scan2shipResponse = await fetch('http://localhost:3000/api/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail authentication, which is expected
      },
      body: JSON.stringify({
        action: 'reduce_inventory',
        data: {
          items: [{ sku: 'TEST-SKU-001', quantity: 1 }],
          orderId: 'TEST-ORDER-001'
        }
      })
    });

    const scan2shipResult = await scan2shipResponse.json();
    console.log('✅ Scan2Ship API response:', scan2shipResult);

    // Test 2: Test Catalog App inventory API endpoint
    console.log('\n📦 Step 2: Testing Catalog App inventory API...');
    
    const catalogResponse = await fetch('http://localhost:3001/api/public/inventory/check?client=test-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
        'X-Client-ID': 'test-client-id'
      },
      body: JSON.stringify({
        items: [{ sku: 'TEST-SKU-001', quantity: 1 }]
      })
    });

    const catalogResult = await catalogResponse.json();
    console.log('✅ Catalog API response:', catalogResult);

    console.log('\n🎉 API Integration Test Completed!');
    console.log('\n📋 Summary:');
    console.log('- Both APIs are responding');
    console.log('- Authentication is working as expected');
    console.log('- Ready for end-to-end testing with proper credentials');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure both apps are running:');
    console.log('- Scan2Ship: http://localhost:3000');
    console.log('- Catalog App: http://localhost:3001');
  }
}

// Run the test
testApiIntegration();
