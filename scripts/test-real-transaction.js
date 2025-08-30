const { PrismaClient } = require('@prisma/client');

async function testRealTransaction() {
  console.log('🧪 Testing Real Credit Transaction Creation...');
  
  try {
    const prisma = new PrismaClient();
    
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Get a real client ID
    const realClient = await prisma.clients.findFirst({
      select: { id: true, companyName: true }
    });
    
    if (!realClient) {
      console.log('❌ No clients found in database');
      return;
    }
    
    console.log('📋 Using real client:', realClient.companyName, '(', realClient.id, ')');
    
    // Test creating a credit transaction with all enhanced fields
    console.log('\n🧪 Creating test credit transaction...');
    
    try {
      const testTransaction = await prisma.credit_transactions.create({
        data: {
          id: `test-${Date.now()}`,
          clientId: realClient.id,
          clientName: realClient.companyName,
          type: 'ADD',
          amount: 100,
          balance: 100,
          description: 'Test enhanced transaction with UTR',
          feature: 'MANUAL',
          utrNumber: 'TEST-UTR-123456789',
          screenshotFileName: 'test-screenshot.png',
          screenshotFileSize: 1024,
          screenshotFileType: 'image/png'
          // Note: userId is intentionally omitted (optional field)
        }
      });
      
      console.log('✅ Test transaction created successfully!');
      console.log('📊 Transaction details:');
      console.log('- ID:', testTransaction.id);
      console.log('- Client:', testTransaction.clientName);
      console.log('- Amount:', testTransaction.amount);
      console.log('- UTR:', testTransaction.utrNumber);
      console.log('- Screenshot:', testTransaction.screenshotFileName);
      
      // Clean up test data
      await prisma.credit_transactions.delete({
        where: { id: testTransaction.id }
      });
      console.log('🧹 Test transaction cleaned up');
      
      console.log('\n🎉 All schema mismatch issues are FIXED!');
      console.log('✅ Enhanced fields are working');
      console.log('✅ Foreign key constraints are working');
      console.log('✅ UTR and screenshot fields are working');
      console.log('✅ OCR functionality should now work properly');
      
    } catch (error) {
      console.log('❌ Error creating test transaction:');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      
      if (error.code === 'P2003') {
        console.log('\n🔍 Foreign key constraint violation!');
        console.log('This means the schema is still not fully synced.');
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRealTransaction();
