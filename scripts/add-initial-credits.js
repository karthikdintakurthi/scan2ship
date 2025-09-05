const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addInitialCredits() {
  try {
    console.log('💰 Adding initial credits for test client...');

    // Find the test client
    const testClient = await prisma.clients.findFirst({
      where: {
        companyName: 'Test Company'
      }
    });

    if (!testClient) {
      console.error('❌ Test client not found');
      return;
    }

    console.log('✅ Found test client:', testClient.id);

    // Check if credits already exist
    let existingCredits = await prisma.client_credits.findUnique({
      where: { clientId: testClient.id }
    });

    if (existingCredits) {
      console.log('✅ Credits already exist for test client');
      console.log('   Balance:', existingCredits.balance);
      console.log('   Total Added:', existingCredits.totalAdded);
      console.log('   Total Used:', existingCredits.totalUsed);
      return;
    }

    // Create initial credits
    const initialCredits = await prisma.client_credits.create({
      data: {
        id: 'credits-' + Date.now(),
        clientId: testClient.id,
        balance: 1000,
        totalAdded: 1000,
        totalUsed: 0,
        updatedAt: new Date()
      }
    });

    console.log('✅ Created initial credits for test client:');
    console.log('   ID:', initialCredits.id);
    console.log('   Balance:', initialCredits.balance);
    console.log('   Total Added:', initialCredits.totalAdded);
    console.log('   Total Used:', initialCredits.totalUsed);

  } catch (error) {
    console.error('❌ Error adding initial credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addInitialCredits();
