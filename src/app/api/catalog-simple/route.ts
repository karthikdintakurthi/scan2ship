import { NextRequest, NextResponse } from 'next/server';
import { getCatalogApiKey } from '@/lib/cross-app-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [CATALOG_SIMPLE] Starting request');
    
    const { action, data } = await request.json();
    console.log('🔍 [CATALOG_SIMPLE] Action:', action, 'Data:', data);
    
    const clientId = 'master-client-1756272680179';
    const catalogAuth = await getCatalogApiKey(clientId);
    
    if (!catalogAuth) {
      return NextResponse.json({
        error: 'Catalog app integration not configured for this client',
        requiresSetup: true
      }, { status: 400 });
    }
    
    console.log('🔍 [CATALOG_SIMPLE] Catalog auth found, making request to Catalog App');
    
    // Make request to Catalog App
    const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
    const searchParams = new URLSearchParams({
      search: data.query || '',
      page: data.page?.toString() || '1',
      limit: data.limit?.toString() || '10'
    });
    
    console.log('🔍 [CATALOG_SIMPLE] Making request to:', `${catalogUrl}/api/public/products?${searchParams}`);
    
    const response = await fetch(`${catalogUrl}/api/test-products?${searchParams}`, {
      method: 'GET',
      headers: {
        'X-API-Key': catalogAuth.catalogApiKey,
        'X-Client-ID': catalogAuth.catalogClientId,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🔍 [CATALOG_SIMPLE] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [CATALOG_SIMPLE] Catalog App error:', errorText);
      return NextResponse.json({
        error: 'Failed to fetch products from catalog',
        details: errorText
      }, { status: response.status });
    }
    
    const result = await response.json();
    console.log('🔍 [CATALOG_SIMPLE] Success, returning result');
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ [CATALOG_SIMPLE] Error:', error.message);
    console.error('❌ [CATALOG_SIMPLE] Stack:', error.stack);
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
