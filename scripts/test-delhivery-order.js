require('dotenv').config({ path: '.env.local' });

async function testDelhiveryOrder() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('🧪 Testing Delhivery Order Creation...\n');

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

  // Test order creation with SUJATHA FRANCHISE pickup location
  console.log('\n2. Testing order creation with SUJATHA FRANCHISE...');
  try {
    const orderData = {
      name: 'Test Customer',
      mobile: '9876543210',
      address: 'Test Address, Test City',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '500001',
      courier_service: 'delhivery',
      pickup_location: 'SUJATHA FRANCHISE',
      package_value: 5000,
      weight: 100,
      total_items: 1,
      is_cod: false,
      cod_amount: null,
      reseller_name: '',
      reseller_mobile: ''
    };

    const orderResponse = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(orderData)
    });

    console.log(`Order Creation Status: ${orderResponse.status}`);
    
    if (orderResponse.ok) {
      const orderResult = await orderResponse.json();
      console.log('✅ Order created successfully!');
      console.log(`Order ID: ${orderResult.order.id}`);
      console.log(`Reference Number: ${orderResult.order.reference_number}`);
      console.log(`Delhivery Status: ${orderResult.order.delhivery_api_status}`);
      
      if (orderResult.order.delhivery_waybill_number) {
        console.log(`Waybill Number: ${orderResult.order.delhivery_waybill_number}`);
      }
      
      if (orderResult.order.delhivery_api_error) {
        console.log(`Delhivery Error: ${orderResult.order.delhivery_api_error}`);
      }
    } else {
      const errorData = await orderResponse.json();
      console.log(`❌ Order creation failed: ${errorData.error}`);
    }
  } catch (error) {
    console.log(`❌ Order creation error: ${error.message}`);
  }

  console.log('\n🎉 Delhivery order test completed!');
}

testDelhiveryOrder().catch(console.error);

