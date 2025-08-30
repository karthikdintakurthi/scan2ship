const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function removeOldIndex() {
  try {
    console.log('🚀 Starting removal of old unique index...');
    
    // Check current indexes
    console.log('🔍 Checking current indexes...');
    const indexes = await prisma.$queryRaw`
      SELECT 
        indexname as index_name,
        indexdef as index_definition
      FROM pg_indexes 
      WHERE tablename = 'pickup_locations'
      AND indexdef LIKE '%UNIQUE%'
    `;
    
    console.log('📊 Current unique indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.index_name}: ${index.index_definition}`);
    });
    
    // Remove the old unique index on (value, clientId)
    console.log('\n🗑️  Removing old unique index on (value, clientId)...');
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "pickup_locations_value_clientId_key"`);
    console.log('✅ Old index removed successfully');
    
    // Verify the final state
    console.log('\n🔍 Verifying final indexes...');
    const finalIndexes = await prisma.$queryRaw`
      SELECT 
        indexname as index_name,
        indexdef as index_definition
      FROM pg_indexes 
      WHERE tablename = 'pickup_locations'
      AND indexdef LIKE '%UNIQUE%'
    `;
    
    console.log('📊 Final unique indexes:');
    finalIndexes.forEach(index => {
      console.log(`  - ${index.index_name}: ${index.index_definition}`);
    });
    
    console.log('\n🎉 Old index removal completed successfully!');
    console.log('📊 Pickup locations can now have the same value but different names per client');
    
  } catch (error) {
    console.error('❌ Old index removal failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the removal
removeOldIndex()
  .then(() => {
    console.log('✅ Old index removal script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Old index removal script failed:', error);
    process.exit(1);
  });
