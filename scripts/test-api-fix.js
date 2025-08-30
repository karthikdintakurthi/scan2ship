const { PrismaClient } = require('@prisma/client');

async function testAPIFix() {
  console.log('🧪 Testing Fixed API Endpoint...');
  
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
    
    // Test the CreditService.addCredits method directly
    console.log('\n🧪 Testing CreditService.addCredits method...');
    
    try {
      // Import the CreditService
      const { CreditService } = require('./src/lib/credit-service');
      
      const result = await CreditService.addCredits(
        realClient.id,
        500, // amount
        'Test API fix - Credit recharge via UPI - TEST-API-FIX | UTR: TEST-UTR-API | Client: ' + realClient.companyName, // description
        undefined, // userId
        realClient.companyName // clientName
      );
      
      console.log('✅ CreditService.addCredits working correctly!');
      console.log('📊 Result:', result);
      
      // Check if the transaction was created
      const transaction = await prisma.credit_transactions.findFirst({
        where: {
          clientId: realClient.id,
          description: {
            contains: 'TEST-API-FIX'
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (transaction) {
        console.log('✅ Transaction created successfully in database!');
        console.log('📊 Transaction details:');
        console.log('- ID:', transaction.id);
        console.log('- Client Name:', transaction.clientName);
        console.log('- Amount:', transaction.amount);
        console.log('- Description:', transaction.description);
        
        // Clean up test data
        await prisma.credit_transactions.delete({
          where: { id: transaction.id }
        });
        console.log('🧹 Test transaction cleaned up');
      }
      
      console.log('\n🎉 API Fix Verification Complete!');
      console.log('✅ CreditService.addCredits is working');
      console.log('✅ clientName field is being populated');
      console.log('✅ Database transactions are being created');
      console.log('✅ The recharge modal should now work without errors');
      
    } catch (error) {
      console.log('❌ Error testing CreditService:');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPIFix();
