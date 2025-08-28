async function testCreditsAuth() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('Testing Credits API Authentication...\n');

  // Test 1: Without any token
  console.log('1. Testing without token:');
  try {
    const response = await fetch('http://localhost:3000/api/credits');
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }
  console.log('');

  // Test 2: With invalid token
  console.log('2. Testing with invalid token:');
  try {
    const response = await fetch('http://localhost:3000/api/credits', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }
  console.log('');

  // Test 3: Test auth verification endpoint
  console.log('3. Testing auth verification endpoint:');
  try {
    const response = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }
  console.log('');

  // Test 4: Check if server is running
  console.log('4. Testing server connectivity:');
  try {
    const response = await fetch('http://localhost:3000/api/auth/verify');
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
  } catch (error) {
    console.log(`   Error:`, error.message);
  }
}

testCreditsAuth().catch(console.error);
