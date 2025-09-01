require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testResellerFallback() {
  try {
    console.log('🔍 Testing Reseller Fallback Functionality')
    console.log('='.repeat(50))
    
    // Get the client details
    const client = await prisma.clients.findFirst({
      where: { companyName: 'Padmavathi Silks & Sarees' }
    })
    
    if (!client) {
      console.log('❌ Client not found')
      return
    }
    
    console.log('📋 Client Details:')
    console.log(`  Company Name: ${client.companyName}`)
    console.log(`  Contact Name: ${client.name}`)
    console.log(`  Phone: ${client.phone}`)
    console.log(`  Email: ${client.email}`)
    
    // Get the order configuration
    const orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    })
    
    if (!orderConfig) {
      console.log('❌ Order configuration not found')
      return
    }
    
    console.log('\n⚙️ Order Configuration:')
    console.log(`  enableResellerFallback: ${orderConfig.enableResellerFallback}`)
    
    // Test the fallback logic
    console.log('\n🧪 Testing Fallback Logic:')
    
    // Test case 1: Empty reseller fields
    let resellerName = ''
    let resellerMobile = ''
    
    if (orderConfig.enableResellerFallback) {
      resellerName = resellerName || client.companyName || ''
      resellerMobile = resellerMobile || client.phone || ''
      
      console.log('✅ Fallback ENABLED:')
      console.log(`  Original reseller_name: ""`)
      console.log(`  Original reseller_mobile: ""`)
      console.log(`  Final reseller_name: "${resellerName}"`)
      console.log(`  Final reseller_mobile: "${resellerMobile}"`)
    } else {
      console.log('❌ Fallback DISABLED:')
      console.log(`  Final reseller_name: "${resellerName}"`)
      console.log(`  Final reseller_mobile: "${resellerMobile}"`)
    }
    
    // Test case 2: Partially filled reseller fields
    console.log('\n🧪 Test Case 2: Partially filled fields')
    resellerName = 'Test Reseller'
    resellerMobile = ''
    
    if (orderConfig.enableResellerFallback) {
      const finalResellerName = resellerName || client.companyName || ''
      const finalResellerMobile = resellerMobile || client.phone || ''
      
      console.log('✅ Fallback ENABLED:')
      console.log(`  Original reseller_name: "${resellerName}"`)
      console.log(`  Original reseller_mobile: ""`)
      console.log(`  Final reseller_name: "${finalResellerName}"`)
      console.log(`  Final reseller_mobile: "${finalResellerMobile}"`)
    }
    
    // Test case 3: Both fields filled
    console.log('\n🧪 Test Case 3: Both fields filled')
    resellerName = 'Custom Reseller'
    resellerMobile = '9876543210'
    
    if (orderConfig.enableResellerFallback) {
      const finalResellerName = resellerName || client.companyName || ''
      const finalResellerMobile = resellerMobile || client.phone || ''
      
      console.log('✅ Fallback ENABLED:')
      console.log(`  Original reseller_name: "${resellerName}"`)
      console.log(`  Original reseller_mobile: "${resellerMobile}"`)
      console.log(`  Final reseller_name: "${finalResellerName}"`)
      console.log(`  Final reseller_mobile: "${finalResellerMobile}"`)
    }
    
    // Check existing orders to see if fallback was applied
    console.log('\n📊 Checking Existing Orders:')
    const orders = await prisma.orders.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        name: true,
        reseller_name: true,
        reseller_mobile: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' },
      take: 5
    })
    
    console.log(`Found ${orders.length} recent orders:`)
    orders.forEach((order, index) => {
      console.log(`\n  Order ${index + 1} (ID: ${order.id}):`)
      console.log(`    Customer: ${order.name}`)
      console.log(`    Reseller Name: "${order.reseller_name || 'N/A'}"`)
      console.log(`    Reseller Mobile: "${order.reseller_mobile || 'N/A'}"`)
      console.log(`    Created: ${order.created_at}`)
      
      // Check if fallback was applied
      if (order.reseller_name === client.companyName) {
        console.log(`    ✅ Reseller name appears to use company name fallback`)
      }
      if (order.reseller_mobile === client.phone) {
        console.log(`    ✅ Reseller mobile appears to use company phone fallback`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error testing reseller fallback:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testResellerFallback()
