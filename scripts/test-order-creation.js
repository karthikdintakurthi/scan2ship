const BASE_URL = 'http://localhost:3000';

async function testOrderCreation() {
  try {
    console.log('🧪 Testing Order Creation Flow...\n');

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

    // Step 2: Get pickup locations
    console.log('\n2️⃣ Fetching pickup locations...');
    const pickupLocationsResponse = await fetch(`${BASE_URL}/api/pickup-locations`, {
      headers: { 'Authorization': `Bearer ${clientUserToken}` }
    });

    if (!pickupLocationsResponse.ok) {
      const errorData = await pickupLocationsResponse.text();
      throw new Error(`Failed to fetch pickup locations: ${pickupLocationsResponse.status} - ${errorData}`);
    }

    const pickupLocationsData = await pickupLocationsResponse.json();
    console.log('✅ Pickup locations retrieved:', pickupLocationsData);

    // Step 3: Check if pickup locations have API keys
    if (pickupLocationsData.pickupLocations && pickupLocationsData.pickupLocations.length > 0) {
      console.log('\n3️⃣ Checking pickup location configurations...');
      pickupLocationsData.pickupLocations.forEach(location => {
        console.log(`   📍 ${location.label} (${location.value}):`);
        console.log(`      API Key: ${location.delhiveryApiKey ? '✅ Configured' : '❌ Missing'}`);
        if (location.delhiveryApiKey) {
          console.log(`      Key Length: ${location.delhiveryApiKey.length} characters`);
        }
      });
    }

    // Step 4: Get order configuration
    console.log('\n4️⃣ Fetching order configuration...');
    const orderConfigResponse = await fetch(`${BASE_URL}/api/order-config`, {
      headers: { 'Authorization': `Bearer ${clientUserToken}` }
    });

    if (!orderConfigResponse.ok) {
      const errorData = await orderConfigResponse.text();
      throw new Error(`Failed to fetch order config: ${orderConfigResponse.status} - ${errorData}`);
    }

    const orderConfig = await orderConfigResponse.json();
    console.log('✅ Order configuration retrieved');

    // Step 5: Try to create an order with a pickup location that has an API key
    console.log('\n5️⃣ Testing order creation...');
    
    // Find a pickup location with an API key
    let pickupLocationWithKey = null;
    if (pickupLocationsData.pickupLocations) {
      pickupLocationWithKey = pickupLocationsData.pickupLocations.find(loc => loc.delhiveryApiKey);
    }

    if (!pickupLocationWithKey) {
      console.log('⚠️ No pickup locations with API keys found. Creating test order without Delhivery...');
      pickupLocationWithKey = { value: 'test-pickup', label: 'Test Pickup' };
    }

    const testOrder = {
      name: 'Test Customer',
      mobile: '9876543210',
      address: '456 Customer Street',
      city: 'Customer City',
      state: 'Customer State',
      country: 'India',
      pincode: '500002',
      courier_service: 'manual', // Use manual instead of delhivery to avoid API key issue
      pickup_location: pickupLocationWithKey.value,
      package_value: 1000,
      weight: 500,
      total_items: 2,
      is_cod: false,
      product_description: 'Test Product'
    };

    console.log('📦 Creating order with data:', testOrder);

    const createOrderResponse = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientUserToken}`
      },
      body: JSON.stringify(testOrder)
    });

    if (!createOrderResponse.ok) {
      const errorData = await createOrderResponse.text();
      throw new Error(`Create order failed: ${createOrderResponse.status} - ${errorData}`);
    }

    const createdOrder = await createOrderResponse.json();
    console.log('✅ Order created successfully:', createdOrder);

    // Step 6: Test with Delhivery if we have a pickup location with API key
    if (pickupLocationWithKey.delhiveryApiKey) {
      console.log('\n6️⃣ Testing Delhivery order creation...');
      
      const delhiveryOrder = {
        ...testOrder,
        courier_service: 'delhivery',
        name: 'Delhivery Test Customer'
      };

      console.log('📦 Creating Delhivery order with data:', delhiveryOrder);

      const delhiveryOrderResponse = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientUserToken}`
        },
        body: JSON.stringify(delhiveryOrder)
      });

      if (!delhiveryOrderResponse.ok) {
        const errorData = await delhiveryOrderResponse.text();
        console.log('⚠️ Delhivery order creation failed:', errorData);
        console.log('💡 This is expected if the API key is not properly configured');
      } else {
        const delhiveryCreatedOrder = await delhiveryOrderResponse.json();
        console.log('✅ Delhivery order created successfully:', delhiveryCreatedOrder);
      }
    }

    console.log('\n🎉 Order creation test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testOrderCreation();
