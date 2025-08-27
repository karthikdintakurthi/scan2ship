const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function testUserCreation() {
  try {
    console.log('🔍 Testing user creation API...');
    
    // First, login as master admin to get token
    console.log('\n🔐 Logging in as master admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'karthik@scan2ship.in',
        password: 'Darling@2706'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.session.token;
    console.log('✅ Login successful, token length:', token.length);
    
    // Get a client to create user for
    console.log('\n🏢 Getting existing client...');
    const clientResponse = await fetch(`${BASE_URL}/api/admin/clients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!clientResponse.ok) {
      throw new Error(`Get clients failed: ${clientResponse.status}`);
    }
    
    const clientsData = await clientResponse.json();
    const clientId = clientsData.clients[0].id;
    console.log('✅ Using client:', { id: clientId, name: clientsData.clients[0].companyName });
    
    // Test user creation
    console.log('\n👤 Testing user creation...');
    const userData = {
      name: 'Test User',
      email: `testuser-${Date.now()}@company.com`,
      password: 'password123',
      role: 'user',
      clientId: clientId,
      isActive: true
    };
    
    console.log('📝 User data:', userData);
    
    const createUserResponse = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(userData)
    });
    
    console.log('📊 Response status:', createUserResponse.status);
    console.log('📊 Response headers:', Object.fromEntries(createUserResponse.headers.entries()));
    
    const responseText = await createUserResponse.text();
    console.log('📊 Response body:', responseText);
    
    if (createUserResponse.ok) {
      console.log('✅ User creation successful!');
    } else {
      console.log('❌ User creation failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserCreation();
