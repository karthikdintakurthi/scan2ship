const { PrismaClient } = require('@prisma/client');

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema...');
  
  try {
    const prisma = new PrismaClient();
    
    // Check if we can connect to the database
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check the actual table structure
    console.log('\n📋 Checking credit_transactions table structure...');
    
    try {
      // Try to get table info using raw SQL
      const tableInfo = await prisma.$queryRaw`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' 
        ORDER BY ordinal_position;
      `;
      
      console.log('📊 credit_transactions table structure:');
      console.table(tableInfo);
      
    } catch (error) {
      console.log('❌ Could not get table structure:', error.message);
    }
    
    // Check users table structure
    console.log('\n📋 Checking users table structure...');
    
    try {
      const usersTableInfo = await prisma.$queryRaw`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position;
      `;
      
      console.log('📊 users table structure:');
      console.table(usersTableInfo);
      
    } catch (error) {
      console.log('❌ Could not get users table structure:', error.message);
    }
    
    // Check foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    
    try {
      const constraints = await prisma.$queryRaw`
        SELECT 
          tc.constraint_name,
          tc.table_name,
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
      
    } catch (error) {
      console.log('❌ Could not get foreign key constraints:', error.message);
    }
    
    // Try to create a test transaction to see the exact error
    console.log('\n🧪 Testing transaction creation...');
    
    try {
      const testTransaction = await prisma.credit_transactions.create({
        data: {
          id: `test-${Date.now()}`,
          clientId: 'test-client-id',
          clientName: 'Test Client',
          type: 'ADD',
          amount: 100,
          balance: 100,
          description: 'Test transaction',
          feature: 'MANUAL'
        }
      });
      
      console.log('✅ Test transaction created successfully:', testTransaction.id);
      
      // Clean up test data
      await prisma.credit_transactions.delete({
        where: { id: testTransaction.id }
      });
      console.log('🧹 Test transaction cleaned up');
      
    } catch (error) {
      console.log('❌ Error creating test transaction:');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Meta:', error.meta);
      
      if (error.code === 'P2003') {
        console.log('\n🔍 Foreign key constraint violation details:');
        console.log('This usually means:');
        console.log('1. The referenced table/column doesn\'t exist');
        console.log('2. Data type mismatch between foreign key and referenced column');
        console.log('3. The referenced record doesn\'t exist');
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

// Run the check
checkDatabaseSchema();
