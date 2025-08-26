const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testMasterAdmin() {
  try {
    console.log('🧪 Testing Master Admin access...');

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
    const token = jwt.sign(
      { 
        userId: masterAdmin.id, 
        clientId: masterAdmin.clientId,
        email: masterAdmin.email,
        role: masterAdmin.role 
      },
      'vanitha-logistics-super-secret-jwt-key-2024',
      { expiresIn: '24h' }
    );

    console.log('✅ Created test JWT token');

    // Step 3: Test admin clients API
    console.log('\n🔍 Testing admin clients API...');
    
    const clientsResponse = await fetch('http://localhost:3000/api/admin/clients', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📊 Clients API Response Status:', clientsResponse.status);
    
    if (clientsResponse.ok) {
      const clientsData = await clientsResponse.json();
      console.log('✅ Clients API Success - Found', clientsData.clients?.length || 0, 'clients');
    } else {
      const errorData = await clientsResponse.text();
      console.log('❌ Clients API Error:', errorData);
    }

    // Step 4: Test system config API
    console.log('\n🔍 Testing system config API...');
    
    const configResponse = await fetch('http://localhost:3000/api/admin/system-config', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📊 System Config API Response Status:', configResponse.status);
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ System Config API Success - Found', configData.configs?.length || 0, 'configs');
    } else {
      const errorData = await configResponse.text();
      console.log('❌ System Config API Error:', errorData);
    }

    // Step 5: Test client settings API (if there are clients)
    const clients = await prisma.client.findMany({
      take: 1
    });

    if (clients.length > 0) {
      console.log('\n🔍 Testing client settings API...');
      
      const clientSettingsResponse = await fetch(`http://localhost:3000/api/admin/settings/clients/${clients[0].id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📊 Client Settings API Response Status:', clientSettingsResponse.status);
      
      if (clientSettingsResponse.ok) {
        const settingsData = await clientSettingsResponse.json();
        console.log('✅ Client Settings API Success');
        console.log('   Client:', settingsData.config?.client?.companyName);
        console.log('   Configs:', settingsData.config?.configs?.length || 0);
        console.log('   Pickup Locations:', settingsData.config?.pickupLocations?.length || 0);
        console.log('   Courier Services:', settingsData.config?.courierServices?.length || 0);
      } else {
        const errorData = await clientSettingsResponse.text();
        console.log('❌ Client Settings API Error:', errorData);
      }
    }

    console.log('\n🎉 Master Admin API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMasterAdmin()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
