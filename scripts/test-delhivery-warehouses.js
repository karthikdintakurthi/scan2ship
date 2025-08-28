async function testDelhiveryWarehouses() {
  const fetch = (await import('node-fetch')).default;
  console.log('🏢 [TEST] Testing Delhivery warehouse names...');
  
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
    
    // Step 2: Get pickup locations to see what's configured
    console.log('📍 [TEST] Step 2: Getting configured pickup locations...');
    
    const pickupResponse = await fetch('http://localhost:3000/api/pickup-locations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (pickupResponse.ok) {
      const pickupData = await pickupResponse.json();
      console.log('📋 [TEST] Configured pickup locations:');
      pickupData.pickupLocations.forEach((location, index) => {
        console.log(`  ${index + 1}. ${location.value} (API Key: ${location.delhiveryApiKey ? 'Configured' : 'Not configured'})`);
      });
    }
    
    // Step 3: Test common Delhivery warehouse names
    console.log('🏢 [TEST] Step 3: Testing common Delhivery warehouse names...');
    
    const commonWarehouseNames = [
      'VIJAYA8 FRANCHISE',
      'VIJAYA FRANCHISE',
      'SUJATHA FRANCHISE',
      'SUJATHA GOLD COVERING WORKS',
      'VANITHA LOGISTICS',
      'VJL',
      'DEFAULT WAREHOUSE',
      'MAIN WAREHOUSE',
      'PRIMARY WAREHOUSE'
    ];
    
    console.log('🔑 [TEST] Testing warehouse names with existing API key configuration');
    
    // Test each warehouse name
    for (const warehouseName of commonWarehouseNames) {
      console.log(`\n🧪 [TEST] Testing warehouse name: "${warehouseName}"`);
      
      try {
        const testOrderData = {
          name: 'Test Customer',
          mobile: '9876543210',
          phone: '9876543210',
          address: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          country: 'India',
          pincode: '123456',
          courier_service: 'Delhivery',
          pickup_location: warehouseName,
          package_value: '1000',
          weight: '500',
          total_items: '1',
          is_cod: false,
          cod_amount: '',
          reseller_name: '',
          reseller_mobile: '',
          product_description: 'Test Product',
          waybill: '',
          reference_number: `TEST-${Date.now()}`,
          creationPattern: 'manual'
        };
        
        const orderResponse = await fetch('http://localhost:3000/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(testOrderData)
        });
        
        const orderResult = await orderResponse.json();
        
        if (orderResponse.status === 400 && orderResult.error === 'Delhivery API failed') {
          console.log(`❌ [TEST] Warehouse "${warehouseName}" failed: ${orderResult.details}`);
        } else if (orderResponse.status === 200 && orderResult.success) {
          console.log(`✅ [TEST] Warehouse "${warehouseName}" SUCCESS! Order created: ${orderResult.order.orderNumber}`);
          console.log(`✅ [TEST] This warehouse name works! Use this in your pickup location configuration.`);
          break;
        } else {
          console.log(`⚠️ [TEST] Warehouse "${warehouseName}" unexpected response: ${orderResponse.status}`);
        }
        
        // Wait a bit between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ [TEST] Warehouse "${warehouseName}" error: ${error.message}`);
      }
    }
    
    console.log('\n📋 [TEST] Summary:');
    console.log('If any warehouse name succeeded, use that exact name in your pickup location configuration.');
    console.log('If all failed, you may need to:');
    console.log('1. Contact Delhivery to get the correct warehouse name');
    console.log('2. Check if your API key has access to create orders');
    console.log('3. Verify the warehouse is active in Delhivery system');
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error);
  }
}

// Run the test
testDelhiveryWarehouses();
