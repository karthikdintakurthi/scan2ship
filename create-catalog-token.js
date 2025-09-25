const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function createCatalogToken() {
  try {
    console.log('🔍 Creating catalog token for scan2ship client...');
    
    // Use the Scan2Ship client
    const client = await prisma.clients.findUnique({
      where: { id: 'master-client-1756272680179' },
      select: { id: true, name: true, companyName: true }
    });
    
    if (!client) {
      console.error('❌ Scan2Ship client not found');
      return;
    }
    
    console.log('📋 Using client:', client.name, `(${client.id})`);
    
    // Create a JWT token for this client
    const secret = '767a7d7bc8758adc1740fd802a45ac747a1319d84e90a1d24791b58a16c77eec';
    const payload = {
      userId: 'scan2ship-user-001',
      email: 'karthik@scan2ship.in',
      role: 'ADMIN',
      clientId: client.id,
      clientSlug: 'scan2ship'
    };
    
    const token = jwt.sign(payload, secret, {
      expiresIn: '8h',
      issuer: 'vanitha-logistics',
      audience: 'vanitha-logistics-users',
      algorithm: 'HS256'
    });
    
    console.log('🎫 Created JWT token for client:', client.id);
    console.log('🎫 Token length:', token.length);
    
    // Store the token in database
    await prisma.client_config.upsert({
      where: {
        clientId_key: {
          clientId: client.id,
          key: 'catalog_auth_token'
        }
      },
      update: {
        value: token,
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
        value: token,
        type: 'string',
        category: 'catalog',
        description: 'Catalog app authentication token',
        isEncrypted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Token stored successfully!');
    
    // Test the token by making a product search
    console.log('🔍 Testing product search with new token...');
    
    const catalogUrl = process.env.CATALOG_APP_URL || 'https://www.stockmind.in';
    const searchParams = new URLSearchParams({
      search: 'hair',
      page: '1',
      limit: '20',
    });
    
    const url = `${catalogUrl}/api/products?${searchParams}`;
    console.log('🌐 Searching products with URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Search failed:', error);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Search successful!');
    console.log('📊 Products found:', data.products?.length || 0);
    console.log('📄 Pagination:', data.pagination);
    
    if (data.products && data.products.length > 0) {
      console.log('🎯 First product:', {
        sku: data.products[0].sku,
        name: data.products[0].name,
        price: data.products[0].price,
        stockLevel: data.products[0].stockLevel,
        allowPreorder: data.products[0].allowPreorder
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createCatalogToken();
