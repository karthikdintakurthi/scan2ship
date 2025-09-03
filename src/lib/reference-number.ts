/**
 * Generate a reference number in the format: ALPHANUMERIC-MOBILE
 * @param mobile Mobile number to append
 * @returns Generated reference number
 */
export function generateReferenceNumber(mobile: string): string {
  // Generate 6-character alphanumeric string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Format mobile number (remove +91 if present, ensure it's 10 digits)
  const formattedMobile = mobile.replace(/\D/g, '').slice(-10);
  
  // Return in format: ALPHANUMERIC-MOBILE
  return `${result}-${formattedMobile}`;
}

/**
 * Generate a reference number with configurable prefix
 * @param mobile Mobile number to append
 * @param enablePrefix Whether to enable prefix
 * @param prefix Custom prefix to use
 * @returns Generated reference number
 */
export function generateReferenceNumberWithPrefix(mobile: string, enablePrefix: boolean = true, prefix: string = 'REF'): string {
  // Format mobile number (remove +91 if present, ensure it's 10 digits)
  const formattedMobile = mobile.replace(/\D/g, '').slice(-10);
  
  if (!enablePrefix) {
    // If prefix is disabled, return only mobile number
    return formattedMobile;
  }
  
  // Generate 6-character alphanumeric string (this becomes the prefix)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Return in format: ALPHANUMERIC-MOBILE (alphanumeric itself is the prefix)
  return `${result}-${formattedMobile}`;
}

/**
 * Format reference number with custom value and mobile
 * @param customValue Custom reference value entered by user
 * @param mobile Mobile number to append
 * @returns Formatted reference number
 */
export function formatReferenceNumber(customValue: string, mobile: string): string {
  // Format mobile number (remove +91 if present, ensure it's 10 digits)
  const formattedMobile = mobile.replace(/\D/g, '').slice(-10);
  
  // Return in format: CUSTOMVALUE-MOBILE
  return `${customValue}-${formattedMobile}`;
}

/**
 * Format reference number with custom value and mobile, respecting prefix configuration
 * @param customValue Custom reference value entered by user
 * @param mobile Mobile number to append
 * @param enablePrefix Whether to enable prefix
 * @param prefix Custom prefix to use
 * @returns Formatted reference number
 */
export function formatReferenceNumberWithPrefix(customValue: string, mobile: string, enablePrefix: boolean = true, prefix: string = 'REF'): string {
  // Format mobile number (remove +91 if present, ensure it's 10 digits)
  const formattedMobile = mobile.replace(/\D/g, '').slice(-10);
  
  if (!enablePrefix) {
    // If prefix is disabled, return CUSTOMVALUE-MOBILE (custom value still acts as prefix)
    return `${customValue}-${formattedMobile}`;
  }
  
  // Return in format: CUSTOMVALUE-MOBILE (custom value itself is the prefix)
  return `${customValue}-${formattedMobile}`;
}

/**
 * Validate reference number format
 * @param referenceNumber Reference number to validate
 * @returns True if valid format
 */
export function isValidReferenceNumber(referenceNumber: string): boolean {
  // Check if it matches the pattern: ALPHANUMERIC-MOBILE or CUSTOM-MOBILE
  const pattern = /^[A-Z0-9]+-\d{10}$/;
  return pattern.test(referenceNumber);
}

/**
 * Validate reference number format with prefix
 * @param referenceNumber Reference number to validate
 * @param enablePrefix Whether prefix is enabled
 * @returns True if valid format
 */
export function isValidReferenceNumberWithPrefix(referenceNumber: string, enablePrefix: boolean = true): boolean {
  if (!enablePrefix) {
    // If prefix is disabled, check for CUSTOM-MOBILE format (custom values still have prefix)
    const customPattern = /^[A-Z0-9]+-\d{10}$/;
    return customPattern.test(referenceNumber);
  }
  
  // If prefix is enabled, check for ALPHANUMERIC-MOBILE or CUSTOM-MOBILE format
  const prefixPattern = /^[A-Z0-9]+-\d{10}$/;
  return prefixPattern.test(referenceNumber);
}
