require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSujathaCredits() {
  try {
    console.log('🔍 Finding Sujatha client...');
    
    // Find the Sujatha client by email
    const sujathaUser = await prisma.users.findFirst({
      where: { email: 'sujatha@scan2ship.in' },
      include: {
        clients: true
      }
    });

    if (!sujathaUser) {
      console.log('❌ Sujatha user not found');
      return;
    }

    const clientId = sujathaUser.clients.id;
    const clientName = sujathaUser.clients.companyName;

    console.log('✅ Found Sujatha client:');
    console.log(`   - Client ID: ${clientId}`);
    console.log(`   - Company Name: ${clientName}`);
    console.log(`   - User Email: ${sujathaUser.email}`);

    // Get current credits
    let currentCredits = await prisma.client_credits.findUnique({
      where: { clientId }
    });

    if (!currentCredits) {
      console.log('📝 Creating new credits record for Sujatha...');
      currentCredits = await prisma.client_credits.create({
        data: {
          id: `credits-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId,
          balance: 1000, // Set balance to 1000 (Total Added - Total Used)
          totalAdded: 1000,
          totalUsed: 0,
          updatedAt: new Date()
        }
      });
      console.log('✅ Created new credits record');
    } else {
      console.log('📊 Current credits:');
      console.log(`   - Balance: ${currentCredits.balance}`);
      console.log(`   - Total Added: ${currentCredits.totalAdded}`);
      console.log(`   - Total Used: ${currentCredits.totalUsed}`);
      
      console.log('\n🔄 Updating credits...');
      
      // Update credits
      currentCredits = await prisma.client_credits.update({
        where: { clientId },
        data: {
          balance: 1000, // Total Added - Total Used = 1000 - 0 = 1000
          totalAdded: 1000,
          totalUsed: 0,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Credits updated successfully');
    }

    // Create a transaction record for this update
    await prisma.credit_transactions.create({
      data: {
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        clientName: clientName,
        type: 'RESET',
        amount: 1000, // The new balance
        balance: 1000,
        description: 'Manual credit reset: Total Added = 1000, Total Used = 0',
        feature: 'MANUAL',
        createdAt: new Date()
      }
    });

    console.log('\n📊 Updated credits:');
    console.log(`   - Balance: ${currentCredits.balance}`);
    console.log(`   - Total Added: ${currentCredits.totalAdded}`);
    console.log(`   - Total Used: ${currentCredits.totalUsed}`);
    
    console.log('\n✅ Sujatha credits updated successfully!');
    console.log('   - Total Added set to: 1000');
    console.log('   - Total Used set to: 0');
    console.log('   - Balance set to: 1000');

  } catch (error) {
    console.error('❌ Error updating credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSujathaCredits().catch(console.error);
