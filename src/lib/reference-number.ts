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
 * Validate reference number format
 * @param referenceNumber Reference number to validate
 * @returns True if valid format
 */
export function isValidReferenceNumber(referenceNumber: string): boolean {
  // Check if it matches the pattern: ALPHANUMERIC-MOBILE or CUSTOM-MOBILE
  const pattern = /^[A-Z0-9]+-\d{10}$/;
  return pattern.test(referenceNumber);
}
