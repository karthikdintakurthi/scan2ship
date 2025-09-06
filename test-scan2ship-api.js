#!/usr/bin/env node

/**
 * Scan2Ship API Testing Script
 * 
 * This script tests all Scan2Ship API endpoints to ensure they're working correctly.
 * Run with: node test-scan2ship-api.js
 */

const SCAN2SHIP_CONFIG = {
  baseUrl: 'https://qa.scan2ship.in/api',
  bypassToken: 'scan2shiplogisticssupersecretkey',
  credentials: {
    email: 'test@scan2ship.com',
    password: 'ammananna'
  }
};

class Scan2ShipTester {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.bypassToken = config.bypassToken;
    this.credentials = config.credentials;
    this.jwtToken = null;
    this.tokenExpiry = null;
  }

  async getAuthHeaders() {
    if (!this.jwtToken || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
      await this.authenticate();
    }

    return {
      'Authorization': `Bearer ${this.jwtToken}`,
      'Content-Type': 'application/json',
      'x-vercel-protection-bypass': this.bypassToken
    };
  }

  async authenticate() {
    console.log('🔐 Authenticating with Scan2Ship...');
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-protection-bypass': this.bypassToken
        },
        body: JSON.stringify(this.credentials)
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.jwtToken = data.session.token;
      this.tokenExpiry = new Date(data.session.expiresAt);
      
      console.log('✅ Authentication successful');
      console.log(`   User: ${data.user.name} (${data.user.email})`);
      console.log(`   Client: ${data.user.clients.companyName}`);
      console.log(`   Token expires: ${this.tokenExpiry.toISOString()}`);
      
      return data;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  async testCourierServices() {
    console.log('\n📦 Testing courier services...');
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/courier-services`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch courier services: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Courier services fetched successfully');
      console.log(`   Found ${data.courierServices.length} courier services:`);
      
      data.courierServices.forEach(service => {
        console.log(`   - ${service.label} (${service.value}) - ${service.isActive ? 'Active' : 'Inactive'}`);
        if (service.ratePerKg) {
          console.log(`     Rate: ₹${service.ratePerKg}/kg`);
        }
      });

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch courier services:', error.message);
      throw error;
    }
  }

  async testCreateOrder() {
    console.log('\n📝 Testing order creation...');
    
    const orderData = {
      reference_number: `TEST-ORDER-${Date.now()}`,
      name: 'Test Customer',
      phone: '+91-9876543210',
      mobile: '+91-9876543210',
      address: '123 Test Street, Test Area',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      product_description: 'Test Product - API Integration Test',
      weight: 500,
      package_value: 1000,
      is_cod: false,
      cod_amount: 0,
      pickup_location: 'VIJAYA8 FRANCHISE',
      courier_service: 'delhivery',
      shipment_length: 20,
      shipment_breadth: 15,
      shipment_height: 10,
      total_items: 1
    };

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create order: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Order created successfully');
      console.log(`   Order ID: ${data.order.id}`);
      console.log(`   Reference: ${data.order.reference_number}`);
      console.log(`   Tracking ID: ${data.order.tracking_id || 'N/A'}`);
      console.log(`   Status: ${data.order.status}`);

      return data;
    } catch (error) {
      console.error('❌ Failed to create order:', error.message);
      throw error;
    }
  }

  async testGetOrders() {
    console.log('\n📋 Testing order listing...');
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders?page=1&limit=5`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Orders fetched successfully');
      console.log(`   Found ${data.orders.length} orders (Page ${data.pagination.page} of ${data.pagination.totalPages})`);
      
      data.orders.forEach(order => {
        console.log(`   - ${order.reference_number} (${order.status}) - ${new Date(order.createdAt).toLocaleDateString()}`);
      });

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error.message);
      throw error;
    }
  }

  async testOrderTracking(orderId) {
    console.log('\n🔍 Testing order tracking...');
    
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/tracking`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch tracking: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Tracking information fetched successfully');
      console.log(`   Order ID: ${data.orderId}`);
      console.log(`   Tracking ID: ${data.trackingId}`);
      console.log(`   Status: ${data.status}`);
      
      if (data.trackingHistory && data.trackingHistory.length > 0) {
        console.log('   Tracking History:');
        data.trackingHistory.forEach(entry => {
          console.log(`     - ${entry.status} at ${entry.location} (${new Date(entry.timestamp).toLocaleString()})`);
        });
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch tracking:', error.message);
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Scan2Ship API Tests\n');
    console.log('=' .repeat(50));
    
    const results = {
      authentication: false,
      courierServices: false,
      createOrder: false,
      getOrders: false,
      tracking: false
    };

    try {
      // Test 1: Authentication
      await this.authenticate();
      results.authentication = true;

      // Test 2: Courier Services
      await this.testCourierServices();
      results.courierServices = true;

      // Test 3: Create Order
      const orderResult = await this.testCreateOrder();
      results.createOrder = true;

      // Test 4: Get Orders
      await this.testGetOrders();
      results.getOrders = true;

      // Test 5: Order Tracking (if order was created)
      if (orderResult && orderResult.order && orderResult.order.id) {
        await this.testOrderTracking(orderResult.order.id);
        results.tracking = true;
      }

      // Summary
      console.log('\n' + '=' .repeat(50));
      console.log('📊 Test Results Summary:');
      console.log('=' .repeat(50));
      
      Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`${status} ${testName}`);
      });

      const passedTests = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;
      
      console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
      
      if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Scan2Ship API integration is working correctly.');
      } else {
        console.log('⚠️  Some tests failed. Please check the errors above.');
      }

    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your internet connection');
      console.log('2. Verify Scan2Ship API is accessible');
      console.log('3. Check credentials and bypass token');
      console.log('4. Review API documentation for any changes');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new Scan2ShipTester(SCAN2SHIP_CONFIG);
  tester.runAllTests().catch(console.error);
}

module.exports = Scan2ShipTester;
