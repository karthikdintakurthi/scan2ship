#!/usr/bin/env node

/**
 * Update API key in scan2ship mapping
 */

const { PrismaClient } = require('@prisma/client');

async function updateApiKey() {
  console.log('🔑 Updating API key in scan2ship mapping...\n');

  try {
    // Load QA environment variables
    require('dotenv').config({ path: '.env.qa' });
    
    const prisma = new PrismaClient();

    // Update the API key
    const updatedMapping = await prisma.cross_app_mappings.update({
      where: { scan2shipClientId: 'client-1756319181164-s6ds2994c' },
      data: {
        catalogApiKey: '8c6edcedae92b0baf4de84be6e5a9c4500e859655fc0892bc6434dd0ddcf3a2a'
      }
    });

    console.log('✅ Updated API key in mapping:');
    console.log(`Mapping ID: ${updatedMapping.id}`);
    console.log(`Catalog Client ID: ${updatedMapping.catalogClientId}`);
    console.log(`API Key: ${updatedMapping.catalogApiKey.substring(0, 8)}...`);
    console.log(`Active: ${updatedMapping.isActive}`);

    await prisma.$disconnect();
    console.log('\n✅ API key update completed');

  } catch (error) {
    console.error('❌ Error updating API key:', error);
  }
}

// Run the update
updateApiKey();
