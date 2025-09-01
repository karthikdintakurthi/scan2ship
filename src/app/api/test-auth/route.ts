import { NextRequest, NextResponse } from 'next/server';
import { enhancedJwtConfig } from '@/lib/jwt-config';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      // Test JWT verification
      const decoded = enhancedJwtConfig.verifyToken(token);
      
      return NextResponse.json({
        success: true,
        message: 'JWT verification successful',
        decoded: decoded
      });
      
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      
      return NextResponse.json({
        error: 'JWT verification failed',
        details: jwtError instanceof Error ? jwtError.message : 'Unknown error'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
