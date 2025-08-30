const { PrismaClient } = require('@prisma/client');

async function fixSchemaMismatch() {
  console.log('🔧 Fixing Schema Mismatch Issues...');
  
  try {
    const prisma = new PrismaClient();
    
    // Check if we can connect
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Issue 1: Check if the enhanced fields exist in the actual database
    console.log('\n📋 Checking if enhanced fields exist in database...');
    
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' 
        AND column_name IN ('clientName', 'utrNumber', 'screenshotFileName', 'screenshotFileSize', 'screenshotFileType');
      `;
      
      console.log('📊 Existing enhanced columns:', columns);
      
      if (columns.length === 0) {
        console.log('⚠️ Enhanced columns not found. Database needs migration.');
        console.log('💡 Run: npx prisma migrate dev --name enhance_credit_transactions');
      }
      
    } catch (error) {
      console.log('❌ Could not check columns:', error.message);
    }
    
    // Issue 2: Check foreign key constraint names
    console.log('\n🔗 Checking foreign key constraints...');
    
    try {
      const constraints = await prisma.$queryRaw`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'credit_transactions';
      `;
      
      console.log('📊 Foreign key constraints:');
      console.table(constraints);
      
      // Check for the specific userId constraint
      const userIdConstraint = constraints.find(c => c.column_name === 'userId');
      if (userIdConstraint) {
        console.log('✅ userId foreign key constraint found:', userIdConstraint.constraint_name);
      } else {
        console.log('❌ userId foreign key constraint not found');
      }
      
    } catch (error) {
      console.log('❌ Could not check constraints:', error.message);
    }
    
    // Issue 3: Test transaction creation without userId (the current approach)
    console.log('\n🧪 Testing transaction creation without userId...');
    
    try {
      const testTransaction = await prisma.credit_transactions.create({
        data: {
          id: `test-${Date.now()}`,
          clientId: 'test-client-id',
          clientName: 'Test Client',
          type: 'ADD',
          amount: 100,
          balance: 100,
          description: 'Test transaction without userId',
          feature: 'MANUAL'
          // Note: userId is intentionally omitted
        }
      });
      
      console.log('✅ Test transaction created successfully:', testTransaction.id);
      
      // Clean up
      await prisma.credit_transactions.delete({
        where: { id: testTransaction.id }
      });
      console.log('🧹 Test transaction cleaned up');
      
    } catch (error) {
      console.log('❌ Error creating test transaction:');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      
      if (error.code === 'P2003') {
        console.log('\n🔍 Foreign key constraint violation detected!');
        console.log('Possible solutions:');
        console.log('1. Check if clientId exists in clients table');
        console.log('2. Verify data types match between tables');
        console.log('3. Run database migration if schema is out of sync');
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
  }
}

// Quick fixes for common issues
console.log('🚀 Quick Fixes for Schema Mismatch:');
console.log('');
console.log('1. 🔄 Reset Prisma Client:');
console.log('   npx prisma generate');
console.log('');
console.log('2. 🗄️ Check Database Sync:');
console.log('   npx prisma db pull');
console.log('');
console.log('3. 📊 Run Migration:');
console.log('   npx prisma migrate dev --name fix_schema_mismatch');
console.log('');
console.log('4. 🧹 Reset Database (WARNING: Destructive):');
console.log('   npx prisma migrate reset');
console.log('');

// Run the diagnostic
fixSchemaMismatch();
