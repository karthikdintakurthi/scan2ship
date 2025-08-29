const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🚀 Starting pickup location migration...');
    
    // Drop the existing unique constraint on (value, clientId)
    console.log('📝 Dropping existing unique constraint on (value, clientId)...');
    await prisma.$executeRaw`ALTER TABLE "pickup_locations" DROP CONSTRAINT IF EXISTS "pickup_locations_value_clientId_key"`;
    console.log('✅ Dropped constraint successfully');
    
    // Add a new unique constraint on (label, clientId) to ensure unique names per client
    console.log('📝 Adding new unique constraint on (label, clientId)...');
    await prisma.$executeRaw`ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_label_clientId_key" UNIQUE ("label", "clientId")`;
    console.log('✅ Added new constraint successfully');
    
    console.log('🎉 Migration completed successfully!');
    console.log('📊 Pickup locations can now have the same value but different names per client');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
