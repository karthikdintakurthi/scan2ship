const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkConstraints() {
  try {
    console.log('🔍 Checking pickup_locations table constraints...');
    
    // Check current constraints
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
    
    // Check table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pickup_locations'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Table structure:');
    columns.forEach(column => {
      console.log(`  - ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
    });
    
    // Check if there are any existing data conflicts
    const duplicateLabels = await prisma.$queryRaw`
      SELECT "label", "clientId", COUNT(*) as count
      FROM "pickup_locations"
      GROUP BY "label", "clientId"
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateLabels.length > 0) {
      console.log('\n⚠️  Found duplicate labels per client:');
      duplicateLabels.forEach(dup => {
        console.log(`  - Label: "${dup.label}", Client: ${dup.clientId}, Count: ${dup.count}`);
      });
    } else {
      console.log('\n✅ No duplicate labels found');
    }
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkConstraints()
  .then(() => {
    console.log('✅ Constraint check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Constraint check failed:', error);
    process.exit(1);
  });
