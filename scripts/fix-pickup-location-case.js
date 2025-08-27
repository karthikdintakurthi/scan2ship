const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPickupLocationCase() {
  try {
    console.log('🔧 Fixing pickup location case sensitivity issues...\n');
    
    // Get all orders with pickup locations
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        pickup_location: true,
        clientId: true
      }
    });
    
    console.log(`📦 Found ${orders.length} orders to check\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const order of orders) {
      try {
        // Check if pickup location exists for this client
        const pickupLocation = await prisma.pickup_locations.findFirst({
          where: { 
            clientId: order.clientId,
            value: {
              equals: order.pickup_location,
              mode: 'insensitive'
            }
          }
        });
        
        if (pickupLocation && pickupLocation.value !== order.pickup_location) {
          // Case mismatch found - update the order
          console.log(`🔄 Order ${order.id}: "${order.pickup_location}" → "${pickupLocation.value}"`);
          
          await prisma.order.update({
            where: { id: order.id },
            data: { pickup_location: pickupLocation.value }
          });
          
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ Error fixing order ${order.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Fixed: ${fixedCount} orders`);
    console.log(`❌ Errors: ${errorCount} orders`);
    console.log(`📦 Total processed: ${orders.length} orders`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 Successfully fixed pickup location case sensitivity issues!');
    } else {
      console.log('\n✅ No case sensitivity issues found.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing pickup location cases:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPickupLocationCase();
