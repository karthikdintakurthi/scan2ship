/**
 * Database-backed OTP Store for tracking page OTP verification
 * Uses database instead of in-memory storage to work across serverless instances
 */

import { prisma } from './prisma';

interface OTPEntry {
  otp: string;
  expiresAt: number;
  mobile: string;
}

/**
 * Store OTP session in database
 */
export async function storeOTP(sessionId: string, otp: string, mobile: string, expiresAt: number): Promise<void> {
  try {
    // Use raw query to insert or update (upsert)
    // Convert expiresAt from milliseconds to timestamp
    const expiresAtTimestamp = new Date(expiresAt);
    
    await prisma.$executeRaw`
      INSERT INTO otp_sessions (id, "sessionId", mobile, otp, "expiresAt", "createdAt")
      VALUES (gen_random_uuid()::text, ${sessionId}, ${mobile}, ${otp}, ${expiresAtTimestamp}::timestamp, NOW())
      ON CONFLICT ("sessionId") 
      DO UPDATE SET 
        mobile = EXCLUDED.mobile,
        otp = EXCLUDED.otp,
        "expiresAt" = EXCLUDED."expiresAt"
    `;
    
    console.log(`✅ [OTP_STORE_DB] Stored OTP session: ${sessionId} for mobile: ${mobile}`);
  } catch (error: any) {
    // If table doesn't exist, provide helpful error message
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.error('❌ [OTP_STORE_DB] Table otp_sessions does not exist.');
      console.error('❌ [OTP_STORE_DB] Please create the table by:');
      console.error('❌ [OTP_STORE_DB] 1. Call POST /api/setup/create-otp-table');
      console.error('❌ [OTP_STORE_DB] 2. Or run the SQL in CREATE_OTP_SESSIONS_TABLE.sql');
      throw new Error('Database setup required. Please contact support or create the otp_sessions table.');
    }
    console.error('❌ [OTP_STORE_DB] Error storing OTP:', error);
    throw error;
  }
}

/**
 * Get OTP session from database
 */
export async function getOTP(sessionId: string): Promise<OTPEntry | null> {
  try {
    const result = await prisma.$queryRaw<Array<{
      mobile: string;
      otp: string;
      expiresAt: Date;
    }>>`
      SELECT mobile, otp, "expiresAt"
      FROM otp_sessions
      WHERE "sessionId" = ${sessionId}
        AND "expiresAt" > NOW()
    `;

    if (result.length === 0) {
      return null;
    }

    const entry = result[0];
    return {
      mobile: entry.mobile,
      otp: entry.otp,
      expiresAt: entry.expiresAt.getTime()
    };
  } catch (error) {
    console.error('❌ [OTP_STORE_DB] Error getting OTP:', error);
    return null;
  }
}

/**
 * Delete OTP session from database
 */
export async function deleteOTP(sessionId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM otp_sessions
      WHERE "sessionId" = ${sessionId}
    `;
    
    console.log(`🧹 [OTP_STORE_DB] Deleted OTP session: ${sessionId}`);
  } catch (error) {
    console.error('❌ [OTP_STORE_DB] Error deleting OTP:', error);
  }
}

/**
 * Store verification token in database
 */
export async function storeVerificationToken(token: string, mobile: string, expiresAt: number): Promise<void> {
  try {
    const expiresAtTimestamp = new Date(expiresAt);
    
    await prisma.$executeRaw`
      INSERT INTO otp_sessions (id, "sessionId", mobile, otp, "expiresAt", "createdAt")
      VALUES (gen_random_uuid()::text, ${`verified_${token}`}, ${mobile}, 'verified', ${expiresAtTimestamp}::timestamp, NOW())
      ON CONFLICT ("sessionId") 
      DO UPDATE SET 
        mobile = EXCLUDED.mobile,
        "expiresAt" = EXCLUDED."expiresAt"
    `;
    
    console.log(`✅ [OTP_STORE_DB] Stored verification token for mobile: ${mobile}`);
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.error('❌ [OTP_STORE_DB] Table otp_sessions does not exist. Please run the SQL in CREATE_OTP_SESSIONS_TABLE.sql');
      throw new Error('Database table not found. Please create the otp_sessions table first.');
    }
    console.error('❌ [OTP_STORE_DB] Error storing verification token:', error);
    throw error;
  }
}

/**
 * Get verification token from database
 */
export async function getVerificationToken(token: string, mobile: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{
      mobile: string;
      expiresAt: Date;
    }>>`
      SELECT mobile, "expiresAt"
      FROM otp_sessions
      WHERE "sessionId" = ${`verified_${token}`}
        AND mobile = ${mobile}
        AND "expiresAt" > NOW()
    `;

    return result.length > 0;
  } catch (error) {
    console.error('❌ [OTP_STORE_DB] Error getting verification token:', error);
    return false;
  }
}

/**
 * Delete verification token from database
 */
export async function deleteVerificationToken(token: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM otp_sessions
      WHERE "sessionId" = ${`verified_${token}`}
    `;
  } catch (error) {
    console.error('❌ [OTP_STORE_DB] Error deleting verification token:', error);
  }
}

/**
 * Clean up expired OTP sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM otp_sessions
      WHERE "expiresAt" < NOW()
    `;
    
    console.log(`🧹 [OTP_STORE_DB] Cleaned up expired OTP sessions`);
  } catch (error) {
    console.error('❌ [OTP_STORE_DB] Error cleaning up expired sessions:', error);
  }
}
