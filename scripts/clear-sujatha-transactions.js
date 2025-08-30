require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearSujathaTransactions() {
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

    // Get current transaction count
    const transactionCount = await prisma.credit_transactions.count({
      where: { clientId }
    });

    console.log(`\n📊 Current transaction count: ${transactionCount}`);

    if (transactionCount === 0) {
      console.log('✅ No transactions to clear');
      return;
    }

    // Confirm before deletion
    console.log('\n⚠️  WARNING: This will permanently delete ALL credit transactions for Sujatha client!');
    console.log('   This action cannot be undone.');
    
    // For safety, let's just show what would be deleted first
    console.log('\n📋 Transactions that would be deleted:');
    
    const transactions = await prisma.credit_transactions.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 10 // Show first 10 transactions
    });

    transactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type} - ${tx.amount} credits - ${tx.description} (${tx.createdAt.toLocaleDateString()})`);
    });

    if (transactionCount > 10) {
      console.log(`   ... and ${transactionCount - 10} more transactions`);
    }

    // For now, let's just delete the transactions without asking for confirmation
    // In a real scenario, you might want to add a confirmation prompt
    console.log('\n🗑️  Deleting all transactions...');
    
    const deleteResult = await prisma.credit_transactions.deleteMany({
      where: { clientId }
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} transactions`);

    // Verify deletion
    const remainingCount = await prisma.credit_transactions.count({
      where: { clientId }
    });

    console.log(`📊 Remaining transactions: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('✅ All transactions cleared successfully!');
    } else {
      console.log('⚠️  Some transactions may still remain');
    }

  } catch (error) {
    console.error('❌ Error clearing transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSujathaTransactions().catch(console.error);
