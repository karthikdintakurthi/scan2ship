const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixProductionConstraints() {
  try {
    console.log('🚀 Starting production constraint fix...');
    
    // First, let's check what constraints actually exist
    console.log('🔍 Checking current constraints...');
    const constraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'pickup_locations'::regclass
      AND contype = 'u'
    `;
    
    console.log('📊 Current unique constraints:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    // Drop ALL unique constraints on pickup_locations
    console.log('\n🗑️  Dropping all unique constraints...');
    for (const constraint of constraints) {
      console.log(`  - Dropping: ${constraint.constraint_name}`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "pickup_locations" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`);
    }
    
    // Now add only the constraint we want: unique on (label, clientId)
    console.log('\n✅ Adding new constraint: unique on (label, clientId)...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_label_clientId_key" UNIQUE ("label", "clientId")`);
    
    // Verify the final state
    console.log('\n🔍 Verifying final constraints...');
    const finalConstraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'pickup_locations'::regclass
      AND contype = 'u'
    `;
    
    console.log('📊 Final unique constraints:');
    finalConstraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    console.log('\n🎉 Production constraint fix completed successfully!');
    console.log('📊 Pickup locations can now have the same value but different names per client');
    
  } catch (error) {
    console.error('❌ Production constraint fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixProductionConstraints()
  .then(() => {
    console.log('✅ Production constraint fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Production constraint fix script failed:', error);
    process.exit(1);
  });
