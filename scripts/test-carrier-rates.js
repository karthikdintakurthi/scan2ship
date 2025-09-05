const fetch = require('node-fetch');

// Test the carrier rates API
async function testCarrierRates() {
  try {
    console.log('🧪 Testing Carrier Rates API...\n');

    // First, get an API key (you'll need to replace this with a real API key)
    const apiKey = 'sk_test_1234567890abcdef'; // Replace with actual API key
    
    const baseUrl = 'http://localhost:3000'; // Adjust if your server runs on different port
    
    // Test data for rate calculation
    const rateRequest = {
      origin: {
        country: 'IN',
        postal_code: '560001',
        province: 'Karnataka',
        city: 'Bangalore'
      },
      destination: {
        country: 'IN',
        postal_code: '110001',
        province: 'Delhi',
        city: 'New Delhi'
      },
      items: [
        {
          name: 'Test Product',
          sku: 'TEST-001',
          quantity: 1,
          grams: 1000, // 1kg
          price: 500.00,
          requires_shipping: true,
          taxable: true
        }
      ],
      currency: 'INR'
    };

    console.log('📦 Test Request Data:');
    console.log(JSON.stringify(rateRequest, null, 2));
    console.log('\n');

    // Test GET endpoint first (to check if API is working)
    console.log('🔍 Testing GET /api/carrier/rates...');
    const getResponse = await fetch(`${baseUrl}/api/carrier/rates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('✅ GET Response:');
      console.log(JSON.stringify(getData, null, 2));
    } else {
      const errorText = await getResponse.text();
      console.log('❌ GET Error:', getResponse.status, errorText);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test POST endpoint for rate calculation
    console.log('🚚 Testing POST /api/carrier/rates...');
    const postResponse = await fetch(`${baseUrl}/api/carrier/rates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rateRequest)
    });

    if (postResponse.ok) {
      const rateData = await postResponse.json();
      console.log('✅ Rate Calculation Response:');
      console.log(JSON.stringify(rateData, null, 2));
      
      if (rateData.rates && rateData.rates.length > 0) {
        console.log('\n📊 Rate Summary:');
        rateData.rates.forEach((rate, index) => {
          console.log(`${index + 1}. ${rate.service_name} (${rate.service_code})`);
          console.log(`   Price: ₹${rate.total_price}`);
          console.log(`   Delivery: ${rate.min_delivery_date} to ${rate.max_delivery_date}`);
          console.log(`   Description: ${rate.description}`);
          console.log('');
        });
      }
    } else {
      const errorText = await postResponse.text();
      console.log('❌ POST Error:', postResponse.status, errorText);
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Test with different scenarios
async function testMultipleScenarios() {
  console.log('🧪 Testing Multiple Scenarios...\n');

  const scenarios = [
    {
      name: 'Light Package (500g)',
      items: [{
        name: 'Light Item',
        quantity: 1,
        grams: 500,
        price: 200,
        requires_shipping: true,
        taxable: true
      }]
    },
    {
      name: 'Heavy Package (5kg)',
      items: [{
        name: 'Heavy Item',
        quantity: 1,
        grams: 5000,
        price: 2000,
        requires_shipping: true,
        taxable: true
      }]
    },
    {
      name: 'Free Shipping Threshold (₹1500)',
      items: [{
        name: 'Expensive Item',
        quantity: 1,
        grams: 1000,
        price: 1500,
        requires_shipping: true,
        taxable: true
      }]
    },
    {
      name: 'Multiple Items',
      items: [
        {
          name: 'Item 1',
          quantity: 2,
          grams: 300,
          price: 100,
          requires_shipping: true,
          taxable: true
        },
        {
          name: 'Item 2',
          quantity: 1,
          grams: 500,
          price: 200,
          requires_shipping: true,
          taxable: true
        }
      ]
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📦 Testing: ${scenario.name}`);
    console.log('-'.repeat(30));
    
    const totalWeight = scenario.items.reduce((sum, item) => sum + (item.grams * item.quantity), 0);
    const totalValue = scenario.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    console.log(`Total Weight: ${totalWeight}g (${totalWeight/1000}kg)`);
    console.log(`Total Value: ₹${totalValue}`);
    
    // You can add actual API calls here if needed
  }
}

// Run tests
testCarrierRates().then(() => {
  console.log('\n' + '='.repeat(50));
  return testMultipleScenarios();
}).then(() => {
  console.log('\n🎉 All tests completed!');
}).catch(error => {
  console.error('❌ Test suite error:', error);
});
