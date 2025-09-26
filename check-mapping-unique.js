#!/usr/bin/env node

/**
 * Check cross-app mapping using findUnique
 */

const { PrismaClient } = require('@prisma/client');

async function checkMappingUnique() {
  console.log('🔍 Checking cross-app mapping using findUnique...\n');

  try {
    // Load QA environment variables
    require('dotenv').config({ path: '.env.qa' });
    
    const prisma = new PrismaClient();

    // Check if master client has cross-app mapping using findUnique
    const masterClientId = 'master-client-1756272680179';
    
    const mapping = await prisma.cross_app_mappings.findUnique({
      where: { scan2shipClientId: masterClientId },
      include: {
        scan2shipClient: {
          select: { name: true, slug: true }
        }
      }
    });

    if (mapping) {
      console.log('✅ Found cross-app mapping for master client using findUnique:');
      console.log(JSON.stringify(mapping, null, 2));
    } else {
      console.log('❌ No cross-app mapping found for master client using findUnique');
    }

    // Also check using findFirst for comparison
    const mappingFirst = await prisma.cross_app_mappings.findFirst({
      where: { scan2shipClientId: masterClientId },
      include: {
        scan2shipClient: {
          select: { name: true, slug: true }
        }
      }
    });

    if (mappingFirst) {
      console.log('✅ Found cross-app mapping for master client using findFirst:');
      console.log(JSON.stringify(mappingFirst, null, 2));
    } else {
      console.log('❌ No cross-app mapping found for master client using findFirst');
    }

    // Check all mappings
    const allMappings = await prisma.cross_app_mappings.findMany({
      include: {
        scan2shipClient: {
          select: { name: true, slug: true }
        }
      }
    });
    
    console.log('\n📊 All existing mappings:');
    allMappings.forEach((mapping, index) => {
      console.log(`${index + 1}. ${mapping.scan2shipClient.name} -> ${mapping.catalogClientId}`);
      console.log(`   Scan2Ship Client ID: ${mapping.scan2shipClientId}`);
      console.log(`   Active: ${mapping.isActive}`);
      console.log('');
    });

    await prisma.$disconnect();
    console.log('\n✅ Mapping check completed');

  } catch (error) {
    console.error('❌ Error checking mapping:', error);
  }
}

// Run the check
checkMappingUnique();
