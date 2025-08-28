import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDelhiveryUrl: !!process.env.DELHIVERY_BASE_URL,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
      // Don't expose actual values, just check if they exist
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      delhiveryUrlLength: process.env.DELHIVERY_BASE_URL ? process.env.DELHIVERY_BASE_URL.length : 0,
      openaiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
    };

    return NextResponse.json({
      success: true,
      message: 'Environment variables check',
      data: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check environment variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
