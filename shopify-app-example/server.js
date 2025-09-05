const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Configuration
const SCAN2SHIP_API_URL = process.env.SCAN2SHIP_API_URL || 'https://your-app.vercel.app';
const SCAN2SHIP_API_KEY = process.env.SCAN2SHIP_API_KEY || 'your_api_key_here';

// Store for demo purposes (in production, use a database)
const integrations = new Map();

// Routes

// Home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Shopify OAuth callback
app.get('/auth/shopify/callback', async (req, res) => {
    try {
        const { code, state, shop } = req.query;
        
        if (!code || !state || !shop) {
            return res.status(400).send('Missing required parameters');
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
            client_id: process.env.SHOPIFY_CLIENT_ID,
            client_secret: process.env.SHOPIFY_CLIENT_SECRET,
            code
        });

        const accessToken = tokenResponse.data.access_token;

        // Store integration
        integrations.set(shop, {
            accessToken,
            connectedAt: new Date(),
            isActive: true
        });

        res.send(`
            <html>
                <body>
                    <h1>✅ Shopify Connected Successfully!</h1>
                    <p>Your Shopify store <strong>${shop}</strong> has been connected to Scan2Ship.</p>
                    <p>Orders will now automatically sync to your Scan2Ship dashboard.</p>
                    <a href="/">← Back to Dashboard</a>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send('Error connecting to Shopify');
    }
});

// Webhook handler for Shopify
app.post('/webhooks/shopify', (req, res) => {
    try {
        const signature = req.headers['x-shopify-hmac-sha256'];
        const shop = req.headers['x-shopify-shop-domain'];
        const topic = req.headers['x-shopify-topic'];

        // Verify webhook signature
        if (!verifyWebhookSignature(req.body, signature, process.env.SHOPIFY_WEBHOOK_SECRET)) {
            return res.status(401).send('Invalid signature');
        }

        const orderData = req.body;

        // Process different webhook topics
        switch (topic) {
            case 'orders/create':
                handleOrderCreate(shop, orderData);
                break;
            case 'orders/updated':
                handleOrderUpdate(shop, orderData);
                break;
            case 'orders/paid':
                handleOrderPaid(shop, orderData);
                break;
            case 'orders/cancelled':
                handleOrderCancelled(shop, orderData);
                break;
            default:
                console.log(`Unhandled webhook topic: ${topic}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Webhook processing error');
    }
});

// Helper functions

function verifyWebhookSignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const hash = hmac.digest('base64');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(hash, 'base64')
    );
}

async function handleOrderCreate(shop, orderData) {
    console.log(`Processing order create for ${shop}:`, orderData.id);
    
    try {
        // Transform Shopify order to Scan2Ship format
        const scan2shipOrder = transformShopifyOrder(orderData);
        
        // Send to Scan2Ship API
        await axios.post(`${SCAN2SHIP_API_URL}/api/external/orders`, scan2shipOrder, {
            headers: {
                'Authorization': `Bearer ${SCAN2SHIP_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Order ${orderData.id} synced to Scan2Ship successfully`);
    } catch (error) {
        console.error(`Error syncing order ${orderData.id}:`, error.message);
    }
}

async function handleOrderUpdate(shop, orderData) {
    console.log(`Processing order update for ${shop}:`, orderData.id);
    // Handle order updates
}

async function handleOrderPaid(shop, orderData) {
    console.log(`Processing order paid for ${shop}:`, orderData.id);
    // Handle paid orders - might trigger shipping
}

async function handleOrderCancelled(shop, orderData) {
    console.log(`Processing order cancelled for ${shop}:`, orderData.id);
    // Handle cancelled orders
}

function transformShopifyOrder(shopifyOrder) {
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    
    return {
        name: `${shippingAddress?.first_name || ''} ${shippingAddress?.last_name || ''}`.trim(),
        mobile: shopifyOrder.phone || shippingAddress?.phone || '',
        address: shippingAddress?.address1 || '',
        city: shippingAddress?.city || '',
        state: shippingAddress?.province || '',
        country: shippingAddress?.country || 'India',
        pincode: shippingAddress?.zip || '',
        courier_service: 'DELHIVERY', // Default courier
        pickup_location: 'Default Location', // Configure based on your setup
        package_value: parseFloat(shopifyOrder.total_price || 0),
        weight: calculateOrderWeight(shopifyOrder.line_items),
        total_items: shopifyOrder.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
        is_cod: shopifyOrder.payment_gateway_names?.includes('cash_on_delivery') || false,
        reference_number: shopifyOrder.name,
        product_description: shopifyOrder.line_items?.map(item => `${item.title} (Qty: ${item.quantity})`).join(', ') || 'Shopify Order'
    };
}

function calculateOrderWeight(lineItems) {
    // Simple weight calculation - in production, you'd get this from product data
    return lineItems?.reduce((total, item) => total + (item.quantity * 0.5), 0) || 1.0;
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Shopify Integration Server running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
    console.log(`🔗 Make sure to configure these environment variables:`);
    console.log(`   - SHOPIFY_CLIENT_ID`);
    console.log(`   - SHOPIFY_CLIENT_SECRET`);
    console.log(`   - SHOPIFY_WEBHOOK_SECRET`);
    console.log(`   - SCAN2SHIP_API_URL`);
    console.log(`   - SCAN2SHIP_API_KEY`);
});

module.exports = app;
