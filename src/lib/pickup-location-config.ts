export interface PickupLocationConfig {
  value: string
  label: string
  delhiveryApiKey: string
  productDetails: {
    description: string
    commodity_value: number
    tax_value: number
    category: string
    hsn_code: string
  }
  returnAddress: {
    address: string
    pincode: string
  }
  sellerDetails: {
    name: string
    address: string
    gst: string
    cst_no: string
    tin: string
  }
  vendorPickupLocation: string
  shipmentDimensions: {
    length: number
    breadth: number
    height: number
  }
  fragileShipment: boolean
  invoiceNumber?: string
}

// Default fallback configuration
const defaultPickupLocationConfig: PickupLocationConfig = {
  value: 'RVD JEWELS',
  label: 'RVD JEWELS',
  delhiveryApiKey: '2bce24815f3e4da2513ab4aafb7ecb251469c4a9',
  productDetails: {
    description: 'ARTIFICAL JEWELLERY',
    commodity_value: 5000,
    tax_value: 0,
    category: 'ARTIFICAL JEWELLERY',
    hsn_code: ''
  },
  returnAddress: {
    address: 'Mahalakshmi Complex-2, 2nd floor Vijayawada',
    pincode: '520002'
  },
  sellerDetails: {
    name: 'RVD JEWELS',
    address: 'Mahalakshmi Complex-2, 2nd floor Vijayawada 520002',
    gst: '',
    cst_no: '',
    tin: ''
  },
  vendorPickupLocation: 'RVD JEWELS',
  shipmentDimensions: {
    length: 10,
    breadth: 10,
    height: 10
  },
  fragileShipment: false
}

// Cache for pickup locations
let pickupLocationCache: PickupLocationConfig[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch pickup locations from API
async function fetchPickupLocationsFromAPI(): Promise<PickupLocationConfig[]> {
  try {
    // For server-side execution, return default config
    if (typeof window === 'undefined') {
      return [defaultPickupLocationConfig];
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found, using default pickup locations');
      return [defaultPickupLocationConfig];
    }

    const response = await fetch('/api/pickup-locations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.pickupLocations || [defaultPickupLocationConfig];
    } else {
      console.warn('Failed to fetch pickup locations from API, using default');
      return [defaultPickupLocationConfig];
    }
  } catch (error) {
    console.error('Error fetching pickup locations:', error);
    return [defaultPickupLocationConfig];
  }
}

// Function to get pickup locations (with caching)
export async function getPickupLocations(): Promise<PickupLocationConfig[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (pickupLocationCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return pickupLocationCache;
  }

  // Fetch fresh data
  const locations = await fetchPickupLocationsFromAPI();
  
  // Update cache
  pickupLocationCache = locations;
  cacheTimestamp = now;
  
  return locations;
}

// Function to clear cache (useful when pickup locations are updated)
export function clearPickupLocationCache(): void {
  pickupLocationCache = null;
  cacheTimestamp = 0;
}

// Legacy support - keep the old array for backward compatibility
export const pickupLocationConfigs: PickupLocationConfig[] = [defaultPickupLocationConfig];

// Helper function to get config for a specific pickup location
export async function getPickupLocationConfig(pickupLocation: string): Promise<PickupLocationConfig | undefined> {
  const locations = await getPickupLocations();
  return locations.find(config => config.value === pickupLocation);
}

// Helper function to get all pickup location values
export async function getPickupLocationValues(): Promise<string[]> {
  const locations = await getPickupLocations();
  return locations.map(config => config.value);
}

// Helper function to get all pickup location labels
export async function getPickupLocationLabels(): Promise<string[]> {
  const locations = await getPickupLocations();
  return locations.map(config => config.label);
}

// Helper function to get Delhivery API key for a specific pickup location
export async function getDelhiveryApiKey(pickupLocation: string): Promise<string> {
  try {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      // Server-side: fetch directly from database
      console.log(`🔑 [SERVER] Fetching Delhivery API key for pickup location: ${pickupLocation}`);
      
      // Import Prisma client for server-side database access
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const pickupLocationRecord = await prisma.pickup_locations.findFirst({
          where: { value: pickupLocation },
          select: { delhiveryApiKey: true }
        });
        
        if (pickupLocationRecord?.delhiveryApiKey) {
          console.log(`🔑 [SERVER] Found encrypted Delhivery API key for pickup location: ${pickupLocation}`);
          
          // Check if the API key is encrypted (96 characters) or plain text (40 characters for Delhivery)
          const apiKey = pickupLocationRecord.delhiveryApiKey;
          if (apiKey.length === 96) {
            // Likely encrypted - try to decrypt
            try {
              const crypto = await import('crypto');
              const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vanitha-logistics-encryption-key-2024';
              
              const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
              let decrypted = decipher.update(apiKey, 'hex', 'utf8');
              decrypted += decipher.final('utf8');
              
              console.log(`🔓 [SERVER] Successfully decrypted API key for pickup location: ${pickupLocation}`);
              return decrypted;
            } catch (decryptError) {
              console.error(`❌ [SERVER] Failed to decrypt API key for pickup location ${pickupLocation}:`, decryptError);
              // Return empty string if decryption fails
              return '';
            }
          } else if (apiKey.length === 40) {
            // Likely plain text Delhivery API key
            console.log(`🔑 [SERVER] Found plain text API key for pickup location: ${pickupLocation}`);
            return apiKey;
          } else {
            // Unknown format - validate for valid characters
            console.warn(`⚠️ [SERVER] Unknown API key format for pickup location ${pickupLocation}: length ${apiKey.length}`);
            
            // Check if the API key contains only valid ASCII characters
            const invalidChars = apiKey.match(/[^\x20-\x7E]/);
            if (invalidChars) {
              console.error(`❌ [SERVER] API key contains invalid characters at position ${invalidChars.index}: ${apiKey[invalidChars.index]}`);
              return ''; // Return empty string for invalid API keys
            }
            
            return apiKey; // Return as-is if it passes validation
          }
        } else {
          console.warn(`⚠️ [SERVER] No Delhivery API key found for pickup location: ${pickupLocation}`);
          return '';
        }
      } finally {
        await prisma.$disconnect();
      }
    } else {
      // Client-side: use existing logic
      const config = await getPickupLocationConfig(pickupLocation);
      if (config?.delhiveryApiKey) {
        console.log(`🔑 [CLIENT] Found Delhivery API key for pickup location: ${pickupLocation}`);
        return config.delhiveryApiKey;
      }
      
      console.warn(`⚠️ [CLIENT] No Delhivery API key found for pickup location: ${pickupLocation}`);
      console.warn(`💡 Please configure the Delhivery API key for this pickup location in the client settings`);
      return '';
    }
  } catch (error) {
    console.error(`❌ Error getting Delhivery API key for pickup location ${pickupLocation}:`, error);
    return '';
  }
}

