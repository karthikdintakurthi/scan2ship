const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFilterLogic() {
  try {
    console.log('🧪 Testing filter logic to ensure proper separation...');
    
    // Test Not Dispatched conditions (should exclude "Not assigned")
    const notDispatchedConditions = [
      { 
        AND: [
          { delhivery_tracking_status: null },
          { tracking_status: { not: 'Not assigned' } }
        ]
      },
      { 
        AND: [
          { delhivery_tracking_status: 'manifested' },
          { tracking_status: { not: 'Not assigned' } }
        ]
      },
      { 
        AND: [
          { delhivery_tracking_status: 'not picked' },
          { tracking_status: { not: 'Not assigned' } }
        ]
      },
      { 
        AND: [
          { delhivery_tracking_status: 'pending' },
          { tracking_status: { not: 'Not assigned' } }
        ]
      }
    ];
    
    // Test Pending conditions (should include "Not assigned")
    const pendingConditions = [
      { delhivery_tracking_status: 'pending' },
      { tracking_status: 'Not assigned' },
      { tracking_id: null },
      { tracking_id: '' }
    ];
    
    console.log('📊 Testing Not Dispatched filter (should exclude "Not assigned"):');
    const notDispatchedCount = await prisma.orders.count({
      where: {
        OR: notDispatchedConditions
      }
    });
    console.log(`  Orders matching Not Dispatched: ${notDispatchedCount}`);
    
    console.log('\n📊 Testing Pending filter (should include "Not assigned"):');
    const pendingCount = await prisma.orders.count({
      where: {
        OR: pendingConditions
      }
    });
    console.log(`  Orders matching Pending: ${pendingCount}`);
    
    // Check for overlap - orders that match both filters (should be 0)
    const overlapCount = await prisma.orders.count({
      where: {
        AND: [
          { OR: notDispatchedConditions },
          { OR: pendingConditions }
        ]
      }
    });
    console.log(`\n⚠️  Orders matching BOTH filters (should be 0): ${overlapCount}`);
    
    // Show some examples of each filter
    console.log('\n📋 Sample Not Dispatched orders:');
    const notDispatchedSamples = await prisma.orders.findMany({
      where: { OR: notDispatchedConditions },
      take: 3,
      select: {
        id: true,
        tracking_id: true,
        tracking_status: true,
        delhivery_tracking_status: true
      }
    });
    
    notDispatchedSamples.forEach(order => {
      console.log(`  Order ${order.id}: tracking_id="${order.tracking_id}", tracking_status="${order.tracking_status}", delhivery_tracking_status="${order.delhivery_tracking_status}"`);
    });
    
    console.log('\n📋 Sample Pending orders:');
    const pendingSamples = await prisma.orders.findMany({
      where: { OR: pendingConditions },
      take: 3,
      select: {
        id: true,
        tracking_id: true,
        tracking_status: true,
        delhivery_tracking_status: true
      }
    });
    
    pendingSamples.forEach(order => {
      console.log(`  Order ${order.id}: tracking_id="${order.tracking_id}", tracking_status="${order.tracking_status}", delhivery_tracking_status="${order.delhivery_tracking_status}"`);
    });
    
  } catch (error) {
    console.error('❌ Error testing filter logic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFilterLogic();
