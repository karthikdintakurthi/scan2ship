const { PrismaClient } = require('@prisma/client');

const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

async function createApiKeysTableQA() {
  console.log('🔧 Creating api_keys table in QA database...\n');

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

    // Create api_keys table
    console.log('1. Creating api_keys table...');
    await qaPrisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        secret TEXT,
        "clientId" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        permissions TEXT[] DEFAULT '{}',
        "lastUsedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ api_keys table created');

    // Create index for better performance
    console.log('2. Creating indexes...');
    await qaPrisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys("clientId")
    `;
    await qaPrisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)
    `;
    console.log('✅ Indexes created');

    // Get the cross-app mapping to find the client ID
    console.log('3. Getting cross-app mapping details...');
    const mapping = await qaPrisma.cross_app_mappings.findFirst({
      where: { isActive: true },
      include: {
        scan2shipClient: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      }
    });

    if (!mapping) {
      console.log('❌ No active cross-app mapping found');
      return;
    }

    console.log(`Found mapping: ${mapping.scan2shipClient?.name}`);
    console.log(`Catalog Client ID: ${mapping.catalogClientId}`);
    console.log(`API Key: ***${mapping.catalogApiKey.slice(-4)}`);

    // Create the API key record
    console.log('4. Creating API key record...');
    const apiKeyId = `api-key-${Date.now()}`;
    
    await qaPrisma.$executeRaw`
      INSERT INTO api_keys (
        id, name, key, "clientId", "isActive", 
        permissions, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name,
        "clientId" = EXCLUDED."clientId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = CURRENT_TIMESTAMP
    `, [
      apiKeyId,
      `API Key for ${mapping.scan2shipClient?.name}`,
      mapping.catalogApiKey,
      mapping.catalogClientId,
      true,
      '["read", "write"]'
    ];

    console.log('✅ API key record created');

    // Verify the API key was created
    console.log('5. Verifying API key...');
    const createdApiKey = await qaPrisma.$queryRaw`
      SELECT id, name, key, "clientId", "isActive" 
      FROM api_keys 
      WHERE key = $1
    `, [mapping.catalogApiKey];

    if (createdApiKey.length > 0) {
      console.log('✅ API key verification successful:');
      console.log(`   ID: ${createdApiKey[0].id}`);
      console.log(`   Name: ${createdApiKey[0].name}`);
      console.log(`   Key: ***${createdApiKey[0].key.slice(-4)}`);
      console.log(`   Client ID: ${createdApiKey[0].clientId}`);
      console.log(`   Active: ${createdApiKey[0].isActive}`);
    } else {
      console.log('❌ API key verification failed');
    }

    console.log('\n🎉 API keys table setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the catalog API again in QA');
    console.log('2. Verify product search works');
    console.log('3. Check that the 500 error is resolved');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code
    });
  } finally {
    await qaPrisma.$disconnect();
  }
}

createApiKeysTableQA();
