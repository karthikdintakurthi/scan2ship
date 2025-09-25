const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCatalogLogin() {
  try {
    console.log('🔍 Testing catalog login...');
    
    // Get the first client
    const client = await prisma.clients.findFirst({
      select: { id: true, name: true, companyName: true }
    });
    
    if (!client) {
      console.error('❌ No clients found in database');
      return;
    }
    
    console.log('📋 Using client:', client.name, `(${client.id})`);
    
    // Test catalog login
    const catalogUrl = process.env.CATALOG_APP_URL || 'https://www.stockmind.in';
    console.log('🌐 Catalog URL:', catalogUrl);
    
    const loginData = {
      email: 'vanithafashionjewellery.usa@gmail.com',
      password: 'password123' // You'll need to provide the correct password
    };
    
    console.log('🔐 Attempting login with email:', loginData.email);
    
    const response = await fetch(`${catalogUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Login failed:', error);
      return;
    }
    
    const authData = await response.json();
    console.log('✅ Login successful!');
    console.log('🎫 Token received:', authData.token ? 'Yes' : 'No');
    console.log('👤 User data:', authData.user ? 'Yes' : 'No');
    
    if (authData.user) {
      console.log('👤 User details:', {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.role,
        clientId: authData.user.clientId
      });
    }
    
    // Store the token in database
    console.log('💾 Storing token in database...');
    
    await prisma.client_config.upsert({
      where: {
        clientId_key: {
          clientId: client.id,
          key: 'catalog_auth_token'
        }
      },
      update: {
        value: authData.token,
        type: 'string',
        category: 'catalog',
        description: 'Catalog app authentication token',
        isEncrypted: true,
        updatedAt: new Date()
      },
      create: {
        id: `catalog_auth_${client.id}_${Date.now()}`,
        clientId: client.id,
        key: 'catalog_auth_token',
        value: authData.token,
        type: 'string',
        category: 'catalog',
        description: 'Catalog app authentication token',
        isEncrypted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Token stored successfully!');
    
    // Verify storage
    const storedConfig = await prisma.client_config.findUnique({
      where: {
        clientId_key: {
          clientId: client.id,
          key: 'catalog_auth_token'
        }
      }
    });
    
    console.log('🔍 Verification - Token stored:', !!storedConfig);
    console.log('🔍 Verification - Token value length:', storedConfig?.value?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCatalogLogin();
