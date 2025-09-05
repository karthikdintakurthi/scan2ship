require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

// Database connections
const qaDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway'
    }
  }
});

const localDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:OMqLdGotCnTMFiWoWQATmnCRplSvKkhZ@mainline.proxy.rlwy.net:13785/railway'
    }
  }
});

async function copyDataFromQA() {
  console.log('🚀 Starting data migration from QA to Local...\n');

  try {
    // Test connections
    console.log('📡 Testing database connections...');
    await qaDb.$queryRaw`SELECT 1`;
    await localDb.$queryRaw`SELECT 1`;
    console.log('✅ Both database connections successful\n');

    // Clear local database first (in reverse order of dependencies)
    console.log('🧹 Clearing local database...');
    await localDb.credit_transactions.deleteMany();
    await localDb.order_analytics.deleteMany();
    await localDb.analytics_events.deleteMany();
    await localDb.orders.deleteMany();
    await localDb.sessions.deleteMany();
    await localDb.users.deleteMany();
    await localDb.pickup_locations.deleteMany();
    await localDb.courier_services.deleteMany();
    await localDb.client_credit_costs.deleteMany();
    await localDb.client_credits.deleteMany();
    await localDb.client_order_configs.deleteMany();
    await localDb.client_config.deleteMany();
    await localDb.clients.deleteMany();
    await localDb.system_config.deleteMany();
    console.log('✅ Local database cleared\n');

    // Copy system_config
    console.log('📋 Copying system_config...');
    const systemConfigs = await qaDb.system_config.findMany();
    if (systemConfigs.length > 0) {
      await localDb.system_config.createMany({
        data: systemConfigs.map(config => ({
          id: config.id,
          key: config.key,
          value: config.value,
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: config.isEncrypted,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        }))
      });
      console.log(`✅ Copied ${systemConfigs.length} system configs`);
    }

    // Copy clients
    console.log('🏢 Copying clients...');
    const clients = await qaDb.clients.findMany();
    if (clients.length > 0) {
      await localDb.clients.createMany({
        data: clients.map(client => ({
          id: client.id,
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          country: client.country,
          pincode: client.pincode,
          subscriptionPlan: client.subscriptionPlan,
          subscriptionStatus: client.subscriptionStatus,
          subscriptionExpiresAt: client.subscriptionExpiresAt,
          isActive: client.isActive,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt
        }))
      });
      console.log(`✅ Copied ${clients.length} clients`);
    }

    // Copy client_config
    console.log('⚙️ Copying client_config...');
    const clientConfigs = await qaDb.client_config.findMany();
    if (clientConfigs.length > 0) {
      await localDb.client_config.createMany({
        data: clientConfigs.map(config => ({
          id: config.id,
          key: config.key,
          value: config.value,
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: config.isEncrypted,
          clientId: config.clientId,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        }))
      });
      console.log(`✅ Copied ${clientConfigs.length} client configs`);
    }

    // Copy client_credits
    console.log('💰 Copying client_credits...');
    const clientCredits = await qaDb.client_credits.findMany();
    if (clientCredits.length > 0) {
      await localDb.client_credits.createMany({
        data: clientCredits.map(credit => ({
          id: credit.id,
          balance: credit.balance,
          totalAdded: credit.totalAdded,
          totalUsed: credit.totalUsed,
          clientId: credit.clientId,
          createdAt: credit.createdAt,
          updatedAt: credit.updatedAt
        }))
      });
      console.log(`✅ Copied ${clientCredits.length} client credits`);
    }

    // Copy client_credit_costs
    console.log('💳 Copying client_credit_costs...');
    const creditCosts = await qaDb.client_credit_costs.findMany();
    if (creditCosts.length > 0) {
      await localDb.client_credit_costs.createMany({
        data: creditCosts.map(cost => ({
          id: cost.id,
          feature: cost.feature,
          cost: cost.cost,
          clientId: cost.clientId,
          createdAt: cost.createdAt,
          updatedAt: cost.updatedAt
        }))
      });
      console.log(`✅ Copied ${creditCosts.length} credit costs`);
    }

    // Copy client_order_configs
    console.log('📦 Copying client_order_configs...');
    const orderConfigs = await qaDb.client_order_configs.findMany();
    if (orderConfigs.length > 0) {
      await localDb.client_order_configs.createMany({
        data: orderConfigs.map(config => ({
          id: config.id,
          enableReferencePrefix: true, // Default value since QA doesn't have this field
          clientId: config.clientId
        }))
      });
      console.log(`✅ Copied ${orderConfigs.length} order configs`);
    }

    // Copy courier_services
    console.log('🚚 Copying courier_services...');
    const courierServices = await qaDb.courier_services.findMany();
    if (courierServices.length > 0) {
      await localDb.courier_services.createMany({
        data: courierServices.map(service => ({
          id: service.id,
          isActive: service.isActive,
          clientId: service.clientId,
          isDefault: service.isDefault,
          code: service.code,
          name: service.name
        }))
      });
      console.log(`✅ Copied ${courierServices.length} courier services`);
    }

    // Copy pickup_locations
    console.log('📍 Copying pickup_locations...');
    const pickupLocations = await qaDb.pickup_locations.findMany();
    if (pickupLocations.length > 0) {
      await localDb.pickup_locations.createMany({
        data: pickupLocations.map(location => ({
          id: location.id,
          value: location.value,
          label: location.label,
          delhiveryApiKey: location.delhiveryApiKey,
          clientId: location.clientId
        }))
      });
      console.log(`✅ Copied ${pickupLocations.length} pickup locations`);
    }

    // Copy users
    console.log('👥 Copying users...');
    const users = await qaDb.users.findMany();
    if (users.length > 0) {
      await localDb.users.createMany({
        data: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          clientId: user.clientId
        }))
      });
      console.log(`✅ Copied ${users.length} users`);
    }

    // Copy sessions
    console.log('🔐 Copying sessions...');
    const sessions = await qaDb.sessions.findMany();
    if (sessions.length > 0) {
      await localDb.sessions.createMany({
        data: sessions.map(session => ({
          id: session.id,
          userId: session.userId,
          clientId: session.clientId,
          token: session.token,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt
        }))
      });
      console.log(`✅ Copied ${sessions.length} sessions`);
    }

    // Copy orders
    console.log('📋 Copying orders...');
    const orders = await qaDb.orders.findMany();
    if (orders.length > 0) {
      await localDb.orders.createMany({
        data: orders.map(order => ({
          id: order.id,
          clientId: order.clientId,
          name: order.name,
          mobile: order.mobile,
          phone: order.phone,
          address: order.address,
          city: order.city,
          state: order.state,
          country: order.country,
          pincode: order.pincode,
          courier_service: order.courier_service,
          pickup_location: order.pickup_location,
          package_value: order.package_value,
          weight: order.weight,
          total_items: order.total_items,
          tracking_id: order.tracking_id,
          reference_number: order.reference_number,
          is_cod: order.is_cod,
          cod_amount: order.cod_amount,
          reseller_name: order.reseller_name,
          reseller_mobile: order.reseller_mobile,
          created_at: order.created_at,
          updated_at: order.updated_at,
          delhivery_waybill_number: order.delhivery_waybill_number,
          delhivery_order_id: order.delhivery_order_id,
          delhivery_api_status: order.delhivery_api_status,
          delhivery_api_error: order.delhivery_api_error,
          delhivery_retry_count: order.delhivery_retry_count,
          last_delhivery_attempt: order.last_delhivery_attempt,
          shipment_length: order.shipment_length,
          shipment_breadth: order.shipment_breadth,
          shipment_height: order.shipment_height,
          product_description: order.product_description,
          return_address: order.return_address,
          return_pincode: order.return_pincode,
          fragile_shipment: order.fragile_shipment,
          seller_name: order.seller_name,
          seller_address: order.seller_address,
          seller_gst: order.seller_gst,
          invoice_number: order.invoice_number,
          commodity_value: order.commodity_value,
          tax_value: order.tax_value,
          category_of_goods: order.category_of_goods,
          vendor_pickup_location: order.vendor_pickup_location,
          hsn_code: order.hsn_code,
          seller_cst_no: order.seller_cst_no,
          seller_tin: order.seller_tin,
          invoice_date: order.invoice_date,
          return_reason: order.return_reason,
          ewbn: order.ewbn
        }))
      });
      console.log(`✅ Copied ${orders.length} orders`);
    }

    // Copy credit_transactions
    console.log('💸 Copying credit_transactions...');
    const creditTransactions = await qaDb.credit_transactions.findMany();
    if (creditTransactions.length > 0) {
      // Get client names for transactions
      const clientIds = [...new Set(creditTransactions.map(t => t.clientId))];
      const clients = await qaDb.clients.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, companyName: true }
      });
      const clientMap = new Map(clients.map(c => [c.id, c.companyName]));

      await localDb.credit_transactions.createMany({
        data: creditTransactions.map(transaction => ({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          balance: transaction.balance,
          description: transaction.description,
          feature: transaction.feature,
          orderId: transaction.orderId,
          clientId: transaction.clientId,
          userId: transaction.userId,
          clientName: clientMap.get(transaction.clientId) || 'Unknown Client',
          createdAt: transaction.createdAt
        }))
      });
      console.log(`✅ Copied ${creditTransactions.length} credit transactions`);
    }

    // Copy analytics_events
    console.log('📊 Copying analytics_events...');
    const analyticsEvents = await qaDb.analytics_events.findMany();
    if (analyticsEvents.length > 0) {
      await localDb.analytics_events.createMany({
        data: analyticsEvents.map(event => ({
          id: event.id,
          eventType: event.eventType,
          eventData: event.eventData,
          clientId: event.clientId,
          userId: event.userId,
          createdAt: event.createdAt
        }))
      });
      console.log(`✅ Copied ${analyticsEvents.length} analytics events`);
    }

    // Copy order_analytics
    console.log('📈 Copying order_analytics...');
    const orderAnalytics = await qaDb.order_analytics.findMany();
    if (orderAnalytics.length > 0) {
      await localDb.order_analytics.createMany({
        data: orderAnalytics.map(analytics => ({
          id: analytics.id,
          orderId: analytics.orderId,
          clientId: analytics.clientId,
          userId: analytics.userId,
          creationPattern: 'migrated', // Default value for migrated data
          createdAt: analytics.createdAt
        }))
      });
      console.log(`✅ Copied ${orderAnalytics.length} order analytics`);
    }

    console.log('\n🎉 Data migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Clients: ${clients.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Orders: ${orders.length}`);
    console.log(`   - Credit Transactions: ${creditTransactions.length}`);
    console.log(`   - Analytics Events: ${analyticsEvents.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await qaDb.$disconnect();
    await localDb.$disconnect();
  }
}

// Run the migration
copyDataFromQA()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
