import { NextRequest, NextResponse } from 'next/server';
import { getCatalogApiKey } from '@/lib/cross-app-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [TEST_CATALOG] Starting test request');
    
    const clientId = 'master-client-1756272680179';
    console.log('🔍 [TEST_CATALOG] Getting catalog auth for client:', clientId);
    
    const catalogAuth = await getCatalogApiKey(clientId);
    console.log('🔍 [TEST_CATALOG] Catalog auth result:', catalogAuth ? 'FOUND' : 'NOT FOUND');
    
    if (catalogAuth) {
      console.log('🔍 [TEST_CATALOG] Auth details:', {
        catalogClientId: catalogAuth.catalogClientId,
        hasApiKey: !!catalogAuth.catalogApiKey
      });
    }
    
    return NextResponse.json({
      success: true,
      clientId,
      catalogAuth: catalogAuth ? {
        catalogClientId: catalogAuth.catalogClientId,
        hasApiKey: !!catalogAuth.catalogApiKey
      } : null
    });
    
  } catch (error: any) {
    console.error('❌ [TEST_CATALOG] Error:', error.message);
    console.error('❌ [TEST_CATALOG] Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
