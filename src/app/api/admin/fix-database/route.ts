import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [DB_FIX] Starting database schema fix...');
    
    // Check if tracking_status column exists
    const columnExists = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'tracking_status'
      AND table_schema = 'public'
    `;
    
    if (Array.isArray(columnExists) && columnExists.length === 0) {
      console.log('🔧 [DB_FIX] tracking_status column missing, adding it...');
      
      // Add the missing column
      await prisma.$executeRaw`
        ALTER TABLE "public"."orders" 
        ADD COLUMN "tracking_status" TEXT DEFAULT 'pending'
      `;
      
      console.log('✅ [DB_FIX] tracking_status column added successfully');
      
      return NextResponse.json({
        success: true,
        message: 'tracking_status column added successfully',
        action: 'column_added'
      });
    } else {
      console.log('✅ [DB_FIX] tracking_status column already exists');
      
      return NextResponse.json({
        success: true,
        message: 'tracking_status column already exists',
        action: 'no_action_needed'
      });
    }
    
  } catch (error) {
    console.error('❌ [DB_FIX] Error fixing database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fix database schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
