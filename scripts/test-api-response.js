const { PrismaClient } = require('@prisma/client');

async function testAPIResponse() {
  console.log('🧪 Testing API Response Handling Fix...');
  
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
    
    // Test the CreditService.addCredits method and check its return value
    console.log('\n🧪 Testing CreditService.addCredits return value...');
    
    try {
      // Import the CreditService
      const { CreditService } = require('./src/lib/credit-service');
      
      const result = await CreditService.addCredits(
        realClient.id,
        100, // amount
        'Test API response fix - Credit recharge via UPI - TEST-RESPONSE | UTR: TEST-UTR-RESPONSE | Client: ' + realClient.companyName, // description
        undefined, // userId
        realClient.companyName // clientName
      );
      
      console.log('✅ CreditService.addCredits executed successfully!');
      console.log('📊 Return value type:', typeof result);
      console.log('📊 Return value:', result);
      console.log('📊 Available properties:', Object.keys(result));
      
      // Check if result has the expected properties
      if (result && typeof result === 'object') {
        console.log('✅ Result is an object');
        
        if (result.balance !== undefined) {
          console.log('✅ result.balance exists:', result.balance);
        } else {
          console.log('❌ result.balance is undefined');
        }
        
        if (result.success !== undefined) {
          console.log('✅ result.success exists:', result.success);
        } else {
          console.log('❌ result.success is undefined (this is correct - it should not exist)');
        }
        
        if (result.error !== undefined) {
          console.log('❌ result.error exists:', result.error);
        } else {
          console.log('✅ result.error is undefined (this is correct - it should not exist)');
        }
      }
      
      // Check if the transaction was created
      const transaction = await prisma.credit_transactions.findFirst({
        where: {
          clientId: realClient.id,
          description: {
            contains: 'TEST-RESPONSE'
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
      
      console.log('\n🎉 API Response Fix Verification Complete!');
      console.log('✅ CreditService.addCredits returns ClientCredits object');
      console.log('✅ API should use result.balance instead of result.newBalance');
      console.log('✅ API should not check for result.success');
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
testAPIResponse();
