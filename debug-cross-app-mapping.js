const { PrismaClient } = require('@prisma/client');

const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

async function debugCrossAppMapping() {
  console.log('🔍 Debugging Cross-App Mapping...\n');

  const qaPrisma = new PrismaClient({
    datasources: {
      db: {
        url: QA_DATABASE_URL
      }
    }
  });

  try {
    await qaPrisma.$connect();
    console.log('✅ Connected to QA database');

    // Check karthik@scan2ship.in user
    console.log('1. Checking karthik@scan2ship.in user...');
    const user = await qaPrisma.users.findFirst({
      where: { email: 'karthik@scan2ship.in' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clientId: true
      }
    });

    if (user) {
      console.log('User details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Client ID: "${user.clientId}"`);
    } else {
      console.log('❌ User not found');
      return;
    }

    // Check cross-app mappings
    console.log('\n2. Checking cross-app mappings...');
    const mappings = await qaPrisma.cross_app_mappings.findMany({
      select: {
        id: true,
        scan2shipClientId: true,
        catalogClientId: true,
        catalogApiKey: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`Found ${mappings.length} cross-app mappings:`);
    mappings.forEach((mapping, index) => {
      console.log(`   ${index + 1}. ID: ${mapping.id}`);
      console.log(`      Scan2Ship Client ID: "${mapping.scan2shipClientId}"`);
      console.log(`      Catalog Client ID: "${mapping.catalogClientId}"`);
      console.log(`      API Key: ${mapping.catalogApiKey ? 'Present' : 'Missing'}`);
      console.log(`      Active: ${mapping.isActive}`);
      console.log(`      Created: ${mapping.createdAt}`);
      console.log('');
    });

    // Check if user's client ID matches any mapping
    console.log('3. Checking if user client ID matches any mapping...');
    const userClientId = user.clientId;
    const matchingMapping = mappings.find(mapping => 
      mapping.scan2shipClientId === userClientId && mapping.isActive
    );

    if (matchingMapping) {
      console.log('✅ Found matching active mapping:');
      console.log(`   Mapping ID: ${matchingMapping.id}`);
      console.log(`   Scan2Ship Client ID: "${matchingMapping.scan2shipClientId}"`);
      console.log(`   Catalog Client ID: "${matchingMapping.catalogClientId}"`);
      console.log(`   API Key: ${matchingMapping.catalogApiKey ? 'Present' : 'Missing'}`);
    } else {
      console.log('❌ No matching active mapping found');
      console.log(`   User Client ID: "${userClientId}"`);
      console.log('   Available Scan2Ship Client IDs:');
      mappings.forEach((mapping, index) => {
        console.log(`      ${index + 1}. "${mapping.scan2shipClientId}" (Active: ${mapping.isActive})`);
      });
    }

    // Check if there are any clients with the user's client ID
    console.log('\n4. Checking clients table...');
    const clients = await qaPrisma.clients.findMany({
      where: { id: userClientId },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    if (clients.length > 0) {
      console.log('✅ Found client in clients table:');
      clients.forEach(client => {
        console.log(`   ID: "${client.id}"`);
        console.log(`   Name: "${client.name}"`);
        console.log(`   Active: ${client.isActive}`);
      });
    } else {
      console.log('❌ Client not found in clients table');
      console.log(`   Looking for client ID: "${userClientId}"`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await qaPrisma.$disconnect();
  }
}

debugCrossAppMapping();
