import { NextRequest, NextResponse } from 'next/server';
import { sendOTP, generateOTP } from '@/lib/fast2sms';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { storeOTP, deleteOTP } from '@/lib/otp-store-db';

export async function POST(request: NextRequest) {
  try {
    const { mobile } = await request.json();

    // Validate mobile number
    if (!mobile) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    // Clean and validate mobile number format
    // Use same normalization function as verify-otp
    const cleanMobile = mobile.replace(/\D/g, '');
    let searchMobile = cleanMobile;
    
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      searchMobile = cleanMobile.substring(2);
    } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
      searchMobile = cleanMobile.substring(3);
    }
    
    console.log(`📝 [TRACKING_OTP] Input mobile: "${mobile}", Normalized: "${searchMobile}"`);

    // Validate mobile number format (should be 10 digits starting with 6-9)
    if (searchMobile.length !== 10 || !/^[6-9]\d{9}$/.test(searchMobile)) {
      return NextResponse.json({ 
        error: 'Please enter a valid 10-digit mobile number' 
      }, { status: 400 });
    }

    // Check if mobile number has any orders
    const orders = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM orders
      WHERE mobile = ${searchMobile} OR reseller_mobile = ${searchMobile}
    ` as any[];

    const orderCount = parseInt(orders[0]?.count || '0');

    // Generate OTP
    const otp = generateOTP();
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 6 * 60 * 1000; // 6 minutes (slightly longer to account for timing)

    // Store OTP in database
    await storeOTP(sessionId, otp, searchMobile, expiresAt);

    console.log(`📝 [TRACKING_OTP] Stored OTP - Session: ${sessionId}, Mobile: ${searchMobile}, Expires: ${new Date(expiresAt).toISOString()}`);

    // Send OTP via Fast2SMS
    const smsResult = await sendOTP({
      mobile: searchMobile,
      otp
    });

    if (!smsResult.success) {
      // Remove the stored OTP if SMS sending failed
      await deleteOTP(sessionId);
      return NextResponse.json(
        { error: smsResult.error || 'Failed to send OTP. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`✅ [TRACKING_OTP] OTP sent to ${searchMobile}, Session: ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      message: `OTP sent to ${searchMobile}`,
      hasOrders: orderCount > 0
    });

  } catch (error: any) {
    console.error('❌ [TRACKING_OTP] Error sending OTP:', error);
    console.error('❌ [TRACKING_OTP] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    // Return more specific error message
    let errorMessage = 'Failed to send OTP. Please try again.';
    
    if (error?.message?.includes('Database table not found') || error?.message?.includes('otp_sessions')) {
      errorMessage = 'Database setup required. Please contact support to set up the OTP system.';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Note: otpStore is now imported from shared module
