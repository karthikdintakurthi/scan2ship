const { PrismaClient } = require('@prisma/client');

const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

async function fixCrossAppMapping() {
  console.log('🔧 Fixing Cross-App Mapping...\n');

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

    // Get karthik@scan2ship.in user
    console.log('1. Getting karthik@scan2ship.in user...');
    const user = await qaPrisma.users.findFirst({
      where: { email: 'karthik@scan2ship.in' },
      select: {
        id: true,
        email: true,
        clientId: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`User Client ID: "${user.clientId}"`);

    // Get existing cross-app mapping
    console.log('\n2. Getting existing cross-app mapping...');
    const existingMapping = await qaPrisma.cross_app_mappings.findFirst({
      where: { isActive: true }
    });

    if (!existingMapping) {
      console.log('❌ No existing mapping found');
      return;
    }

    console.log('Existing mapping:');
    console.log(`   ID: ${existingMapping.id}`);
    console.log(`   Scan2Ship Client ID: "${existingMapping.scan2shipClientId}"`);
    console.log(`   Catalog Client ID: "${existingMapping.catalogClientId}"`);
    console.log(`   API Key: ${existingMapping.catalogApiKey ? 'Present' : 'Missing'}`);

    // Update the mapping to use the user's client ID
    console.log('\n3. Updating mapping to use user client ID...');
    const updatedMapping = await qaPrisma.cross_app_mappings.update({
      where: { id: existingMapping.id },
      data: {
        scan2shipClientId: user.clientId
      }
    });

    console.log('✅ Mapping updated successfully');
    console.log(`   New Scan2Ship Client ID: "${updatedMapping.scan2shipClientId}"`);
    console.log(`   Catalog Client ID: "${updatedMapping.catalogClientId}"`);
    console.log(`   API Key: ${updatedMapping.catalogApiKey ? 'Present' : 'Missing'}`);

    // Verify the fix
    console.log('\n4. Verifying fix...');
    const verifyMapping = await qaPrisma.cross_app_mappings.findFirst({
      where: {
        scan2shipClientId: user.clientId,
        isActive: true
      }
    });

    if (verifyMapping) {
      console.log('✅ Verification successful!');
      console.log(`   Found mapping for client: "${user.clientId}"`);
      console.log(`   Mapping ID: ${verifyMapping.id}`);
      console.log(`   Catalog Client ID: "${verifyMapping.catalogClientId}"`);
      console.log(`   API Key: ${verifyMapping.catalogApiKey ? 'Present' : 'Missing'}`);
      
      console.log('\n🎉 Cross-app mapping fixed!');
      console.log('The catalog integration should now work correctly.');
    } else {
      console.log('❌ Verification failed - mapping not found');
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await qaPrisma.$disconnect();
  }
}

fixCrossAppMapping();
