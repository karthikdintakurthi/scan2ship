import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 [TEST_CLEAR_CACHE] Clearing courier service cache');
    
    // Clear courier service cache
    const { clearCourierServiceCache } = await import('@/lib/courier-service-config');
    clearCourierServiceCache();
    
    // Clear pickup location cache
    const { clearPickupLocationCache } = await import('@/lib/pickup-location-config');
    clearPickupLocationCache();
    
    console.log('✅ [TEST_CLEAR_CACHE] Cache cleared successfully');
    
    return NextResponse.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST_CLEAR_CACHE] Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
