require('dotenv').config({ path: '.env.local' });

async function testCreditsFlow() {
  const fetch = (await import('node-fetch')).default;
  
  console.log('🧪 Testing Complete Credits Flow...\n');

  // Step 1: Login
  console.log('1. Testing Login:');
  let authToken = null;
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'karthik@scan2ship.in',
        password: 'Darling@2706'
      })
    });
    
    console.log(`   Login Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.session.token;
      console.log('   ✅ Login successful!');
      console.log(`   User: ${loginData.user.name} (${loginData.user.email})`);
      console.log(`   Client: ${loginData.client.companyName}`);
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
    } else {
      const errorData = await loginResponse.json();
      console.log(`   ❌ Login failed: ${errorData.error}`);
      return;
    }
  } catch (error) {
    console.log(`   ❌ Login error: ${error.message}`);
    return;
  }
  console.log('');

  // Step 2: Test auth verification
  console.log('2. Testing Auth Verification:');
  try {
    const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`   Verify Status: ${verifyResponse.status}`);
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('   ✅ Auth verification successful!');
      console.log(`   User: ${verifyData.user.name} (${verifyData.user.email})`);
      console.log(`   Client: ${verifyData.client.companyName}`);
    } else {
      const errorData = await verifyResponse.json();
      console.log(`   ❌ Auth verification failed: ${errorData.error}`);
      return;
    }
  } catch (error) {
    console.log(`   ❌ Auth verification error: ${error.message}`);
    return;
  }
  console.log('');

  // Step 3: Test credits API
  console.log('3. Testing Credits API:');
  try {
    const creditsResponse = await fetch('http://localhost:3000/api/credits', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`   Credits Status: ${creditsResponse.status}`);
    
    if (creditsResponse.ok) {
      const creditsData = await creditsResponse.json();
      console.log('   ✅ Credits API successful!');
      console.log(`   Balance: ${creditsData.data.balance}`);
      console.log(`   Total Added: ${creditsData.data.totalAdded}`);
      console.log(`   Total Used: ${creditsData.data.totalUsed}`);
    } else {
      const errorData = await creditsResponse.json();
      console.log(`   ❌ Credits API failed: ${errorData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Credits API error: ${error.message}`);
  }
  console.log('');

  // Step 4: Test credits transactions API
  console.log('4. Testing Credits Transactions API:');
  try {
    const transactionsResponse = await fetch('http://localhost:3000/api/credits/transactions?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`   Transactions Status: ${transactionsResponse.status}`);
    
    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('   ✅ Transactions API successful!');
      console.log(`   Total Transactions: ${transactionsData.data.length}`);
      console.log(`   Total Pages: ${transactionsData.pagination.totalPages}`);
    } else {
      const errorData = await transactionsResponse.json();
      console.log(`   ❌ Transactions API failed: ${errorData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Transactions API error: ${error.message}`);
  }
}

testCreditsFlow().catch(console.error);

