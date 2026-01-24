/**
 * Device Remembering Utility for Tracking Page
 * Remembers verified devices for mobile numbers to skip OTP on subsequent visits
 */

const DEVICE_ID_KEY = 'tracking_device_id';
const VERIFIED_DEVICES_KEY = 'tracking_verified_devices';
const DEVICE_REMEMBER_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

interface VerifiedDevice {
  deviceId: string;
  mobile: string;
  verifiedAt: number;
  expiresAt: number;
}

/**
 * Generate or retrieve device ID
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate a unique device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return '';
  }
}

/**
 * Check if device is verified for a mobile number
 */
export function isDeviceVerified(mobile: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const deviceId = getDeviceId();
    if (!deviceId) {
      console.log('🔍 [DEVICE_REMEMBER] No device ID found');
      return false;
    }
    
    // Normalize mobile number
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile) {
      console.log('🔍 [DEVICE_REMEMBER] Invalid mobile format:', mobile);
      return false;
    }
    
    const verifiedDevicesJson = localStorage.getItem(VERIFIED_DEVICES_KEY);
    if (!verifiedDevicesJson) {
      console.log('🔍 [DEVICE_REMEMBER] No verified devices found in localStorage');
      return false;
    }
    
    const verifiedDevices: Record<string, VerifiedDevice> = JSON.parse(verifiedDevicesJson);
    const device = verifiedDevices[normalizedMobile];
    
    if (!device) {
      console.log('🔍 [DEVICE_REMEMBER] No device found for mobile:', normalizedMobile);
      console.log('🔍 [DEVICE_REMEMBER] Available devices:', Object.keys(verifiedDevices));
      return false;
    }
    
    // Check if device ID matches
    if (device.deviceId !== deviceId) {
      console.log('🔍 [DEVICE_REMEMBER] Device ID mismatch. Stored:', device.deviceId, 'Current:', deviceId);
      return false;
    }
    
    // Check if verification is still valid
    if (Date.now() > device.expiresAt) {
      console.log('🔍 [DEVICE_REMEMBER] Device verification expired');
      // Remove expired verification
      delete verifiedDevices[normalizedMobile];
      localStorage.setItem(VERIFIED_DEVICES_KEY, JSON.stringify(verifiedDevices));
      return false;
    }
    
    console.log('✅ [DEVICE_REMEMBER] Device is verified for mobile:', normalizedMobile);
    return true;
  } catch (error) {
    console.error('❌ [DEVICE_REMEMBER] Error checking device verification:', error);
    return false;
  }
}

/**
 * Remember device for a mobile number
 */
export function rememberDevice(mobile: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    
    // Normalize mobile number
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile) return;
    
    const now = Date.now();
    const expiresAt = now + DEVICE_REMEMBER_DURATION;
    
    const verifiedDevice: VerifiedDevice = {
      deviceId,
      mobile: normalizedMobile,
      verifiedAt: now,
      expiresAt
    };
    
    // Get existing verified devices
    const verifiedDevicesJson = localStorage.getItem(VERIFIED_DEVICES_KEY);
    const verifiedDevices: Record<string, VerifiedDevice> = verifiedDevicesJson 
      ? JSON.parse(verifiedDevicesJson) 
      : {};
    
    // Store verification
    verifiedDevices[normalizedMobile] = verifiedDevice;
    
    // Clean up expired entries
    const nowTime = Date.now();
    Object.keys(verifiedDevices).forEach(key => {
      if (verifiedDevices[key].expiresAt < nowTime) {
        delete verifiedDevices[key];
      }
    });
    
    localStorage.setItem(VERIFIED_DEVICES_KEY, JSON.stringify(verifiedDevices));
    console.log(`✅ [DEVICE_REMEMBER] Device remembered for mobile: ${normalizedMobile}`);
    console.log(`✅ [DEVICE_REMEMBER] Device ID: ${deviceId}`);
    console.log(`✅ [DEVICE_REMEMBER] Expires at: ${new Date(expiresAt).toISOString()}`);
    console.log(`✅ [DEVICE_REMEMBER] All remembered devices:`, Object.keys(verifiedDevices));
  } catch (error) {
    console.error('Error remembering device:', error);
  }
}

/**
 * Forget device for a mobile number
 */
export function forgetDevice(mobile: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile) return;
    
    const verifiedDevicesJson = localStorage.getItem(VERIFIED_DEVICES_KEY);
    if (!verifiedDevicesJson) return;
    
    const verifiedDevices: Record<string, VerifiedDevice> = JSON.parse(verifiedDevicesJson);
    delete verifiedDevices[normalizedMobile];
    
    localStorage.setItem(VERIFIED_DEVICES_KEY, JSON.stringify(verifiedDevices));
    console.log(`🧹 [DEVICE_REMEMBER] Device forgotten for mobile: ${normalizedMobile}`);
  } catch (error) {
    console.error('Error forgetting device:', error);
  }
}

/**
 * Normalize mobile number (same logic as API)
 */
function normalizeMobile(mobile: string): string {
  const cleanMobile = mobile.replace(/\D/g, '');
  let normalized = cleanMobile;
  
  if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    normalized = cleanMobile.substring(2);
  } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
    normalized = cleanMobile.substring(3);
  }
  
  // Validate format
  if (normalized.length !== 10 || !/^[6-9]\d{9}$/.test(normalized)) {
    return '';
  }
  
  return normalized;
}
