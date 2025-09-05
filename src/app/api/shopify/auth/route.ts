import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/shopify/auth - Initiate Shopify OAuth
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const shop = searchParams.get('shop');
    const redirectUri = searchParams.get('redirect_uri');

    if (!clientId || !shop || !redirectUri) {
      return NextResponse.json({ 
        error: 'Missing required parameters: client_id, shop, redirect_uri' 
      }, { status: 400 });
    }

    // Validate client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });

    if (!client || !client.isActive) {
      return NextResponse.json({ 
        error: 'Invalid or inactive client' 
      }, { status: 400 });
    }

    // Validate shop domain
    if (!shop.endsWith('.myshopify.com')) {
      return NextResponse.json({ 
        error: 'Invalid shop domain' 
      }, { status: 400 });
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in database for validation
    await prisma.system_config.upsert({
      where: { key: `shopify_oauth_state_${state}` },
      update: { 
        value: JSON.stringify({ clientId, shop, redirectUri, timestamp: Date.now() }),
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        key: `shopify_oauth_state_${state}`,
        value: JSON.stringify({ clientId, shop, redirectUri, timestamp: Date.now() }),
        type: 'json',
        category: 'shopify_oauth'
      }
    });

    // Build Shopify OAuth URL
    const shopifyClientId = process.env.SHOPIFY_CLIENT_ID;
    const scopes = 'read_orders,write_orders,read_products,read_customers';
    
    if (!shopifyClientId) {
      return NextResponse.json({ 
        error: 'Shopify client ID not configured' 
      }, { status: 500 });
    }

    const authUrl = `https://${shop}/admin/oauth/authorize?` + new URLSearchParams({
      client_id: shopifyClientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state
    });

    return NextResponse.json({
      authUrl,
      state
    });
  } catch (error) {
    console.error('Shopify auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shopify/auth/callback - Handle Shopify OAuth callback
export async function POST(request: NextRequest) {
  try {
    const { code, state, shop } = await request.json();

    if (!code || !state || !shop) {
      return NextResponse.json({ 
        error: 'Missing required parameters: code, state, shop' 
      }, { status: 400 });
    }

    // Validate state parameter
    const stateConfig = await prisma.system_config.findUnique({
      where: { key: `shopify_oauth_state_${state}` }
    });

    if (!stateConfig) {
      return NextResponse.json({ 
        error: 'Invalid state parameter' 
      }, { status: 400 });
    }

    const stateData = JSON.parse(stateConfig.value);
    
    // Check if state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.json({ 
        error: 'State parameter expired' 
      }, { status: 400 });
    }

    // Exchange code for access token
    const shopifyClientId = process.env.SHOPIFY_CLIENT_ID;
    const shopifyClientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    
    if (!shopifyClientId || !shopifyClientSecret) {
      return NextResponse.json({ 
        error: 'Shopify credentials not configured' 
      }, { status: 500 });
    }

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: shopifyClientId,
        client_secret: shopifyClientSecret,
        code
      })
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to exchange code for access token' 
      }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Store integration in database
    const integration = await prisma.shopify_integrations.upsert({
      where: {
        shopDomain_clientId: {
          shopDomain: shop,
          clientId: stateData.clientId
        }
      },
      update: {
        accessToken,
        isActive: true,
        syncStatus: 'active',
        lastSyncAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        clientId: stateData.clientId,
        shopDomain: shop,
        accessToken,
        isActive: true,
        syncStatus: 'active',
        lastSyncAt: new Date()
      }
    });

    // Clean up state
    await prisma.system_config.delete({
      where: { key: `shopify_oauth_state_${state}` }
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        shopDomain: integration.shopDomain,
        syncStatus: integration.syncStatus,
        lastSyncAt: integration.lastSyncAt
      }
    });
  } catch (error) {
    console.error('Shopify callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
