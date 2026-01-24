import { NextRequest, NextResponse } from 'next/server';
import { getOTP, deleteOTP, storeVerificationToken } from '@/lib/otp-store-db';
import crypto from 'crypto';

// Helper function to normalize mobile number (must match send-otp route exactly)
function normalizeMobile(mobile: string): string {
  const cleanMobile = mobile.replace(/\D/g, '');
  let normalized = cleanMobile;
  
  if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    normalized = cleanMobile.substring(2);
  } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
    normalized = cleanMobile.substring(3);
  }
  
  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, otp, mobile } = await request.json();

    // Validate inputs
    if (!sessionId || !otp || !mobile) {
      return NextResponse.json(
        { error: 'Session ID, OTP, and mobile number are required' },
        { status: 400 }
      );
    }

    // Clean mobile number using same normalization as send-otp
    const searchMobile = normalizeMobile(mobile);

    // Get stored OTP from database
    console.log(`🔍 [TRACKING_OTP_VERIFY] Session ID: ${sessionId}`);
    const storedOTP = await getOTP(sessionId);
    
    console.log(`🔍 [TRACKING_OTP_VERIFY] Stored OTP exists: ${!!storedOTP}`);
    
    if (storedOTP) {
      console.log(`🔍 [TRACKING_OTP_VERIFY] Stored mobile: ${storedOTP.mobile}, Search mobile: ${searchMobile}`);
      console.log(`🔍 [TRACKING_OTP_VERIFY] Mobile match: ${storedOTP.mobile === searchMobile}`);
      console.log(`🔍 [TRACKING_OTP_VERIFY] OTP match: ${storedOTP.otp === otp}`);
      console.log(`🔍 [TRACKING_OTP_VERIFY] Expires at: ${new Date(storedOTP.expiresAt).toISOString()}, Now: ${new Date().toISOString()}`);
      console.log(`🔍 [TRACKING_OTP_VERIFY] Is expired: ${Date.now() > storedOTP.expiresAt}`);
    } else {
      console.error(`❌ [TRACKING_OTP_VERIFY] Session not found in database!`);
      console.error(`❌ [TRACKING_OTP_VERIFY] Session ID received: "${sessionId}"`);
    }

    if (!storedOTP) {
      return NextResponse.json(
        { error: 'Invalid or expired session. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Check if OTP has expired (database already filters expired, but double-check)
    if (Date.now() > storedOTP.expiresAt) {
      await deleteOTP(sessionId);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify mobile number matches
    if (storedOTP.mobile !== searchMobile) {
      return NextResponse.json(
        { error: 'Mobile number mismatch.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    // OTP verified successfully
    // Generate verification token (valid for 30 minutes)
    const verificationToken = crypto.randomUUID();
    const tokenExpiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    // Store verification token in database
    await storeVerificationToken(verificationToken, searchMobile, tokenExpiresAt);

    // Remove OTP session
    await deleteOTP(sessionId);

    console.log(`✅ [TRACKING_OTP] OTP verified for ${searchMobile}`);

    return NextResponse.json({
      success: true,
      verificationToken,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('❌ [TRACKING_OTP] Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}

// Export function to verify token
export async function verifyTrackingToken(token: string, mobile: string): Promise<boolean> {
  const searchMobile = normalizeMobile(mobile);
  const { getVerificationToken } = await import('@/lib/otp-store-db');
  return await getVerificationToken(token, searchMobile);
}
