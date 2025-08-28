require('dotenv').config({ path: '.env.local' });

async function testRealtimeApiKeys() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('🧪 Testing Real-time API Key Fetching...\n');

  // First, login to get authentication token
  console.log('1. Logging in...');
  let authToken = null;
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sujatha@scan2ship.in',
        password: 'password123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.session.token;
      console.log('✅ Login successful!');
      console.log(`User: ${loginData.user.name} (${loginData.user.email})`);
      console.log(`Client: ${loginData.client.companyName}`);
    } else {
      const errorData = await loginResponse.json();
      console.log(`❌ Login failed: ${errorData.error}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Login error: ${error.message}`);
    return;
  }

  // Test pickup locations API endpoint
  console.log('\n2. Testing pickup locations API endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/pickup-locations', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log(`Pickup Locations API Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Pickup locations fetched successfully!');
      console.log(`Client: ${data.clientName}`);
      console.log(`Total Locations: ${data.pickupLocations.length}`);
      
      data.pickupLocations.forEach((location, index) => {
        console.log(`\n📍 Location ${index + 1}:`);
        console.log(`  - Value: ${location.value}`);
        console.log(`  - Label: ${location.label}`);
        console.log(`  - API Key: ${location.delhiveryApiKey ? location.delhiveryApiKey.substring(0, 8) + '...' : 'Not configured'}`);
        console.log(`  - API Key Length: ${location.delhiveryApiKey?.length || 0}`);
        
        if (location.delhiveryApiKey) {
          if (location.delhiveryApiKey.length === 40) {
            console.log(`  ✅ API key format is correct (40 characters)`);
          } else {
            console.log(`  ⚠️ API key format is unusual (${location.delhiveryApiKey.length} characters)`);
          }
        }
      });
    } else {
      const errorData = await response.json();
      console.log(`❌ Pickup locations API failed: ${errorData.error}`);
    }
  } catch (error) {
    console.log(`❌ Pickup locations API error: ${error.message}`);
  }

  // Test specific pickup location API key retrieval
  console.log('\n3. Testing specific pickup location API key retrieval...');
  try {
    const testLocations = ['SUJATHA FRANCHISE', 'rvd jewels'];
    
    for (const location of testLocations) {
      console.log(`\n🔑 Testing API key for: ${location}`);
      
      // Test the API key retrieval through the pickup locations endpoint
      const response = await fetch('http://localhost:3000/api/pickup-locations', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const pickupLocation = data.pickupLocations.find((loc) => 
          loc.value.toLowerCase() === location.toLowerCase()
        );
        
        if (pickupLocation?.delhiveryApiKey) {
          console.log(`  ✅ Found API key: ${pickupLocation.delhiveryApiKey.substring(0, 8)}...`);
          console.log(`  ✅ API key length: ${pickupLocation.delhiveryApiKey.length} characters`);
        } else {
          console.log(`  ❌ No API key found for ${location}`);
        }
      } else {
        console.log(`  ❌ Failed to fetch pickup locations for ${location}`);
      }
    }
  } catch (error) {
    console.log(`❌ API key retrieval error: ${error.message}`);
  }

  console.log('\n🎉 Real-time API key testing completed!');
}

testRealtimeApiKeys().catch(console.error);
