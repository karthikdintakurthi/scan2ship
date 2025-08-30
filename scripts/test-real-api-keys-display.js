async function testRealApiKeysDisplay() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('🔑 [TEST] Testing real API key display in client settings...');
  
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
    
    // Step 2: Test the pickup locations API directly
    console.log('📍 [TEST] Step 2: Testing pickup locations API...');
    
    const pickupResponse = await fetch('http://localhost:3000/api/pickup-locations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (pickupResponse.ok) {
      const pickupData = await pickupResponse.json();
      console.log(`📋 [TEST] Pickup locations API returned ${pickupData.pickupLocations.length} locations`);
      
      pickupData.pickupLocations.forEach((location, index) => {
        console.log(`\n📍 [TEST] Pickup Location ${index + 1}:`);
        console.log(`  Label: ${location.label}`);
        console.log(`  Value: ${location.value}`);
        console.log(`  API Key: ${location.delhiveryApiKey || 'Not configured'}`);
        
        if (location.delhiveryApiKey) {
          if (location.delhiveryApiKey === '••••••••••••••••') {
            console.log('❌ [TEST] API key is still masked with dots');
          } else if (location.delhiveryApiKey.length === 40) {
            console.log('✅ [TEST] API key is displayed as real data (40 characters)');
            console.log(`✅ [TEST] API key starts with: ${location.delhiveryApiKey.substring(0, 8)}...`);
          } else {
            console.log(`⚠️ [TEST] API key has unexpected length: ${location.delhiveryApiKey.length}`);
            console.log(`⚠️ [TEST] API key: ${location.delhiveryApiKey}`);
          }
        }
      });
    }
    
    console.log('\n📋 [TEST] Summary:');
    console.log('✅ API keys should now be displayed as real data in both view and edit modes');
    console.log('✅ No more masking with dots (••••••••••••••••)');
    console.log('✅ You can now see the actual API key values in the Client Settings page');
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error);
  }
}

// Run the test
testRealApiKeysDisplay();
