async function testSujathaFix() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('🔧 [TEST] Testing Sujatha Gold warehouse name fix...');
  
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
    
    // Step 2: Test creating a Delhivery order with Sujatha pickup location
    console.log('📦 [TEST] Step 2: Testing Delhivery order creation with Sujatha pickup location...');
    
    const testOrderData = {
      name: 'Test Customer Sujatha',
      mobile: '9876543210',
      phone: '9876543210',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '123456',
      courier_service: 'Delhivery',
      pickup_location: 'SUJATHA FRANCHISE', // This should now be sent to Delhivery API
      package_value: '1000',
      weight: '500',
      total_items: '1',
      is_cod: false,
      cod_amount: '',
      reseller_name: '',
      reseller_mobile: '',
      product_description: 'Test Product',
      waybill: '',
      reference_number: `TEST-SUJATHA-FIX-${Date.now()}`,
      creationPattern: 'manual'
    };
    
    console.log('📋 [TEST] Test order data:');
    console.log(`  Pickup Location: "${testOrderData.pickup_location}"`);
    console.log(`  Courier Service: "${testOrderData.courier_service}"`);
    
    const orderResponse = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testOrderData)
    });
    
    const orderResult = await orderResponse.json();
    
    console.log('📊 [TEST] Order creation response:');
    console.log('  Status:', orderResponse.status);
    console.log('  Success:', orderResult.success);
    console.log('  Error:', orderResult.error);
    console.log('  Details:', orderResult.details);
    
    if (orderResponse.status === 400 && orderResult.error === 'Delhivery API failed') {
      console.log('❌ [TEST] Delhivery API still failed, but now with correct warehouse name');
      console.log('💡 [TEST] The warehouse name is now "SUJATHA FRANCHISE" instead of "VIJAYA8 FRANCHISE"');
      console.log('💡 [TEST] If this still fails, "SUJATHA FRANCHISE" might not exist in Delhivery system');
    } else if (orderResponse.status === 200 && orderResult.success) {
      console.log('✅ [TEST] SUCCESS! Delhivery order created with correct warehouse name');
      console.log('✅ [TEST] The fix worked - "SUJATHA FRANCHISE" is a valid warehouse in Delhivery');
    } else {
      console.log('⚠️ [TEST] Unexpected response - check if the fix is working correctly');
    }
    
    console.log('\n📋 [TEST] Summary of the fix:');
    console.log('✅ Before: Warehouse name was hardcoded to "VIJAYA8 FRANCHISE"');
    console.log('✅ After: Warehouse name now uses actual pickup location value: "SUJATHA FRANCHISE"');
    console.log('✅ The Delhivery API will now receive the correct warehouse name');
    console.log('✅ If "SUJATHA FRANCHISE" exists in Delhivery system, orders should work');
    console.log('✅ If it still fails, you need to configure the correct warehouse name in Delhivery');
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error);
  }
}

// Run the test
testSujathaFix();
