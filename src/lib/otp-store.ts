/**
 * Shared OTP Store for tracking page OTP verification
 * This ensures the store is shared across all API routes
 */

interface OTPEntry {
  otp: string;
  expiresAt: number;
  mobile: string;
}

// Global OTP store (shared across all API routes)
const otpStore = new Map<string, OTPEntry>();

// Clean up expired OTPs every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of otpStore.entries()) {
      if (value.expiresAt < now) {
        otpStore.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 [OTP_STORE] Cleaned up ${cleaned} expired OTP sessions`);
    }
  }, 5 * 60 * 1000);
}

export { otpStore };
export type { OTPEntry };
