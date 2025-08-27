// Direct test of Delhivery service
const { DelhiveryService } = require('../src/lib/delhivery.js');

async function testDelhiveryDirect() {
  try {
    console.log('🧪 Testing Delhivery Service Directly...\n');

    // Create Delhivery service instance
    const delhiveryService = new DelhiveryService();
    console.log('✅ Delhivery service created');

    // Test data
    const testOrderData = {
      id: 'test-order-123',
      name: 'Direct Test Customer',
      mobile: '9876543210',
      address: '456 Customer Street',
      city: 'Customer City',
      state: 'Customer State',
      country: 'India',
      pincode: '500002',
      courier_service: 'delhivery',
      pickup_location: 'SUJATHA FRANCHISE',
      package_value: 1000,
      weight: 500,
      total_items: 2,
      is_cod: false,
      product_description: 'Test Product for Direct Delhivery API'
    };

    console.log('📦 Test order data:', JSON.stringify(testOrderData, null, 2));

    // Call Delhivery service directly
    console.log('\n🚀 Calling Delhivery service createOrder...');
    const response = await delhiveryService.createOrder(testOrderData);
    
    console.log('\n📡 Delhivery service response:', JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDelhiveryDirect();
