const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function seedRateData() {
  try {
    console.log('🌱 Starting to seed rate calculation data...');

    // Get all clients
    const clients = await prisma.clients.findMany({
      where: { isActive: true }
    });

    if (clients.length === 0) {
      console.log('❌ No active clients found. Please create a client first.');
      return;
    }

    console.log(`📊 Found ${clients.length} active clients`);

    for (const client of clients) {
      console.log(`\n🏢 Processing client: ${client.companyName} (${client.id})`);

      // Get existing courier services for this client
      const existingServices = await prisma.courier_services.findMany({
        where: { clientId: client.id }
      });

      console.log(`📦 Found ${existingServices.length} existing courier services`);

      // Update existing services with rate data
      for (const service of existingServices) {
        const rateData = getRateDataForService(service.name, service.code);
        
        const updatedService = await prisma.courier_services.update({
          where: { id: service.id },
          data: rateData
        });

        console.log(`✅ Updated ${service.name} with rate data:`, {
          baseRate: updatedService.baseRate,
          ratePerKg: updatedService.ratePerKg,
          minWeight: updatedService.minWeight,
          maxWeight: updatedService.maxWeight,
          codCharges: updatedService.codCharges,
          freeShippingThreshold: updatedService.freeShippingThreshold,
          estimatedDays: updatedService.estimatedDays
        });
      }

      // If no services exist, create some default ones
      if (existingServices.length === 0) {
        console.log('📦 No courier services found, creating default ones...');
        
        const defaultServices = [
          {
            name: 'Delhivery Standard',
            code: 'DELHIVERY_STD',
            baseRate: 50.0,
            ratePerKg: 25.0,
            minWeight: 500, // 500g
            maxWeight: 50000, // 50kg
            codCharges: 15.0,
            freeShippingThreshold: 1000.0,
            estimatedDays: 3,
            isDefault: true
          },
          {
            name: 'Delhivery Express',
            code: 'DELHIVERY_EXP',
            baseRate: 80.0,
            ratePerKg: 35.0,
            minWeight: 500,
            maxWeight: 30000,
            codCharges: 20.0,
            freeShippingThreshold: 1500.0,
            estimatedDays: 1,
            isDefault: false
          },
          {
            name: 'India Post',
            code: 'INDIA_POST',
            baseRate: 30.0,
            ratePerKg: 15.0,
            minWeight: 100,
            maxWeight: 20000,
            codCharges: 10.0,
            freeShippingThreshold: 500.0,
            estimatedDays: 5,
            isDefault: false
          }
        ];

        for (const serviceData of defaultServices) {
          const newService = await prisma.courier_services.create({
            data: {
              id: `courier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ...serviceData,
              clientId: client.id,
              isActive: true
            }
          });

          console.log(`✅ Created ${newService.name} with rate data:`, {
            baseRate: newService.baseRate,
            ratePerKg: newService.ratePerKg,
            minWeight: newService.minWeight,
            maxWeight: newService.maxWeight,
            codCharges: newService.codCharges,
            freeShippingThreshold: newService.freeShippingThreshold,
            estimatedDays: newService.estimatedDays
          });
        }
      }
    }

    console.log('\n🎉 Rate data seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding rate data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getRateDataForService(serviceName, serviceCode) {
  const name = serviceName.toLowerCase();
  const code = serviceCode.toLowerCase();

  // Delhivery services
  if (name.includes('delhivery') || code.includes('delhivery')) {
    if (name.includes('express') || code.includes('exp')) {
      return {
        baseRate: 80.0,
        ratePerKg: 35.0,
        minWeight: 500,
        maxWeight: 30000,
        codCharges: 20.0,
        freeShippingThreshold: 1500.0,
        estimatedDays: 1
      };
    } else {
      return {
        baseRate: 50.0,
        ratePerKg: 25.0,
        minWeight: 500,
        maxWeight: 50000,
        codCharges: 15.0,
        freeShippingThreshold: 1000.0,
        estimatedDays: 3
      };
    }
  }

  // India Post services
  if (name.includes('india post') || name.includes('post') || code.includes('post')) {
    return {
      baseRate: 30.0,
      ratePerKg: 15.0,
      minWeight: 100,
      maxWeight: 20000,
      codCharges: 10.0,
      freeShippingThreshold: 500.0,
      estimatedDays: 5
    };
  }

  // Blue Dart services
  if (name.includes('blue dart') || code.includes('blue') || code.includes('dart')) {
    return {
      baseRate: 60.0,
      ratePerKg: 30.0,
      minWeight: 500,
      maxWeight: 40000,
      codCharges: 18.0,
      freeShippingThreshold: 1200.0,
      estimatedDays: 2
    };
  }

  // Default rates for unknown services
  return {
    baseRate: 40.0,
    ratePerKg: 20.0,
    minWeight: 500,
    maxWeight: 30000,
    codCharges: 12.0,
    freeShippingThreshold: 800.0,
    estimatedDays: 4
  };
}

// Run the seeding function
seedRateData();
