const { PrismaClient } = require('@prisma/client');

// QA Environment Configuration
const QA_DATABASE_URL = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;

async function verifyQAMigration() {
  console.log('🔍 Verifying QA Migration...\n');

  if (!QA_DATABASE_URL) {
    console.error('❌ QA_DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const qaPrisma = new PrismaClient({
    datasources: {
      db: {
        url: QA_DATABASE_URL
      }
    }
  });

  try {
    // Test connection
    console.log('🔌 Testing QA database connection...');
    await qaPrisma.$connect();
    console.log('✅ QA database connection successful');

    // Check cross_app_mappings table
    console.log('\n📋 Checking cross_app_mappings table...');
    try {
      const mappings = await qaPrisma.cross_app_mappings.findMany({
        include: {
          scan2shipClient: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true,
              isActive: true
            }
          }
        }
      });

      console.log(`✅ Found ${mappings.length} cross-app mappings:`);
      mappings.forEach((mapping, index) => {
        console.log(`   ${index + 1}. ${mapping.scan2shipClient?.name || 'Unknown Client'}`);
        console.log(`      - Scan2Ship Client ID: ${mapping.scan2shipClientId}`);
        console.log(`      - Catalog Client ID: ${mapping.catalogClientId}`);
        console.log(`      - API Key: ${mapping.catalogApiKey ? '***' + mapping.catalogApiKey.slice(-4) : 'undefined'}`);
        console.log(`      - Active: ${mapping.isActive}`);
        console.log(`      - Created: ${mapping.createdAt}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ cross_app_mappings table check failed:', error.message);
    }

    // Check clients table
    console.log('👥 Checking clients table...');
    try {
      const clients = await qaPrisma.clients.findMany({
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          isActive: true
        },
        take: 5
      });

      console.log(`✅ Found ${clients.length} clients (showing first 5):`);
      clients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.name} (${client.companyName})`);
        console.log(`      - ID: ${client.id}`);
        console.log(`      - Email: ${client.email}`);
        console.log(`      - Active: ${client.isActive}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ clients table check failed:', error.message);
    }

    // Check users table
    console.log('👤 Checking users table...');
    try {
      const users = await qaPrisma.users.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          clientId: true
        },
        take: 5
      });

      console.log(`✅ Found ${users.length} users (showing first 5):`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email})`);
        console.log(`      - Role: ${user.role}`);
        console.log(`      - Client ID: ${user.clientId}`);
        console.log(`      - Active: ${user.isActive}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ users table check failed:', error.message);
    }

    // Test cross-app mapping functionality
    console.log('🔗 Testing cross-app mapping functionality...');
    try {
      const testMapping = await qaPrisma.cross_app_mappings.findFirst({
        where: { isActive: true },
        include: {
          scan2shipClient: {
            select: { name: true }
          }
        }
      });

      if (testMapping) {
        console.log('✅ Cross-app mapping functionality test passed');
        console.log(`   Test mapping: ${testMapping.scan2shipClient?.name} -> ${testMapping.catalogClientId}`);
      } else {
        console.log('⚠️  No active cross-app mappings found');
      }

    } catch (error) {
      console.error('❌ Cross-app mapping functionality test failed:', error.message);
    }

    console.log('\n🎉 QA Migration verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await qaPrisma.$disconnect();
  }
}

verifyQAMigration();
