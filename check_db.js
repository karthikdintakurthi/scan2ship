const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking database tables...\n');
    
    // Check clients table
    const clientsCount = await prisma.clients.count();
    console.log(`Clients table: ${clientsCount} records`);
    
    // Check users table
    const usersCount = await prisma.users.count();
    console.log(`Users table: ${usersCount} records`);
    
    // Check orders table
    const ordersCount = await prisma.orders.count();
    console.log(`Orders table: ${ordersCount} records`);
    
    // Check client_order_configs table
    const configsCount = await prisma.client_order_configs.count();
    console.log(`Client Order Configs table: ${configsCount} records`);
    
    // Check pickup_locations table
    const pickupCount = await prisma.pickup_locations.count();
    console.log(`Pickup Locations table: ${pickupCount} records`);
    
    // Check courier_services table
    const courierCount = await prisma.courier_services.count();
    console.log(`Courier Services table: ${courierCount} records`);
    
    console.log('\nDatabase check complete!');
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
