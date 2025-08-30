require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySujathaCredits() {
  try {
    console.log('🔍 Verifying Sujatha credits...');
    
    const sujathaUser = await prisma.users.findFirst({
      where: { email: 'sujatha@scan2ship.in' },
      include: {
        clients: {
          include: {
            client_credits: true
          }
        }
      }
    });

    if (!sujathaUser) {
      console.log('❌ Sujatha user not found');
      return;
    }

    if (!sujathaUser.clients.client_credits) {
      console.log('❌ No credits record found for Sujatha');
      return;
    }

    const credits = sujathaUser.clients.client_credits;
    
    console.log('📊 Sujatha Credits Status:');
    console.log(`   - Balance: ${credits.balance}`);
    console.log(`   - Total Added: ${credits.totalAdded}`);
    console.log(`   - Total Used: ${credits.totalUsed}`);
    console.log(`   - Last Updated: ${credits.updatedAt.toLocaleString()}`);
    
    // Check if the values match what we set
    if (credits.totalAdded === 1000 && credits.totalUsed === 0 && credits.balance === 1000) {
      console.log('\n✅ SUCCESS: Credits are correctly set!');
      console.log('   - Total Added: 1000 ✓');
      console.log('   - Total Used: 0 ✓');
      console.log('   - Balance: 1000 ✓');
    } else {
      console.log('\n❌ ERROR: Credits are not set correctly!');
      console.log(`   - Expected Total Added: 1000, Got: ${credits.totalAdded}`);
      console.log(`   - Expected Total Used: 0, Got: ${credits.totalUsed}`);
      console.log(`   - Expected Balance: 1000, Got: ${credits.balance}`);
    }

  } catch (error) {
    console.error('❌ Error verifying credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySujathaCredits().catch(console.error);
