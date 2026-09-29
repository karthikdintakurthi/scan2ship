import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { getCatalogApiKey } from '@/lib/cross-app-auth';
import { findAccessibleOrder } from '@/lib/application/policy';
import { inventoryItemsFromOrder, parseCatalogOrderId } from '@/lib/application/catalog-inventory';

const CATALOG_ACTIONS = ['test_connection', 'search_products', 'get_product', 'check_inventory', 'reduce_inventory'];
const INVENTORY_WRITE_ACTIONS = ['reduce_inventory'];

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
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const client = user.client;

    const { action, data } = (await request.json()) ?? {};
    console.log('🔍 [CATALOG_API] Request action:', action);

    if (!CATALOG_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${CATALOG_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (INVENTORY_WRITE_ACTIONS.includes(action) && !user.permissions.includes(PermissionLevel.WRITE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Inventory is reduced only for an order the caller can access, using that order's stored items
    let reductionOrder: { id: number; items: { sku: string; quantity: number }[] } | null = null;
    if (action === 'reduce_inventory') {
      const orderId = parseCatalogOrderId(data);
      const order = orderId ? await findAccessibleOrder(user, orderId, { select: { id: true, products: true } }) : null;
      if (!order) {
        return NextResponse.json({ error: 'A valid orderId for one of your orders is required' }, { status: 404 });
      }
      const items = inventoryItemsFromOrder(order.products);
      if (items.length === 0) {
        return NextResponse.json({ error: 'This order has no catalog products to reduce' }, { status: 400 });
      }
      reductionOrder = { id: order.id, items };
    }

    // Fetch complete client data for inventory operations
    let fullClient: any = client;
    if (action === 'reduce_inventory') {
      try {
        fullClient = await prisma.clients.findUnique({
          where: { id: client.id },
          select: {
            id: true,
            name: true,
            slug: true,
            companyName: true,
            isActive: true,
            subscriptionStatus: true,
            subscriptionExpiresAt: true
          }
        }) ?? client;
      } catch (error) {
        console.error('Error fetching full client data:', error);
        fullClient = client;
      }
    }

    const catalogAuth = await getCatalogApiKey(fullClient.id);

    if (!catalogAuth) {
      console.log('❌ [CATALOG_API] No catalog auth found for client:', fullClient.id);
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
        return await handleTestConnection(data, fullClient, catalogAuth);

      case 'search_products':
        return await handleProductSearch(data, fullClient, catalogAuth);

      case 'get_product':
        return await handleGetProduct(data, fullClient, catalogAuth);

      case 'check_inventory':
        return await handleInventoryCheck(data, fullClient, catalogAuth);

      default:
        return await handleInventoryReduction(reductionOrder!, fullClient, catalogAuth);
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

async function handleInventoryReduction(
  order: { id: number; items: { sku: string; quantity: number }[] },
  client: any,
  catalogAuth: any
) {
  try {
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

    // Same order reference that order deletion uses when it restores inventory
    const catalogOrderId = `scan2ship_order_${order.id}`;
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/inventory/reduce/bulk?client=${clientSlug}`, {
      method: 'POST',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orders: [{ orderId: catalogOrderId, items: order.items }],
        reduceMode: 'strict',
        batchId: catalogOrderId
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
    console.log('✅ [INVENTORY_REDUCTION] Reduced inventory for order', order.id);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Inventory reduction error:', error);
    return NextResponse.json(
      { error: 'Failed to reduce inventory' },
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