// Check updated delhivery_tracking_status values
const { PrismaClient } = require('@prisma/client');

// Use the production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway"
    }
  }
});

async function checkUpdatedStatuses() {
  try {
    console.log('🔍 Checking updated delhivery_tracking_status values...\n');
    
    // Get a sample of orders with different statuses
    const orders = await prisma.orders.findMany({
      where: {
        tracking_id: { not: null }
      },
      select: {
        id: true,
        tracking_id: true,
        delhivery_api_status: true,
        delhivery_tracking_status: true,
        created_at: true
      },
      take: 10,
      orderBy: {
        updated_at: 'desc'
      }
    });
    
    console.log(`📦 Sample of ${orders.length} orders:`);
    console.log('=' .repeat(80));
    
    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.id}`);
      console.log(`   Tracking ID: ${order.tracking_id}`);
      console.log(`   API Status: ${order.delhivery_api_status || 'null'}`);
      console.log(`   Tracking Status: ${order.delhivery_tracking_status || 'null'}`);
      console.log(`   Created: ${order.created_at.toISOString()}`);
      console.log('-'.repeat(40));
    });
    
    // Get status distribution
    const statusDistribution = await prisma.orders.groupBy({
      by: ['delhivery_tracking_status'],
      where: {
        tracking_id: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log(`\n📊 delhivery_tracking_status distribution:`);
    statusDistribution.forEach(status => {
      console.log(`   ${status.delhivery_tracking_status || 'null'}: ${status._count.id} orders`);
    });
    
    // Check API status distribution for comparison
    const apiStatusDistribution = await prisma.orders.groupBy({
      by: ['delhivery_api_status'],
      where: {
        tracking_id: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log(`\n📊 delhivery_api_status distribution:`);
    apiStatusDistribution.forEach(status => {
      console.log(`   ${status.delhivery_api_status || 'null'}: ${status._count.id} orders`);
    });
    
  } catch (error) {
    console.error('❌ Error checking statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUpdatedStatuses();
