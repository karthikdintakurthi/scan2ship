const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testProductSearch() {
  try {
    console.log('🔍 Testing product search...');
    
    // Get the client with stored catalog auth
    const client = await prisma.clients.findFirst({
      select: { id: true, name: true, companyName: true }
    });
    
    if (!client) {
      console.error('❌ No clients found in database');
      return;
    }
    
    console.log('📋 Using client:', client.name, `(${client.id})`);
    
    // Get the stored catalog auth token
    const authConfig = await prisma.client_config.findUnique({
      where: {
        clientId_key: {
          clientId: client.id,
          key: 'catalog_auth_token'
        }
      }
    });
    
    if (!authConfig) {
      console.error('❌ No catalog auth token found for client');
      return;
    }
    
    console.log('🎫 Found stored token, length:', authConfig.value.length);
    
    // Test product search
    const catalogUrl = process.env.CATALOG_APP_URL || 'https://www.stockmind.in';
    const searchQuery = 'hair';
    const page = 1;
    const limit = 20;
    
    const searchParams = new URLSearchParams({
      search: searchQuery,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const url = `${catalogUrl}/api/products?${searchParams}`;
    console.log('🌐 Searching products with URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authConfig.value}`,
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
        allowPreorder: data.products[0].allowPreorder,
        hasImages: !!data.products[0].images,
        hasVideos: !!data.products[0].videos,
        thumbnailUrl: data.products[0].thumbnailUrl
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testProductSearch();
