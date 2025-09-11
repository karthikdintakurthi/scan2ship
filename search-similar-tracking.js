// Search for similar tracking IDs in production database
const { PrismaClient } = require('@prisma/client');

// Use the production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway"
    }
  }
});

async function searchSimilarTracking() {
  try {
    const searchTerm = 'YDE703';
    console.log(`🔍 Searching for tracking IDs containing: ${searchTerm}\n`);
    
    // Search for orders with tracking_id containing the search term
    const orders = await prisma.orders.findMany({
      where: {
        tracking_id: {
          contains: searchTerm
        }
      },
      select: {
        id: true,
        tracking_id: true,
        name: true,
        mobile: true,
        delhivery_tracking_status: true,
        created_at: true
      },
      take: 10,
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (orders.length === 0) {
      console.log(`❌ No orders found with tracking ID containing "${searchTerm}"`);
      
      // Try searching for orders with similar pattern (YDE)
      console.log(`\n🔍 Searching for orders with "YDE" pattern...`);
      const ydeOrders = await prisma.orders.findMany({
        where: {
          tracking_id: {
            contains: 'YDE'
          }
        },
        select: {
          id: true,
          tracking_id: true,
          name: true,
          mobile: true,
          delhivery_tracking_status: true,
          created_at: true
        },
        take: 5,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      if (ydeOrders.length > 0) {
        console.log(`\n📦 Found ${ydeOrders.length} orders with "YDE" pattern:`);
        ydeOrders.forEach((order, index) => {
          console.log(`${index + 1}. ${order.tracking_id} - ${order.name} (${order.mobile}) - ${order.delhivery_tracking_status || 'null'}`);
        });
      } else {
        console.log(`❌ No orders found with "YDE" pattern either`);
      }
      
      return;
    }
    
    console.log(`📦 Found ${orders.length} orders with tracking ID containing "${searchTerm}":`);
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.tracking_id} - ${order.name} (${order.mobile}) - ${order.delhivery_tracking_status || 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error searching for similar tracking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchSimilarTracking();
