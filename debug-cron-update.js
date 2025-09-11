// Debug why cron job is not updating delhivery_tracking_status
const { PrismaClient } = require('@prisma/client');

// Use the production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway"
    }
  }
});

async function debugCronUpdate() {
  try {
    console.log('🔍 Debugging cron job update issue...\n');
    
    // Check if there are any orders with delhivery_tracking_status set
    const ordersWithTrackingStatus = await prisma.orders.count({
      where: {
        tracking_id: { not: null },
        delhivery_tracking_status: { not: null }
      }
    });
    
    console.log(`📊 Orders with delhivery_tracking_status set: ${ordersWithTrackingStatus}`);
    
    // Check recent orders that should have been updated
    const recentOrders = await prisma.orders.findMany({
      where: {
        tracking_id: { not: null },
        updated_at: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      select: {
        id: true,
        tracking_id: true,
        delhivery_api_status: true,
        delhivery_tracking_status: true,
        updated_at: true
      },
      take: 5,
      orderBy: {
        updated_at: 'desc'
      }
    });
    
    console.log(`\n📦 Recent orders (last hour):`);
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.id}`);
      console.log(`   Tracking ID: ${order.tracking_id}`);
      console.log(`   API Status: ${order.delhivery_api_status || 'null'}`);
      console.log(`   Tracking Status: ${order.delhivery_tracking_status || 'null'}`);
      console.log(`   Updated: ${order.updated_at.toISOString()}`);
      console.log('-'.repeat(40));
    });
    
    // Check if the cron job is actually calling the right API endpoint
    console.log(`\n🔧 Testing cron job endpoint...`);
    
    const response = await fetch('http://localhost:3000/api/cron/update-tracking', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer default-cron-secret',
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log(`Cron job response:`, JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error debugging cron update:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCronUpdate();
