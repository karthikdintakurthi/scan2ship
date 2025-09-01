require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function findOrder() {
  try {
    console.log('🔍 Searching for order with reference number: ERYOA4-9591656596')
    
    // Search by reference number
    const order = await prisma.orders.findFirst({
      where: {
        reference_number: 'ERYOA4-9591656596'
      },
      include: {
        clients: true
      }
    })

    if (order) {
      console.log('✅ Order found!')
      console.log('\n📋 ORDER DETAILS:')
      console.log('='.repeat(50))
      console.log(`Order ID: ${order.id}`)
      console.log(`Reference Number: ${order.reference_number}`)
      console.log(`Customer Name: ${order.name}`)
      console.log(`Mobile: ${order.mobile}`)
      console.log(`Phone: ${order.phone || 'N/A'}`)
      console.log(`Address: ${order.address}`)
      console.log(`City: ${order.city}`)
      console.log(`State: ${order.state}`)
      console.log(`Country: ${order.country}`)
      console.log(`Pincode: ${order.pincode}`)
      console.log(`Courier Service: ${order.courier_service}`)
      console.log(`Pickup Location: ${order.pickup_location}`)
      console.log(`Package Value: ₹${order.package_value}`)
      console.log(`Weight: ${order.weight}g`)
      console.log(`Total Items: ${order.total_items}`)
      console.log(`Tracking ID: ${order.tracking_id || 'N/A'}`)
      console.log(`Is COD: ${order.is_cod ? 'Yes' : 'No'}`)
      console.log(`COD Amount: ${order.cod_amount ? `₹${order.cod_amount}` : 'N/A'}`)
      console.log(`Reseller Name: ${order.reseller_name || 'N/A'}`)
      console.log(`Reseller Mobile: ${order.reseller_mobile || 'N/A'}`)
      console.log(`Created At: ${order.created_at}`)
      console.log(`Updated At: ${order.updated_at}`)
      
      // Delhivery specific fields
      console.log('\n🚚 DELHIVERY DETAILS:')
      console.log('='.repeat(30))
      console.log(`Waybill Number: ${order.delhivery_waybill_number || 'N/A'}`)
      console.log(`Order ID: ${order.delhivery_order_id || 'N/A'}`)
      console.log(`API Status: ${order.delhivery_api_status || 'N/A'}`)
      console.log(`API Error: ${order.delhivery_api_error || 'N/A'}`)
      console.log(`Retry Count: ${order.delhivery_retry_count || 0}`)
      console.log(`Last Attempt: ${order.last_delhivery_attempt || 'N/A'}`)
      
      // Shipment details
      console.log('\n📦 SHIPMENT DETAILS:')
      console.log('='.repeat(30))
      console.log(`Length: ${order.shipment_length || 'N/A'}cm`)
      console.log(`Breadth: ${order.shipment_breadth || 'N/A'}cm`)
      console.log(`Height: ${order.shipment_height || 'N/A'}cm`)
      console.log(`Product Description: ${order.product_description || 'N/A'}`)
      console.log(`Return Address: ${order.return_address || 'N/A'}`)
      console.log(`Return Pincode: ${order.return_pincode || 'N/A'}`)
      console.log(`Fragile Shipment: ${order.fragile_shipment ? 'Yes' : 'No'}`)
      
      // Seller details
      console.log('\n🏪 SELLER DETAILS:')
      console.log('='.repeat(30))
      console.log(`Seller Name: ${order.seller_name || 'N/A'}`)
      console.log(`Seller Address: ${order.seller_address || 'N/A'}`)
      console.log(`Seller GST: ${order.seller_gst || 'N/A'}`)
      console.log(`Invoice Number: ${order.invoice_number || 'N/A'}`)
      console.log(`Commodity Value: ${order.commodity_value ? `₹${order.commodity_value}` : 'N/A'}`)
      console.log(`Tax Value: ${order.tax_value ? `₹${order.tax_value}` : 'N/A'}`)
      console.log(`Category: ${order.category_of_goods || 'N/A'}`)
      console.log(`Vendor Pickup Location: ${order.vendor_pickup_location || 'N/A'}`)
      
      // Additional fields
      console.log('\n📄 ADDITIONAL DETAILS:')
      console.log('='.repeat(30))
      console.log(`HSN Code: ${order.hsn_code || 'N/A'}`)
      console.log(`Seller CST No: ${order.seller_cst_no || 'N/A'}`)
      console.log(`Seller TIN: ${order.seller_tin || 'N/A'}`)
      console.log(`Invoice Date: ${order.invoice_date || 'N/A'}`)
      console.log(`Return Reason: ${order.return_reason || 'N/A'}`)
      console.log(`EWBN: ${order.ewbn || 'N/A'}`)
      
      // Client details
      console.log('\n🏢 CLIENT DETAILS:')
      console.log('='.repeat(30))
      console.log(`Client ID: ${order.clients.id}`)
      console.log(`Client Name: ${order.clients.name}`)
      console.log(`Company Name: ${order.clients.companyName}`)
      console.log(`Client Email: ${order.clients.email}`)
      console.log(`Client Phone: ${order.clients.phone}`)
      
    } else {
      console.log('❌ Order not found with reference number: ERYOA4-9591656596')
      
      // Let's also search by partial reference number
      console.log('\n🔍 Searching for orders with similar reference numbers...')
      const similarOrders = await prisma.orders.findMany({
        where: {
          reference_number: {
            contains: 'ERYOA4'
          }
        },
        select: {
          id: true,
          reference_number: true,
          name: true,
          mobile: true,
          created_at: true
        },
        take: 10
      })
      
      if (similarOrders.length > 0) {
        console.log('📋 Found similar orders:')
        similarOrders.forEach(order => {
          console.log(`- ${order.reference_number} | ${order.name} | ${order.mobile} | ${order.created_at}`)
        })
      } else {
        console.log('No orders found with similar reference numbers')
      }
    }
    
  } catch (error) {
    console.error('❌ Error searching for order:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findOrder()
