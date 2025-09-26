import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { getCatalogApiKey } from '@/lib/cross-app-auth';

/**
 * Catalog Integration API
 * Handles product synchronization using Cross-App Mappings
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [CATALOG_API] Starting catalog API request');
    
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      console.log('🔍 [CATALOG_API] Security middleware blocked request');
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authenticate user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { user } = authResult;
    const client = user.client;
    console.log('🔍 [CATALOG_API] Using client:', client);
    console.log('🔍 [CATALOG_API] Parsing request body...');
    const { action, data } = await request.json();
    console.log('🔍 [CATALOG_API] Request parsed - action:', action, 'data:', data);

    // Get catalog API key for this scan2ship client
    console.log('🔍 [CATALOG_API] Getting catalog auth for client:', client.id);
    const catalogAuth = await getCatalogApiKey(client.id);
    console.log('🔍 [CATALOG_API] Catalog auth result:', catalogAuth ? 'FOUND' : 'NOT FOUND');
    
    if (!catalogAuth) {
      console.log('❌ [CATALOG_API] No catalog auth found for client:', client.id);
      return NextResponse.json(
        { 
          error: 'Catalog app integration not configured for this client',
          requiresSetup: true
        },
        { status: 400 }
      );
    }

    switch (action) {
      case 'test_connection':
        return await handleTestConnection(data, client, catalogAuth);
      
      case 'search_products':
        return await handleProductSearch(data, client, catalogAuth);
      
      case 'get_product':
        return await handleGetProduct(data, client, catalogAuth);
      
      case 'check_inventory':
        return await handleInventoryCheck(data, client, catalogAuth);
      
      case 'reduce_inventory':
        return await handleInventoryReduction(data, client, catalogAuth);
      
      case 'restore_inventory':
        return await handleInventoryRestoration(data, client, catalogAuth);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ [CATALOG_API] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

async function handleProductSearch(data: any, client: any, catalogAuth: any) {
  try {
    const { query, page = 1, limit = 20 } = data;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Call catalog app product search using API key
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    console.log('🔍 [CATALOG_API] Environment check:');
    console.log('  - CATALOG_APP_URL env var:', process.env.CATALOG_APP_URL);
    console.log('  - Final catalogUrl:', catalogUrl);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    
    const searchParams = new URLSearchParams({
      search: query,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${catalogUrl}/api/public/products?${searchParams}`, {
      method: 'GET',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to search products' },
        { status: response.status }
      );
    }

    const searchResults = await response.json();
    return NextResponse.json(searchResults);

  } catch (error: any) {
    console.error('Product search error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}

async function handleGetProduct(data: any, client: any, catalogAuth: any) {
  try {
    const { sku } = data;
    
    if (!sku) {
      return NextResponse.json(
        { error: 'SKU is required' },
        { status: 400 }
      );
    }

    // Call catalog app get product by SKU using API key
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/products/sku/${encodeURIComponent(sku)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to get product' },
        { status: response.status }
      );
    }

    const product = await response.json();
    return NextResponse.json(product);

  } catch (error: any) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Failed to get product' },
      { status: 500 }
    );
  }
}

async function handleInventoryCheck(data: any, client: any, catalogAuth: any) {
  try {
    const { sku } = data;
    
    if (!sku) {
      return NextResponse.json(
        { error: 'SKU is required' },
        { status: 400 }
      );
    }

    // Call catalog app inventory check using API key
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/inventory/check`, {
      method: 'POST',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sku }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to check inventory' },
        { status: response.status }
      );
    }

    const inventory = await response.json();
    return NextResponse.json(inventory);

  } catch (error: any) {
    console.error('Inventory check error:', error);
    return NextResponse.json(
      { error: 'Failed to check inventory' },
      { status: 500 }
    );
  }
}

async function handleInventoryReduction(data: any, client: any, catalogAuth: any) {
  try {
    const { items, orderNumber } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.sku || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Each item must have a valid SKU and positive quantity' },
          { status: 400 }
        );
      }
    }

    // Get client slug for catalog app
    let clientSlug = client.slug;
    if (!clientSlug) {
      // Generate slug from company name or name
      const baseName = client.companyName || client.name || 'default-client';
      clientSlug = baseName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    if (!clientSlug) {
      return NextResponse.json(
        { error: 'Client slug is required for inventory reduction' },
        { status: 400 }
      );
    }

    // Call catalog app bulk inventory reduction using API key
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/inventory/reduce/bulk?client=${clientSlug}`, {
      method: 'POST',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orders: [{
          orderId: orderNumber || `scan2ship_${Date.now()}`,
          items: items.map(item => ({
            sku: item.sku,
            quantity: item.quantity
          }))
        }],
        reduceMode: 'strict',
        batchId: `scan2ship_${Date.now()}`
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Catalog app inventory reduction failed:', error);
      return NextResponse.json(
        { error: error.error || 'Failed to reduce inventory' },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ [INVENTORY_REDUCTION] Successfully reduced inventory:', result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Inventory reduction error:', error);
    return NextResponse.json(
      { error: 'Failed to reduce inventory' },
      { status: 500 }
    );
  }
}

async function handleInventoryRestoration(data: any, client: any, catalogAuth: any) {
  try {
    const { sku, quantity } = data;
    
    if (!sku || !quantity) {
      return NextResponse.json(
        { error: 'SKU and quantity are required' },
        { status: 400 }
      );
    }

    // Call catalog app inventory restoration using API key
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/inventory/restore`, {
      method: 'POST',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sku, quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to restore inventory' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Inventory restoration error:', error);
    return NextResponse.json(
      { error: 'Failed to restore inventory' },
      { status: 500 }
    );
  }
}

async function handleTestConnection(data: any, client: any, catalogAuth: any) {
  try {
    console.log('🔍 [TEST_CONNECTION] Testing catalog connection for client:', client.id);
    
    // Test the connection by making a simple request to the Catalog App
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/products?search=test&page=1&limit=1`, {
      method: 'GET',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TEST_CONNECTION] Catalog App error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Catalog App',
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('✅ [TEST_CONNECTION] Connection test successful');
    
    return NextResponse.json({
      success: true,
      message: 'Connection test successful',
      catalogApp: {
        url: catalogUrl,
        status: 'connected',
        responseTime: Date.now()
      },
      client: {
        id: client.id,
        name: client.name
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST_CONNECTION] Error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    }, { status: 500 });
  }
}