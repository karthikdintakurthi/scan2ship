const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCreditCosts() {
  try {
    console.log('🌱 Starting credit costs seeding...');

    // Get all active clients
    const clients = await prisma.clients.findMany({
      where: { isActive: true }
    });

    console.log(`📋 Found ${clients.length} active clients`);

    const defaultCosts = [
      { feature: 'ORDER', cost: 1.0 },
      { feature: 'WHATSAPP', cost: 1.0 },
      { feature: 'IMAGE_PROCESSING', cost: 2.0 },
      { feature: 'TEXT_PROCESSING', cost: 1.0 }
    ];

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const client of clients) {
      console.log(`\n🔧 Processing client: ${client.companyName} (${client.id})`);

      for (const defaultCost of defaultCosts) {
        try {
          // Check if cost already exists
          const existingCost = await prisma.client_credit_costs.findUnique({
            where: {
              clientId_feature: {
                clientId: client.id,
                feature: defaultCost.feature
              }
            }
          });

          if (existingCost) {
            console.log(`  ✅ ${defaultCost.feature}: Already exists (${existingCost.cost} credits)`);
            totalUpdated++;
          } else {
            // Create new cost
            const newCost = await prisma.client_credit_costs.create({
              data: {
                id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                clientId: client.id,
                feature: defaultCost.feature,
                cost: defaultCost.cost,
                isActive: true,
                updatedAt: new Date()
              }
            });
            console.log(`  ➕ ${defaultCost.feature}: Created (${newCost.cost} credits)`);
            totalCreated++;
          }
        } catch (error) {
          console.error(`  ❌ Error processing ${defaultCost.feature} for ${client.companyName}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Credit costs seeding completed!`);
    console.log(`   📊 Total created: ${totalCreated}`);
    console.log(`   📊 Total updated: ${totalUpdated}`);
    console.log(`   📊 Total processed: ${clients.length * defaultCosts.length}`);

  } catch (error) {
    console.error('❌ Error during credit costs seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedCreditCosts()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
