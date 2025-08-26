const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkCourierServices() {
  try {
    console.log('🔍 Checking courier services in database...');
    
    // Get all clients
    const clients = await prisma.client.findMany({
      include: {
        courierServices: true
      }
    });
    
    console.log(`📊 Found ${clients.length} clients:`);
    
    clients.forEach(client => {
      console.log(`\n🏢 Client: ${client.companyName} (ID: ${client.id})`);
      console.log(`   Courier Services: ${client.courierServices.length}`);
      
      client.courierServices.forEach(service => {
        console.log(`   - ${service.label} (${service.value}) - Active: ${service.isActive}`);
      });
    });
    
    // Get all courier services
    const allCourierServices = await prisma.courierService.findMany();
    console.log(`\n📋 Total courier services in database: ${allCourierServices.length}`);
    
    allCourierServices.forEach(service => {
      console.log(`   - ${service.label} (${service.value}) - Client ID: ${service.clientId} - Active: ${service.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking courier services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCourierServices();
