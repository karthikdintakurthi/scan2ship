import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 [CACHE_CLEAR] Clearing cache for all clients...');
    
    // Get all clients controlled by this service worker
    const clients = await self.clients.matchAll();
    
    // Send cache clear message to all clients
    const clearPromises = clients.map(client => {
      return client.postMessage({
        type: 'CLEAR_CACHE',
        timestamp: Date.now()
      });
    });
    
    await Promise.all(clearPromises);
    
    console.log(`✅ [CACHE_CLEAR] Cache clear message sent to ${clients.length} clients`);
    
    return NextResponse.json({
      success: true,
      message: `Cache clear message sent to ${clients.length} clients`,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ [CACHE_CLEAR] Error clearing cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Cache clear endpoint - use POST to clear cache',
    timestamp: Date.now()
  });
}
