const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkAllConstraints() {
  try {
    console.log('🔍 Checking ALL constraints on pickup_locations table...');
    
    // Check unique constraints
    const uniqueConstraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition,
        'unique' as constraint_type
      FROM pg_constraint 
      WHERE conrelid = 'pickup_locations'::regclass
      AND contype = 'u'
    `;
    
    // Check check constraints
    const checkConstraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition,
        'check' as constraint_type
      FROM pg_constraint 
      WHERE conrelid = 'pickup_locations'::regclass
      AND contype = 'c'
    `;
    
    // Check not null constraints
    const notNullConstraints = await prisma.$queryRaw`
      SELECT 
        column_name as constraint_name,
        'NOT NULL on ' || column_name as constraint_definition,
        'not_null' as constraint_type
      FROM information_schema.columns 
      WHERE table_name = 'pickup_locations'
      AND is_nullable = 'NO'
    `;
    
    // Check primary key
    const primaryKeyConstraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition,
        'primary_key' as constraint_type
      FROM pg_constraint 
      WHERE conrelid = 'pickup_locations'::regclass
      AND contype = 'p'
    `;
    
    // Check foreign key constraints
    const foreignKeyConstraints = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition,
        'foreign_key' as constraint_type
      FROM pg_constraint 
      WHERE conrelid = 'pickup_locations'::regclass
      AND contype = 'f'
    `;
    
    console.log('📊 Unique Constraints:');
    uniqueConstraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    console.log('\n📊 Check Constraints:');
    checkConstraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    console.log('\n📊 Not Null Constraints:');
    notNullConstraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    console.log('\n📊 Primary Key Constraints:');
    primaryKeyConstraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    console.log('\n📊 Foreign Key Constraints:');
    foreignKeyConstraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    // Also check if there are any indexes that might be enforcing uniqueness
    const indexes = await prisma.$queryRaw`
      SELECT 
        indexname as index_name,
        indexdef as index_definition
      FROM pg_indexes 
      WHERE tablename = 'pickup_locations'
      AND indexdef LIKE '%UNIQUE%'
    `;
    
    console.log('\n📊 Unique Indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.index_name}: ${index.index_definition}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAllConstraints()
  .then(() => {
    console.log('✅ All constraints check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ All constraints check failed:', error);
    process.exit(1);
  });
