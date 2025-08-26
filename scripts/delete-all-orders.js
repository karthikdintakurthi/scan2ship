#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllOrders() {
  try {
    console.log('🗑️  Starting to delete all orders...\n');
    
    // First, count how many orders exist
    const orderCount = await prisma.order.count();
    console.log(`📊 Found ${orderCount} orders in the database`);
    
    if (orderCount === 0) {
      console.log('✅ No orders to delete. Database is already empty.');
      return;
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete ALL orders from the database!');
    console.log('This action cannot be undone.\n');
    
    // For safety, require explicit confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('Type "DELETE ALL ORDERS" to confirm: ', resolve);
    });
    
    rl.close();
    
    if (answer !== 'DELETE ALL ORDERS') {
      console.log('❌ Deletion cancelled. No orders were deleted.');
      return;
    }
    
    console.log('\n🗑️  Confirmed. Deleting all orders...');
    
    // Delete all orders
    const deleteResult = await prisma.order.deleteMany({});
    
    console.log(`✅ Successfully deleted ${deleteResult.count} orders!`);
    console.log('🎉 Database is now empty.');
    
  } catch (error) {
    console.error('❌ Error deleting orders:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllOrders();