// Helper function to get product details for a specific pickup location
export async function getProductDetails(pickupLocation: string) {
  const config = await getPickupLocationConfig(pickupLocation);
  return config?.productDetails || defaultPickupLocationConfig.productDetails;
}

// Helper function to get return address for a specific pickup location
export async function getReturnAddress(pickupLocation: string) {
  const config = await getPickupLocationConfig(pickupLocation);
  return config?.returnAddress || defaultPickupLocationConfig.returnAddress;
}

// Helper function to get seller details for a specific pickup location
export async function getSellerDetails(pickupLocation: string) {
  const config = await getPickupLocationConfig(pickupLocation);
  return config?.sellerDetails || defaultPickupLocationConfig.sellerDetails;
}

// Helper function to get vendor pickup location for a specific pickup location
export async function getVendorPickupLocation(pickupLocation: string): Promise<string> {
  const config = await getPickupLocationConfig(pickupLocation);
  return config?.vendorPickupLocation || defaultPickupLocationConfig.vendorPickupLocation;
}

// Helper function to get shipment dimensions for a specific pickup location
export async function getShipmentDimensions(pickupLocation: string) {
  const config = await getPickupLocationConfig(pickupLocation);
  return config?.shipmentDimensions || defaultPickupLocationConfig.shipmentDimensions;
}

// Helper function to get fragile shipment setting for a specific pickup location
export async function getFragileShipment(pickupLocation: string): Promise<boolean> {
  const config = await getPickupLocationConfig(pickupLocation);
  return config?.fragileShipment || defaultPickupLocationConfig.fragileShipment;
}

// Helper function to get invoice number for a specific pickup location
export async function getInvoiceNumber(pickupLocation: string): Promise<string | undefined> {
  const config = await getPickupLocationConfig(pickupLocation);
  return config?.invoiceNumber;
}

// Export default configuration for backward compatibility
export { defaultPickupLocationConfig };
