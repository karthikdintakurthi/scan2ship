async function testDelhiveryOrderFlow() {
  const fetch = (await import('node-fetch')).default;
  console.log('🧪 [TEST] Testing Delhivery order flow with API failure prevention...');
  
  try {
    // Step 1: Login to get auth token
    console.log('🔐 [TEST] Step 1: Logging in...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'karthik@scan2ship.in',
        password: 'Darling@2706'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ [TEST] Login successful, token received');
    
    // Step 2: Try to create a Delhivery order with invalid data to trigger API failure
    console.log('📦 [TEST] Step 2: Attempting to create Delhivery order with invalid data...');
    
    const orderData = {
      name: 'Test Customer',
      mobile: '9876543210',
      phone: '9876543210',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '123456',
      courier_service: 'Delhivery',
      pickup_location: 'INVALID_PICKUP_LOCATION', // This should cause Delhivery API to fail
      package_value: '1000',
      weight: '500',
      total_items: '1',
      is_cod: false,
      cod_amount: '',
      reseller_name: '',
      reseller_mobile: '',
      product_description: 'Test Product',
      waybill: '',
      reference_number: '',
      creationPattern: 'manual'
    };
    
    const orderResponse = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });
    
    const orderResult = await orderResponse.json();
    
    console.log('📊 [TEST] Order creation response:');
    console.log('  Status:', orderResponse.status);
    console.log('  Success:', orderResult.success);
    console.log('  Error:', orderResult.error);
    console.log('  Details:', orderResult.details);
    
    if (orderResponse.status === 400 && orderResult.error === 'Delhivery API failed') {
      console.log('✅ [TEST] SUCCESS: Order creation correctly prevented when Delhivery API failed');
      console.log('✅ [TEST] Error message properly returned to client');
    } else if (orderResponse.status === 200 && orderResult.success) {
      console.log('❌ [TEST] FAILED: Order was created despite Delhivery API failure');
      console.log('❌ [TEST] This indicates the new flow is not working correctly');
    } else {
      console.log('⚠️ [TEST] UNEXPECTED: Unexpected response format');
    }
    
    // Step 3: Verify no order was created in database
    console.log('🔍 [TEST] Step 3: Checking if any orders were created...');
    
    const ordersResponse = await fetch('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      const recentOrders = ordersData.orders.filter(order => 
        order.name === 'Test Customer' && 
        order.mobile === '9876543210'
      );
      
      if (recentOrders.length === 0) {
        console.log('✅ [TEST] SUCCESS: No test orders found in database - order creation was properly prevented');
      } else {
        console.log('❌ [TEST] FAILED: Test orders found in database - order creation was not prevented');
        console.log('❌ [TEST] Found orders:', recentOrders.map(o => ({ id: o.id, name: o.name, delhivery_status: o.delhivery_api_status })));
      }
    } else {
      console.log('⚠️ [TEST] Could not verify orders in database');
    }
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error);
  }
}

// Run the test
testDelhiveryOrderFlow();
