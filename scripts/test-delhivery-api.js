const BASE_URL = 'http://localhost:3000';

async function testDelhiveryAPI() {
  try {
    console.log('🧪 Testing Delhivery API Directly...\n');

    // Step 1: Login as client user (Sujatha)
    console.log('1️⃣ Logging in as client user...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sujatha@scan2ship.in',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} - ${errorData}`);
    }

    const loginData = await loginResponse.json();
    const clientUserToken = loginData.session?.token || loginData.token;
    
    if (!clientUserToken) {
      throw new Error('No token received from login');
    }

    console.log('✅ Login successful');

    // Step 2: Create a Delhivery order to trigger the API call
    console.log('\n2️⃣ Creating Delhivery order to test API...');
    
    const delhiveryOrder = {
      name: 'Delhivery API Test Customer',
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
      product_description: 'Test Product for Delhivery API'
    };

    console.log('📦 Creating Delhivery order with data:', delhiveryOrder);

    const createOrderResponse = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientUserToken}`
      },
      body: JSON.stringify(delhiveryOrder)
    });

    if (!createOrderResponse.ok) {
      const errorData = await createOrderResponse.text();
      console.log('⚠️ Delhivery order creation failed:', errorData);
      console.log('💡 This will help us see the API call details in the server logs');
    } else {
      const createdOrder = await createOrderResponse.json();
      console.log('✅ Delhivery order created successfully:', createdOrder);
    }

    console.log('\n🎉 Delhivery API test completed!');
    console.log('📋 Check the server console logs above for detailed API call information');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDelhiveryAPI();
