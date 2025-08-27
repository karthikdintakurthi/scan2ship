// Test the exact headers that should be sent to Delhivery API
function testDelhiveryHeaders() {
  console.log('🧪 Testing Delhivery API Headers...\n');

  // The API key from the UI
  const rawApiKey = "var clientKeyD = '52f81411e7185b24602a6b2b4b52ac491ed00a24';";
  console.log('1️⃣ Raw API key from database:', rawApiKey);

  // Extract the clean API key
  let cleanApiKey = rawApiKey;
  if (rawApiKey.includes("'") && rawApiKey.includes('clientKeyD')) {
    const match = rawApiKey.match(/'([^']+)'/);
    if (match) {
      cleanApiKey = match[1];
      console.log('2️⃣ Clean API key extracted:', cleanApiKey);
    }
  }

  // Create the exact headers that should be sent
  const headers = {
    'Authorization': `Token ${cleanApiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  console.log('\n3️⃣ Exact headers to be sent to Delhivery API:');
  console.log(JSON.stringify(headers, null, 2));

  // Show the specific format you mentioned
  console.log('\n4️⃣ Header format as you specified:');
  console.log('Headers: {');
  console.log('  "Authorization": "Token ' + cleanApiKey + '",');
  console.log('  "Accept": "application/json",');
  console.log('  "Content-Type": "application/x-www-form-urlencoded"');
  console.log('}');

  // Test the request body format
  const testOrder = {
    name: 'Test Customer',
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
    product_description: 'Test Product'
  };

  const jsonData = {
    shipments: [testOrder],
    pickup_location: {
      name: 'SUJATHA FRANCHISE'
    }
  };

  const requestBody = `format=json&data=${JSON.stringify(jsonData)}`;

  console.log('\n5️⃣ Request body format:');
  console.log('Body:', requestBody);

  console.log('\n🎉 Header test completed!');
  console.log('💡 These are the exact headers and body that should be sent to Delhivery API');
}

// Run the test
testDelhiveryHeaders();
