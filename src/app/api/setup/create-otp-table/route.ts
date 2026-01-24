/**
 * One-time setup endpoint to create the otp_sessions table
 * This can be called once to set up the table
 * DELETE THIS FILE after running it once for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating otp_sessions table...');

    // Create table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "otp_sessions" (
        "id" TEXT NOT NULL,
        "sessionId" TEXT NOT NULL,
        "mobile" TEXT NOT NULL,
        "otp" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
      )
    `;

    // Create unique index on sessionId
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "otp_sessions_sessionId_key" ON "otp_sessions"("sessionId")
    `;

    // Create index on expiresAt
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "otp_sessions_expiresAt_idx" ON "otp_sessions"("expiresAt")
    `;

    // Create index on mobile
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "otp_sessions_mobile_idx" ON "otp_sessions"("mobile")
    `;

    return NextResponse.json({
      success: true,
      message: 'otp_sessions table created successfully!'
    });

  } catch (error: any) {
    console.error('Error creating table:', error);
    
    // If table already exists, that's okay
    if (error?.code === '42P07' || error?.message?.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists'
      });
    }

    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Failed to create table',
        details: error
      },
      { status: 500 }
    );
  }
}
