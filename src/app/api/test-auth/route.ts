import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST_AUTH] Test endpoint called');
    console.log('🧪 [TEST_AUTH] Request headers:', Object.fromEntries(request.headers.entries()));
    
    const authHeader = request.headers.get('authorization');
    console.log('🧪 [TEST_AUTH] Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No valid Authorization header',
        headers: Object.fromEntries(request.headers.entries())
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('🧪 [TEST_AUTH] Token length:', token.length);
    
    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ 
        error: 'JWT_SECRET not configured',
        env: {
          hasJwtSecret: !!process.env.JWT_SECRET,
          nodeEnv: process.env.NODE_ENV
        }
      }, { status: 500 });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      console.log('🧪 [TEST_AUTH] JWT decoded successfully:', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp
      });
      
      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        },
        token: {
          issuedAt: new Date(decoded.iat * 1000).toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          isValid: decoded.exp > Date.now() / 1000
        }
      });
      
    } catch (jwtError) {
      console.error('🧪 [TEST_AUTH] JWT verification failed:', jwtError);
      return NextResponse.json({ 
        error: 'JWT verification failed',
        details: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error'
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('🧪 [TEST_AUTH] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
