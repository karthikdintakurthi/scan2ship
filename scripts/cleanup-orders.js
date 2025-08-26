const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupOrders() {
  try {
    console.log('🧹 Starting order cleanup...')
    
    // First, get the total count of orders
    const totalOrders = await prisma.order.count()
    console.log(`📊 Total orders in database: ${totalOrders}`)
    
    if (totalOrders <= 2) {
      console.log('✅ No cleanup needed - database has 2 or fewer orders')
      return
    }
    
    // Get the IDs of the latest 2 orders (ordered by created_at desc)
    const latestOrders = await prisma.order.findMany({
      select: { id: true },
      orderBy: { created_at: 'desc' },
      take: 2
    })
    
    const latestOrderIds = latestOrders.map(order => order.id)
    console.log(`🔒 Keeping latest 2 orders with IDs: ${latestOrderIds.join(', ')}`)
    
    // Delete all orders except the latest 2
    const deleteResult = await prisma.order.deleteMany({
      where: {
        id: {
          notIn: latestOrderIds
        }
      }
    })
    
    console.log(`🗑️  Deleted ${deleteResult.count} orders`)
    console.log(`✅ Cleanup completed! Database now has ${totalOrders - deleteResult.count} orders`)
    
    // Verify the remaining orders
    const remainingOrders = await prisma.order.findMany({
      select: { 
        id: true, 
        name: true, 
        created_at: true 
      },
      orderBy: { created_at: 'desc' }
    })
    
    console.log('\n📋 Remaining orders:')
    remainingOrders.forEach(order => {
      console.log(`  ID: ${order.id}, Name: ${order.name}, Created: ${order.created_at}`)
    })
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupOrders()
  .then(() => {
    console.log('🎉 Cleanup script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error)
    process.exit(1)
  })
