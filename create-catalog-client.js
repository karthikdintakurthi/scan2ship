#!/usr/bin/env node

/**
 * Create a client in the catalog app to match the scan2ship client
 */

// Using built-in fetch (Node.js 18+)

async function createCatalogClient() {
  console.log('🔧 Creating client in catalog app...\n');

  try {
    // First, let's try to create a client using the catalog app's admin API
    const catalogAppUrl = 'https://www.stockmind.in';
    
    // Try to create a client with the same slug
    const clientData = {
      name: 'Yoshita Fashion Jewellery',
      slug: 'yoshita-fashion-jewellery',
      companyName: 'Yoshita Fashion Jewellery',
      isActive: true,
      subscriptionStatus: 'active'
    };

    console.log('📡 Attempting to create client in catalog app...');
    console.log('Client data:', JSON.stringify(clientData, null, 2));

    // Try different endpoints
    const endpoints = [
      '/api/admin/clients',
      '/api/clients',
      '/api/public/clients',
      '/api/auth/register-client'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Trying endpoint: ${endpoint}`);
        const response = await fetch(`${catalogAppUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData),
        });

        console.log(`Status: ${response.status}`);
        const result = await response.text();
        console.log(`Response: ${result.substring(0, 200)}...`);
        
        if (response.ok) {
          console.log(`✅ Successfully created client via ${endpoint}`);
          return;
        }
      } catch (error) {
        console.log(`❌ Error with ${endpoint}:`, error.message);
      }
    }

    console.log('\n⚠️ Could not create client via API endpoints');
    console.log('📋 Manual steps required:');
    console.log('1. Log into catalog app admin panel');
    console.log('2. Create a client with slug: yoshita-fashion-jewellery');
    console.log('3. Ensure the client is active');
    console.log('4. Note the client ID for cross-app mapping');

  } catch (error) {
    console.error('❌ Error creating catalog client:', error);
  }
}

// Run the script
createCatalogClient();
