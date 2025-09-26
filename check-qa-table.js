#!/usr/bin/env node

/**
 * Check if cross_app_mappings table exists in QA database
 */

const { PrismaClient } = require('@prisma/client');

async function checkQATable() {
  console.log('🔍 Checking if cross_app_mappings table exists in QA database...\n');

  try {
    // Load QA environment variables
    require('dotenv').config({ path: '.env.qa' });
    
    const prisma = new PrismaClient();

    // Try to query the table directly
    console.log('📊 Checking cross_app_mappings table...');
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'cross_app_mappings'
    `;

    console.log('Table check result:', result);

    if (result.length > 0) {
      console.log('✅ cross_app_mappings table exists');
      
      // Try to query the mappings
      const mappings = await prisma.$queryRaw`
        SELECT id, "scan2shipClientId", "catalogClientId", "isActive", "createdAt"
        FROM cross_app_mappings
        LIMIT 5
      `;
      
      console.log(`Found ${mappings.length} mappings:`, mappings);
    } else {
      console.log('❌ cross_app_mappings table does not exist');
      console.log('Need to create the table in QA database');
    }

    await prisma.$disconnect();
    console.log('\n✅ Database check completed');

  } catch (error) {
    console.error('❌ Error checking QA database:', error.message);
    console.error('Full error:', error);
  }
}

// Run the check
checkQATable();
