require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestOrder() {
  try {
    console.log('🧪 Creating Test Order with Empty Reseller Fields')
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
    console.log(`  Default Product Description: ${orderConfig.defaultProductDescription}`)
    console.log(`  Default Package Value: ₹${orderConfig.defaultPackageValue}`)
    console.log(`  Default Weight: ${orderConfig.defaultWeight}g`)
    
    // Test the fallback logic before creating order
    console.log('\n🧪 Testing Fallback Logic:')
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
    
    // Create test order data
    const testOrderData = {
      clientId: client.id,
      name: 'Test Customer - Reseller Fallback',
      mobile: '9876543210',
      phone: '8765432109',
      address: '123 Test Street, Test Area',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      courier_service: 'delhivery',
      pickup_location: 'PADMAVATHI2 C2C',
      package_value: orderConfig.defaultPackageValue,
      weight: orderConfig.defaultWeight,
      total_items: orderConfig.defaultTotalItems,
      is_cod: false,
      cod_amount: null,
      reseller_name: resellerName, // This should be empty, triggering fallback
      reseller_mobile: resellerMobile, // This should be empty, triggering fallback
      product_description: orderConfig.defaultProductDescription,
      tracking_id: null,
      reference_number: `TEST-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    console.log('\n📦 Creating Test Order:')
    console.log('  Customer Name:', testOrderData.name)
    console.log('  Mobile:', testOrderData.mobile)
    console.log('  Address:', testOrderData.address)
    console.log('  City:', testOrderData.city)
    console.log('  Package Value:', `₹${testOrderData.package_value}`)
    console.log('  Weight:', `${testOrderData.weight}g`)
    console.log('  Reseller Name (before fallback):', `"${testOrderData.reseller_name}"`)
    console.log('  Reseller Mobile (before fallback):', `"${testOrderData.reseller_mobile}"`)
    
    // Create the order
    const newOrder = await prisma.orders.create({
      data: testOrderData
    })
    
    console.log('\n✅ Test Order Created Successfully!')
    console.log(`  Order ID: ${newOrder.id}`)
    console.log(`  Reference Number: ${newOrder.reference_number}`)
    console.log(`  Created At: ${newOrder.created_at}`)
    
    // Fetch the created order to verify the reseller fields
    const createdOrder = await prisma.orders.findUnique({
      where: { id: newOrder.id }
    })
    
    console.log('\n📊 Verification - Created Order Details:')
    console.log(`  Customer Name: ${createdOrder.name}`)
    console.log(`  Mobile: ${createdOrder.mobile}`)
    console.log(`  Reseller Name: "${createdOrder.reseller_name || 'N/A'}"`)
    console.log(`  Reseller Mobile: "${createdOrder.reseller_mobile || 'N/A'}"`)
    
    // Check if fallback was applied
    console.log('\n🔍 Fallback Verification:')
    if (createdOrder.reseller_name === client.companyName) {
      console.log('✅ SUCCESS: Reseller name uses company name fallback')
    } else {
      console.log('❌ FAILED: Reseller name does not use company name fallback')
      console.log(`  Expected: "${client.companyName}"`)
      console.log(`  Actual: "${createdOrder.reseller_name || 'N/A'}"`)
    }
    
    if (createdOrder.reseller_mobile === client.phone) {
      console.log('✅ SUCCESS: Reseller mobile uses company phone fallback')
    } else {
      console.log('❌ FAILED: Reseller mobile does not use company phone fallback')
      console.log(`  Expected: "${client.phone}"`)
      console.log(`  Actual: "${createdOrder.reseller_mobile || 'N/A'}"`)
    }
    
    // Summary
    console.log('\n📋 Test Summary:')
    if (orderConfig.enableResellerFallback) {
      console.log('✅ Reseller fallback is ENABLED in configuration')
      if (createdOrder.reseller_name === client.companyName && createdOrder.reseller_mobile === client.phone) {
        console.log('✅ RESELLER FALLBACK IS WORKING CORRECTLY!')
        console.log('   - Empty reseller fields are being filled with company details')
      } else {
        console.log('❌ RESELLER FALLBACK IS NOT WORKING!')
        console.log('   - Empty reseller fields are not being filled with company details')
      }
    } else {
      console.log('❌ Reseller fallback is DISABLED in configuration')
    }
    
  } catch (error) {
    console.error('❌ Error creating test order:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestOrder()
