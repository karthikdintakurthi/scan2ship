// Batch Runner Script - Run this to process all orders in batches
const fetch = require('node-fetch');

async function runAllBatches() {
  const baseUrl = process.env.PRODUCTION_URL || 'https://www.scan2ship.in';
  const cronSecret = process.env.CRON_SECRET || 'your-secure-cron-secret-key-here';
  
  // First, get total client count to determine batch size
  console.log('🔍 Determining total clients and batch requirements...');
  
  // Calculate total batches needed (assuming 5 clients per batch)
  const CLIENTS_PER_BATCH = 5;
  const estimatedTotalBatches = 10; // Adjust based on your client count
  
  console.log(`📊 Estimated total batches needed: ${estimatedTotalBatches}`);
  
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  
  for (let batchNumber = 1; batchNumber <= estimatedTotalBatches; batchNumber++) {
    console.log(`\n🔄 Running batch ${batchNumber}/${estimatedTotalBatches}...`);
    
    try {
      const response = await fetch(`${baseUrl}/api/cron/scalable-update-tracking`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchNumber,
          totalBatches: estimatedTotalBatches
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Batch ${batchNumber} completed successfully`);
        console.log(`📈 Stats: Processed: ${result.stats.totalProcessed}, Updated: ${result.stats.totalUpdated}, Errors: ${result.stats.totalErrors}`);
        
        totalProcessed += result.stats.totalProcessed;
        totalUpdated += result.stats.totalUpdated;
        totalErrors += result.stats.totalErrors;
        
        // If no more batches needed, break
        if (!result.stats.hasMoreBatches) {
          console.log('🏁 All batches completed!');
          break;
        }
      } else {
        console.log(`❌ Batch ${batchNumber} failed:`, result.error);
      }
      
      // Wait between batches to avoid overwhelming the server
      if (batchNumber < estimatedTotalBatches) {
        console.log('⏳ Waiting 30 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
    } catch (error) {
      console.error(`❌ Error running batch ${batchNumber}:`, error);
    }
  }
  
  console.log(`\n🎯 Final Summary:`);
  console.log(`📊 Total Processed: ${totalProcessed}`);
  console.log(`📊 Total Updated: ${totalUpdated}`);
  console.log(`📊 Total Errors: ${totalErrors}`);
}

runAllBatches();