import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';

/**
 * Catalog Integration API
 * Handles catalog app authentication and product synchronization
 */

// POST /api/catalog/auth - Authenticate with catalog app
export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { user, client } = authResult;
    const { action, data } = await request.json();

    switch (action) {
      case 'authenticate':
        return await handleCatalogAuthentication(data, client);
      
      case 'search_products':
        return await handleProductSearch(data, client);
      
      case 'get_product':
        return await handleGetProduct(data, client);
      
      case 'check_inventory':
        return await handleInventoryCheck(data, client);
      
      case 'reduce_inventory':
        return await handleInventoryReduction(data, client);
      
      case 'restore_inventory':
        return await handleInventoryRestoration(data, client);
      
      case 'logout':
        return await handleCatalogLogout(data, client);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Catalog API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCatalogAuthentication(data: any, client: any) {
  try {
    const { email, password } = data;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Call catalog app authentication
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Catalog authentication failed' },
        { status: 401 }
      );
    }

    const authData = await response.json();
    
    // Decode JWT token to get expiration time
    const jwt = require('jsonwebtoken');
    let tokenExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // Default 8 hours
    
    try {
      const decoded = jwt.decode(authData.token);
      if (decoded && decoded.exp) {
        tokenExpiresAt = new Date(decoded.exp * 1000);
      }
    } catch (error) {
      console.warn('Could not decode JWT token for expiration time:', error);
    }
    
    // Store catalog session details
    await prisma.catalog_sessions.upsert({
      where: {
        scan2shipClientId: client.id
      },
      update: {
        catalogClientId: authData.user.clientId,
        catalogUserId: authData.user.id,
        catalogUserEmail: authData.user.email,
        catalogUserRole: authData.user.role,
        catalogClientSlug: authData.user.client?.slug || null,
        authToken: authData.token,
        tokenExpiresAt: tokenExpiresAt,
        isActive: true,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        scan2shipClientId: client.id,
        catalogClientId: authData.user.clientId,
        catalogUserId: authData.user.id,
        catalogUserEmail: authData.user.email,
        catalogUserRole: authData.user.role,
        catalogClientSlug: authData.user.client?.slug || null,
        authToken: authData.token,
        tokenExpiresAt: tokenExpiresAt,
        isActive: true,
        lastUsedAt: new Date()
      }
    });
    
    // Also store in client_config for backward compatibility
    await prisma.client_config.upsert({
      where: {
        clientId_key: {
          clientId: client.id,
          key: 'catalog_auth_token'
        }
      },
      update: {
        value: authData.token,
        type: 'string',
        category: 'catalog',
        description: 'Catalog app authentication token',
        isEncrypted: true,
        updatedAt: new Date()
      },
      create: {
        id: `catalog_auth_${client.id}_${Date.now()}`,
        clientId: client.id,
        key: 'catalog_auth_token',
        value: authData.token,
        type: 'string',
        category: 'catalog',
        description: 'Catalog app authentication token',
        isEncrypted: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully authenticated with catalog app',
      user: authData.user
    });

  } catch (error: any) {
    console.error('Catalog authentication error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with catalog app' },
      { status: 500 }
    );
  }
}

async function handleProductSearch(data: any, client: any) {
  try {
    const { query, page = 1, limit = 20 } = data;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Get catalog session details
    const { getCatalogSessionForApi } = await import('@/lib/catalog-session');
    const sessionData = await getCatalogSessionForApi(client.id);

    if (!sessionData) {
      return NextResponse.json(
        { 
          error: 'Catalog authentication required. Please login to catalog first.',
          requiresLogin: true
        },
        { status: 401 }
      );
    }

    // Call catalog app product search
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const searchParams = new URLSearchParams({
      search: query,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${catalogUrl}/api/products?${searchParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionData.authToken}`,
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

async function handleGetProduct(data: any, client: any) {
  try {
    const { sku } = data;
    
    if (!sku) {
      return NextResponse.json(
        { error: 'SKU is required' },
        { status: 400 }
      );
    }

    // Get catalog session details
    const { getCatalogSessionForApi } = await import('@/lib/catalog-session');
    const sessionData = await getCatalogSessionForApi(client.id);

    if (!sessionData) {
      return NextResponse.json(
        { 
          error: 'Catalog authentication required. Please login to catalog first.',
          requiresLogin: true
        },
        { status: 401 }
      );
    }

    // Call catalog app get product by SKU
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/products/sku/${encodeURIComponent(sku)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionData.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
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

async function handleInventoryCheck(data: any, client: any) {
  try {
    const { items } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Call catalog app inventory check
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/inventory/check?client=${client.slug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to check inventory' },
        { status: response.status }
      );
    }

    const inventoryData = await response.json();
    return NextResponse.json(inventoryData);

  } catch (error: any) {
    console.error('Inventory check error:', error);
    return NextResponse.json(
      { error: 'Failed to check inventory' },
      { status: 500 }
    );
  }
}

async function handleInventoryReduction(data: any, client: any) {
  try {
    const { items, orderId } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Get catalog session details
    const sessionData = await getCatalogSessionForApi(client.id);
    
    if (!sessionData) {
      return NextResponse.json(
        { 
          error: 'Catalog authentication required. Please login to catalog first.',
          requiresLogin: true
        },
        { status: 401 }
      );
    }

    // Call catalog app inventory reduction
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/inventory/reduce?client=${sessionData.catalogClientSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        items,
        orderId: orderId || `scan2ship-${Date.now()}`
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to reduce inventory' },
        { status: response.status }
      );
    }

    const inventoryData = await response.json();
    return NextResponse.json(inventoryData);

  } catch (error: any) {
    console.error('Inventory reduction error:', error);
    return NextResponse.json(
      { error: 'Failed to reduce inventory' },
      { status: 500 }
    );
  }
}

async function handleInventoryRestoration(data: any, client: any) {
  try {
    const { items } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Call catalog app inventory restoration
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${catalogUrl}/api/public/inventory/restore?client=${client.slug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to restore inventory' },
        { status: response.status }
      );
    }

    const inventoryData = await response.json();
    return NextResponse.json(inventoryData);

  } catch (error: any) {
    console.error('Inventory restoration error:', error);
    return NextResponse.json(
      { error: 'Failed to restore inventory' },
      { status: 500 }
    );
  }
}

async function handleCatalogLogout(data: any, client: any) {
  try {
    // Invalidate catalog session
    const { invalidateCatalogSession } = await import('@/lib/catalog-session');
    await invalidateCatalogSession(client.id);

    return NextResponse.json({
      success: true,
      message: 'Successfully logged out from catalog app'
    });

  } catch (error: any) {
    console.error('Catalog logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout from catalog app' },
      { status: 500 }
    );
  }
}
