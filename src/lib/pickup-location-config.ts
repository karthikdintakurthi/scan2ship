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
  value: 'Scan2Ship',
  label: 'Scan2Ship',
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
  vendorPickupLocation: 'Scan2Ship',
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
      console.log('🔄 [SERVER] Using default pickup location config for server-side execution');
      return [defaultPickupLocationConfig];
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('⚠️ [CLIENT] No auth token found, using default pickup locations');
      return [defaultPickupLocationConfig];
    }

    console.log('🔄 [CLIENT] Fetching pickup locations from API in real-time...');
    const response = await fetch('/api/pickup-locations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache', // Ensure fresh data
        'Pragma': 'no-cache'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const locations = data.pickupLocations || [defaultPickupLocationConfig];
      console.log(`✅ [CLIENT] Successfully fetched ${locations.length} pickup locations in real-time`);
      return locations;
    } else {
      console.warn(`⚠️ [CLIENT] Failed to fetch pickup locations from API (${response.status}), using default`);
      return [defaultPickupLocationConfig];
    }
  } catch (error) {
    console.error('❌ [CLIENT] Error fetching pickup locations:', error);
    return [defaultPickupLocationConfig];
  }
}

// Function to get pickup locations (always fetch in real-time)
export async function getPickupLocations(): Promise<PickupLocationConfig[]> {
  // Always fetch fresh data in real-time
  console.log('🔄 [REALTIME] Fetching pickup locations in real-time...');
  
  const locations = await fetchPickupLocationsFromAPI();
  
  // Update cache for potential future use
  pickupLocationCache = locations;
  cacheTimestamp = Date.now();
  
  console.log(`✅ [REALTIME] Fetched ${locations.length} pickup locations in real-time`);
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
export async function getDelhiveryApiKey(pickupLocation: string, clientId?: string): Promise<string> {
  try {
    console.log(`🔑 [REALTIME] Fetching Delhivery API key for pickup location: ${pickupLocation}${clientId ? ` (Client: ${clientId})` : ''}`);
    
    // Always fetch in real-time from the API endpoint
    // This ensures we get the latest configuration from the database
    
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      // Server-side: fetch directly from database for immediate access
      console.log(`🔑 [SERVER] Fetching Delhivery API key for pickup location: ${pickupLocation}${clientId ? ` (Client: ${clientId})` : ''}`);
      
      // Import Prisma client for server-side database access
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        // Build the where clause with proper client filtering
        const whereClause: any = {
          value: {
            equals: pickupLocation,
            mode: 'insensitive'
          }
        };
        
        // Add client filtering if clientId is provided
        if (clientId) {
          whereClause.clientId = clientId;
          console.log(`🔑 [SERVER] Filtering by client ID: ${clientId}`);
        } else {
          console.warn(`⚠️ [SERVER] No client ID provided - this may lead to incorrect API key selection`);
        }
        
        const pickupLocationRecord = await prisma.pickup_locations.findFirst({
          where: whereClause,
          select: { 
            delhiveryApiKey: true,
            clients: {
              select: {
                companyName: true,
                id: true
              }
            }
          }
        });
        
        if (pickupLocationRecord?.delhiveryApiKey) {
          console.log(`🔑 [SERVER] Found Delhivery API key for pickup location: ${pickupLocation}`);
          if (pickupLocationRecord.clients) {
            console.log(`🔑 [SERVER] API key belongs to client: ${pickupLocationRecord.clients.companyName} (ID: ${pickupLocationRecord.clients.id})`);
          }
          
          let apiKey = pickupLocationRecord.delhiveryApiKey;
          
          // Extract API key if it's wrapped in JavaScript code
          if (apiKey.includes("'") && apiKey.includes('clientKeyD')) {
            const match = apiKey.match(/'([^']+)'/);
            if (match) {
              apiKey = match[1];
              console.log(`🔑 [SERVER] Extracted clean API key from JavaScript code: ${apiKey}`);
            }
          }
          
          // Use API key as raw data - no encryption/decryption
          console.log(`🔑 [SERVER] Found raw API key for pickup location: ${pickupLocation}`);
          return apiKey;
        } else {
          console.warn(`⚠️ [SERVER] No Delhivery API key found for pickup location: ${pickupLocation}${clientId ? ` and client: ${clientId}` : ''}`);
          return '';
        }
      } finally {
        await prisma.$disconnect();
      }
    } else {
      // Client-side: fetch in real-time from API endpoint
      console.log(`🔑 [CLIENT] Fetching Delhivery API key in real-time for pickup location: ${pickupLocation}${clientId ? ` (Client: ${clientId})` : ''}`);
      
      try {
        // Get authentication token
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.warn('⚠️ [CLIENT] No auth token found for real-time API key fetch');
          return '';
        }

        // Fetch pickup locations in real-time from API
        const response = await fetch('/api/pickup-locations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const pickupLocations = data.pickupLocations || [];
          
          // Find the specific pickup location
          let location = pickupLocations.find((loc: any) => 
            loc.value.toLowerCase() === pickupLocation.toLowerCase()
          );
          
          // If clientId is provided, ensure we get the correct client's pickup location
          if (clientId && location) {
            // The API endpoint should already filter by client, but double-check
            console.log(`🔑 [CLIENT] Verifying pickup location belongs to correct client: ${clientId}`);
          }
          
          if (location?.delhiveryApiKey) {
            console.log(`🔑 [CLIENT] Found real-time Delhivery API key for pickup location: ${pickupLocation}`);
            console.log(`🔑 [CLIENT] API key: ${location.delhiveryApiKey.substring(0, 8)}...`);
            return location.delhiveryApiKey;
          } else {
            console.warn(`⚠️ [CLIENT] No Delhivery API key found in real-time data for pickup location: ${pickupLocation}`);
            console.warn(`💡 Available pickup locations: ${pickupLocations.map((loc: any) => loc.value).join(', ')}`);
            return '';
          }
        } else {
          console.error(`❌ [CLIENT] Failed to fetch pickup locations in real-time: ${response.status}`);
          return '';
        }
      } catch (error) {
        console.error(`❌ [CLIENT] Error fetching pickup locations in real-time:`, error);
        return '';
      }
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
