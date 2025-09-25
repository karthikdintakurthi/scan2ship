const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCatalogSessionFlow() {
  try {
    console.log('🔍 Testing complete catalog session flow...');
    
    // Get a test client
    const client = await prisma.clients.findFirst({
      select: { id: true, name: true, companyName: true }
    });
    
    if (!client) {
      console.error('❌ No clients found in database');
      return;
    }
    
    console.log('📋 Using client:', client.name, `(${client.id})`);
    
    // Step 1: Test catalog authentication
    console.log('\\n🔐 Step 1: Testing catalog authentication...');
    
    const authResponse = await fetch('http://localhost:3001/api/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You'll need to provide a valid scan2ship token
      },
      body: JSON.stringify({
        action: 'authenticate',
        data: {
          email: 'vanithafashionjewellery.usa@gmail.com',
          password: 'password123' // You'll need to provide the correct password
        }
      })
    });
    
    console.log('📡 Auth response status:', authResponse.status);
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      console.error('❌ Auth failed:', error);
      return;
    }
    
    const authData = await authResponse.json();
    console.log('✅ Auth successful:', authData.message);
    
    // Step 2: Check if session was stored
    console.log('\\n💾 Step 2: Checking stored session...');
    
    const session = await prisma.catalog_sessions.findFirst({
      where: {
        scan2shipClientId: client.id,
        isActive: true
      }
    });
    
    if (session) {
      console.log('✅ Session stored successfully:');
      console.log('  - Catalog Client ID:', session.catalogClientId);
      console.log('  - Catalog User ID:', session.catalogUserId);
      console.log('  - Catalog User Email:', session.catalogUserEmail);
      console.log('  - Token expires at:', session.tokenExpiresAt);
      console.log('  - Last used at:', session.lastUsedAt);
    } else {
      console.log('❌ No active session found');
      return;
    }
    
    // Step 3: Test product search using stored session
    console.log('\\n🔍 Step 3: Testing product search with stored session...');
    
    const searchResponse = await fetch('http://localhost:3001/api/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You'll need to provide a valid scan2ship token
      },
      body: JSON.stringify({
        action: 'search_products',
        data: {
          query: 'hair',
          page: 1,
          limit: 20
        }
      })
    });
    
    console.log('📡 Search response status:', searchResponse.status);
    
    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error('❌ Search failed:', error);
      return;
    }
    
    const searchData = await searchResponse.json();
    console.log('✅ Search successful:');
    console.log('  - Products found:', searchData.products?.length || 0);
    console.log('  - Pagination:', searchData.pagination);
    
    if (searchData.products && searchData.products.length > 0) {
      console.log('  - First product:', {
        sku: searchData.products[0].sku,
        name: searchData.products[0].name,
        price: searchData.products[0].price,
        stockLevel: searchData.products[0].stockLevel,
        allowPreorder: searchData.products[0].allowPreorder
      });
    }
    
    // Step 4: Test logout
    console.log('\\n🚪 Step 4: Testing logout...');
    
    const logoutResponse = await fetch('http://localhost:3001/api/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You'll need to provide a valid scan2ship token
      },
      body: JSON.stringify({
        action: 'logout',
        data: {}
      })
    });
    
    console.log('📡 Logout response status:', logoutResponse.status);
    
    if (!logoutResponse.ok) {
      const error = await logoutResponse.text();
      console.error('❌ Logout failed:', error);
      return;
    }
    
    const logoutData = await logoutResponse.json();
    console.log('✅ Logout successful:', logoutData.message);
    
    // Step 5: Verify session was invalidated
    console.log('\\n🔍 Step 5: Verifying session invalidation...');
    
    const invalidatedSession = await prisma.catalog_sessions.findFirst({
      where: {
        scan2shipClientId: client.id,
        isActive: true
      }
    });
    
    if (!invalidatedSession) {
      console.log('✅ Session successfully invalidated');
    } else {
      console.log('❌ Session still active after logout');
    }
    
    console.log('\\n🎉 Complete flow test finished!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCatalogSessionFlow();
