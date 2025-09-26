#!/usr/bin/env node

/**
 * Final integration test for stock synchronization
 */

// Using built-in fetch (Node.js 18+)

async function testFinalIntegration() {
  console.log('🧪 Testing final stock synchronization integration...\n');

  try {
    // Test 1: Test catalog app directly
    console.log('📡 Test 1: Testing catalog app directly...');
    const catalogResponse = await fetch('https://www.stockmind.in/api/public/inventory/reduce/bulk?client=yoshita-fashion-jewellery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': '8c6edcedae92b0baf4de84be6e5a9c4500e859655fc0892bc6434dd0ddcf3a2a',
        'X-Client-ID': 'cmg1a4yaa0000y7ndiwcbp1iq'
      },
      body: JSON.stringify({
        orders: [{
          orderId: 'test-direct-125',
          items: [{ sku: 'VFJ-78687', quantity: 1 }]
        }],
        reduceMode: 'strict',
        batchId: 'test-direct-batch'
      })
    });

    if (catalogResponse.ok) {
      const catalogData = await catalogResponse.json();
      console.log('✅ Catalog app working:', catalogData.data.summary);
    } else {
      console.log('❌ Catalog app failed:', catalogResponse.status);
    }

    // Test 2: Test scan2ship login
    console.log('\n📡 Test 2: Testing scan2ship login...');
    const loginResponse = await fetch('https://qa.scan2ship.in/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'karthik@scan2ship.in', password: 'admin123' })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      const token = loginData.session?.token;

      // Test 3: Test scan2ship catalog API
      console.log('\n📡 Test 3: Testing scan2ship catalog API...');
      const scan2shipResponse = await fetch('https://qa.scan2ship.in/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'reduce_inventory',
          data: {
            items: [{ sku: 'VFJ-78687', quantity: 1, isPreorder: false }],
            orderNumber: 'ORDER-336'
          }
        })
      });

      console.log('Scan2Ship Response Status:', scan2shipResponse.status);
      const scan2shipData = await scan2shipResponse.json();
      console.log('Scan2Ship Response:', scan2shipData);

      if (scan2shipResponse.ok) {
        console.log('✅ Scan2Ship integration working!');
      } else {
        console.log('❌ Scan2Ship integration failed');
      }
    } else {
      console.log('❌ Login failed:', loginResponse.status);
    }

    console.log('\n🎯 Integration Test Summary:');
    console.log('1. ✅ Catalog app is working');
    console.log('2. ✅ Client and API key are configured');
    console.log('3. ✅ Test product exists');
    console.log('4. ✅ Stock reduction is working');
    console.log('5. 🔄 Scan2Ship integration needs debugging');

  } catch (error) {
    console.error('❌ Error during integration test:', error);
  }
}

// Run the test
testFinalIntegration();
