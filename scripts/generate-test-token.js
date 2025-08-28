require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

async function generateTestToken() {
  console.log('🔑 Generating test JWT token...\n');

  const payload = {
    userId: 'master-admin-1756272680518',
    clientId: 'master-client-1756272680179',
    email: 'karthik@scan2ship.in',
    role: 'master_admin'
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );

  console.log('✅ Token generated successfully!');
  console.log(`Token: ${token}`);
  console.log('\n📋 To test in browser:');
  console.log('1. Open browser console');
  console.log('2. Run: localStorage.setItem("authToken", "' + token + '")');
  console.log('3. Refresh the page');
  console.log('\n🔍 To verify token:');
  console.log('1. Open browser console');
  console.log('2. Run: console.log(localStorage.getItem("authToken"))');
  console.log('3. Should show the token above');

  // Test the token
  console.log('\n🧪 Testing token...');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('✅ Token is valid!');
    console.log('Decoded payload:', decoded);
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
  }
}

generateTestToken().catch(console.error);

