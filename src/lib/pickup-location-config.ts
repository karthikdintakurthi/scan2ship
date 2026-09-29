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
  delhiveryApiKey: '',
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
      const locations = data.data || [defaultPickupLocationConfig];
      console.log(`✅ [CLIENT] Successfully fetched ${locations.length} pickup locations in real-time`);
      console.log(`✅ [CLIENT] Pickup locations:`, locations);
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

/**
 * Server-only: returns the Delhivery API key for a tenant's pickup location,
 * or '' when the tenant, location, or key is missing.
 */
export async function getDelhiveryApiKey(pickupLocation: string, clientId: string): Promise<string> {
  if (typeof window !== 'undefined') {
    console.error('❌ [DELHIVERY_KEY] getDelhiveryApiKey must not be called in the browser');
    return '';
  }

  if (!clientId || !pickupLocation) {
    console.error(`❌ [DELHIVERY_KEY] Tenant and pickup location are required (pickup: ${pickupLocation || 'missing'}, client: ${clientId || 'missing'})`);
    return '';
  }

  try {
    // Imported lazily because this module is also bundled into client components
    const { prisma } = await import('@/lib/prisma');

    const pickupLocationRecord = await prisma.pickup_locations.findFirst({
      where: {
        clientId,
        value: { equals: pickupLocation, mode: 'insensitive' }
      },
      select: { delhiveryApiKey: true }
    });

    let apiKey = pickupLocationRecord?.delhiveryApiKey?.trim() || '';
    if (!apiKey) {
      console.warn(`⚠️ [DELHIVERY_KEY] No Delhivery API key for pickup location ${pickupLocation} (client ${clientId})`);
      return '';
    }

    // Some keys were saved wrapped in a JavaScript snippet, e.g. clientKeyD = '...'
    if (apiKey.includes("'") && apiKey.includes('clientKeyD')) {
      apiKey = apiKey.match(/'([^']+)'/)?.[1] ?? apiKey;
    }

    return apiKey;
  } catch (error) {
    console.error(`❌ [DELHIVERY_KEY] Error loading Delhivery API key for pickup location ${pickupLocation}:`, error);
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
