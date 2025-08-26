const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function debugAuth() {
  try {
    console.log('🔍 Debugging authentication...');

    // Step 1: Find the Master Admin user
    const masterAdmin = await prisma.user.findFirst({
      where: {
        email: 'karthik@scan2ship.in',
        role: 'master_admin'
      },
      include: {
        client: true
      }
    });

    if (!masterAdmin) {
      console.log('❌ Master Admin user not found');
      return;
    }

    console.log('✅ Found Master Admin:', {
      id: masterAdmin.id,
      email: masterAdmin.email,
      name: masterAdmin.name,
      role: masterAdmin.role,
      isActive: masterAdmin.isActive,
      clientId: masterAdmin.clientId,
      clientName: masterAdmin.client.companyName
    });

    // Step 2: Create a test JWT token
    const payload = { 
      userId: masterAdmin.id, 
      clientId: masterAdmin.clientId,
      email: masterAdmin.email,
      role: masterAdmin.role 
    };

    const secret = 'vanitha-logistics-super-secret-jwt-key-2024';
    console.log('🔑 JWT Secret:', secret.substring(0, 10) + '...');
    console.log('📝 JWT Payload:', payload);

    const token = jwt.sign(payload, secret, { expiresIn: '24h' });
    console.log('✅ Created JWT token:', token.substring(0, 50) + '...');

    // Step 3: Verify the token
    try {
      const decoded = jwt.verify(token, secret);
      console.log('✅ JWT verification successful:', decoded);
    } catch (error) {
      console.log('❌ JWT verification failed:', error.message);
    }

    // Step 4: Test the token with a simple API call
    console.log('\n🔍 Testing token with API...');
    
    const response = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📊 Auth Verify API Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Auth Verify API Success:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ Auth Verify API Error:', errorData);
    }

    // Step 5: Test admin clients API with detailed error
    console.log('\n🔍 Testing admin clients API with detailed error...');
    
    const clientsResponse = await fetch('http://localhost:3000/api/admin/clients', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📊 Clients API Response Status:', clientsResponse.status);
    console.log('📊 Clients API Response Headers:', Object.fromEntries(clientsResponse.headers.entries()));
    
    const responseText = await clientsResponse.text();
    console.log('📊 Clients API Response Body:', responseText);

    if (clientsResponse.ok) {
      const clientsData = JSON.parse(responseText);
      console.log('✅ Clients API Success - Found', clientsData.clients?.length || 0, 'clients');
    } else {
      console.log('❌ Clients API Error:', responseText);
    }

    console.log('\n🎉 Authentication debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugAuth()
  .then(() => {
    console.log('\n✅ Debug completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });
