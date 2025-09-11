// Check tracking status of specific order in production database
const { PrismaClient } = require('@prisma/client');

// Use the production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway"
    }
  }
});

async function checkOrderStatus() {
  try {
    const trackingId = '42746410003382';
    console.log(`🔍 Checking tracking status for order: ${trackingId}\n`);
    
    // Find the order by tracking_id
    const order = await prisma.orders.findFirst({
      where: {
        tracking_id: trackingId
      },
      select: {
        id: true,
        tracking_id: true,
        name: true,
        mobile: true,
        city: true,
        state: true,
        delhivery_api_status: true,
        delhivery_tracking_status: true,
        delhivery_api_error: true,
        created_at: true,
        updated_at: true
      }
    });
    
    if (!order) {
      console.log(`❌ Order with tracking ID ${trackingId} not found in database`);
      return;
    }
    
    console.log(`📦 Order Details:`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Tracking ID: ${order.tracking_id}`);
    console.log(`   Customer: ${order.name} (${order.mobile})`);
    console.log(`   Location: ${order.city}, ${order.state}`);
    console.log(`   Created: ${order.created_at.toISOString()}`);
    console.log(`   Updated: ${order.updated_at.toISOString()}`);
    console.log(`\n📊 Status Information:`);
    console.log(`   delhivery_api_status: ${order.delhivery_api_status || 'null'}`);
    console.log(`   delhivery_tracking_status: ${order.delhivery_tracking_status || 'null'}`);
    console.log(`   delhivery_api_error: ${order.delhivery_api_error || 'null'}`);
    
    console.log(`\n🎯 UI Display:`);
    if (order.delhivery_tracking_status === null) {
      console.log(`   Status Badge: "📦 Not Dispatched"`);
    } else {
      console.log(`   Status Badge: "${order.delhivery_tracking_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}"`);
    }
    
  } catch (error) {
    console.error('❌ Error checking order status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrderStatus();
