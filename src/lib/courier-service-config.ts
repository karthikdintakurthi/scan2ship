export interface CourierService {
  value: string
  label: string
  description?: string
  isActive: boolean
  supportsCod: boolean
  supportsTracking: boolean
  apiIntegration?: 'delhivery' | 'india_post' | 'dtdc' | 'manual' | 'none'
  defaultWeight?: number
  defaultPackageValue?: number
  serviceAreas?: string[] // pincodes or regions
  restrictions?: {
    maxWeight?: number
    maxPackageValue?: number
    minPackageValue?: number
    restrictedItems?: string[]
  }
}

// Default fallback configuration
const defaultCourierServices: CourierService[] = [
  {
    value: 'delhivery',
    label: 'Delhivery',
    description: 'Fast and reliable courier service with nationwide coverage',
    isActive: true,
    supportsCod: true,
    supportsTracking: true,
    apiIntegration: 'delhivery',
    defaultWeight: 100,
    defaultPackageValue: 5000,
    serviceAreas: ['all'], // All India
    restrictions: {
      maxWeight: 50000, // 50kg
      maxPackageValue: 100000, // ₹1,00,000
      minPackageValue: 100,
      restrictedItems: ['hazardous', 'liquids', 'perishables']
    }
  }
];

// Cache for courier services
let courierServiceCache: CourierService[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch courier services from API
async function fetchCourierServicesFromAPI(): Promise<CourierService[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found, using default courier services');
      return defaultCourierServices;
    }

    console.log('🔍 [COURIER_SERVICE_CONFIG] Fetching courier services from API...');

    const response = await fetch('/api/courier-services', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('🔍 [COURIER_SERVICE_CONFIG] API response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('🔍 [COURIER_SERVICE_CONFIG] API response data:', data);
      const services = data.courierServices || defaultCourierServices;
      console.log('🔍 [COURIER_SERVICE_CONFIG] Returning services:', services);
      return services;
    } else {
      const errorText = await response.text();
      console.warn('Failed to fetch courier services from API, using default. Status:', response.status, 'Error:', errorText);
      return defaultCourierServices;
    }
  } catch (error) {
    console.error('Error fetching courier services:', error);
    return defaultCourierServices;
  }
}

// Function to get courier services (with caching)
export async function getCourierServices(): Promise<CourierService[]> {
  const now = Date.now();
  
  console.log('🔍 [COURIER_SERVICE_CONFIG] getCourierServices called');
  console.log('🔍 [COURIER_SERVICE_CONFIG] Cache state:', { 
    hasCache: !!courierServiceCache, 
    cacheAge: now - cacheTimestamp,
    cacheValid: courierServiceCache && (now - cacheTimestamp) < CACHE_DURATION 
  });
  
  // Return cached data if still valid
  if (courierServiceCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('🔍 [COURIER_SERVICE_CONFIG] Returning cached data:', courierServiceCache);
    return courierServiceCache;
  }

  console.log('🔍 [COURIER_SERVICE_CONFIG] Cache invalid or missing, fetching fresh data');
  
  // Fetch fresh data
  const services = await fetchCourierServicesFromAPI();
  
  // Update cache
  courierServiceCache = services;
  cacheTimestamp = now;
  
  console.log('🔍 [COURIER_SERVICE_CONFIG] Updated cache with:', services);
  
  return services;
}

// Function to clear cache (useful when courier services are updated)
export function clearCourierServiceCache(): void {
  courierServiceCache = null;
  cacheTimestamp = 0;
}

// Legacy support - keep the old array for backward compatibility
export const courierServiceConfigs: CourierService[] = defaultCourierServices;

// Helper functions - now async
export async function getActiveCourierServices(): Promise<CourierService[]> {
  const services = await getCourierServices();
  return services.filter(service => service.isActive);
}

export async function getCourierServiceByValue(value: string): Promise<CourierService | undefined> {
  const services = await getCourierServices();
  return services.find(service => service.value === value);
}

export async function getCourierServicesForPincode(pincode: string): Promise<CourierService[]> {
  // For now, return all active services
  // In the future, this could check pincode against serviceAreas
  return await getActiveCourierServices();
}

export async function getCourierServicesForCod(): Promise<CourierService[]> {
  const services = await getCourierServices();
  return services.filter(service => service.isActive && service.supportsCod);
}

export async function getCourierServicesForTracking(): Promise<CourierService[]> {
  const services = await getCourierServices();
  return services.filter(service => service.isActive && service.supportsTracking);
}

export async function validateCourierServiceRestrictions(
  courierService: string,
  weight: number,
  packageValue: number,
  items?: string[]
): Promise<{ isValid: boolean; errors: string[] }> {
  console.log('🔍 [COURIER_VALIDATION] Validating courier service:', courierService);
  
  const services = await getCourierServices();
  console.log('🔍 [COURIER_VALIDATION] Available services:', services.map(s => s.value));
  
  const service = services.find(s => s.value.toLowerCase() === courierService.toLowerCase());
  if (!service) {
    console.error('❌ [COURIER_VALIDATION] Invalid courier service:', courierService);
    console.error('❌ [COURIER_VALIDATION] Available services:', services.map(s => s.value));
    return { isValid: false, errors: [`Invalid courier service: ${courierService}. Available services: ${services.map(s => s.value).join(', ')}`] };
  }

  console.log('✅ [COURIER_VALIDATION] Found service:', service.label);
  
  const errors: string[] = [];

  // Check weight restrictions
  if (service.restrictions?.maxWeight && weight > service.restrictions.maxWeight) {
    errors.push(`Weight exceeds maximum limit of ${service.restrictions.maxWeight}g`);
  }

  // Check package value restrictions
  if (service.restrictions?.maxPackageValue && packageValue > service.restrictions.maxPackageValue) {
    errors.push(`Package value exceeds maximum limit of ₹${service.restrictions.maxPackageValue}`);
  }

  if (service.restrictions?.minPackageValue && packageValue < service.restrictions.minPackageValue) {
    errors.push(`Package value below minimum limit of ₹${service.restrictions.minPackageValue}`);
  }

  // Check restricted items
  if (items && service.restrictions?.restrictedItems) {
    const restrictedItems = items.filter(item => 
      service.restrictions!.restrictedItems!.some(restricted => 
        item.toLowerCase().includes(restricted.toLowerCase())
      )
    );
    if (restrictedItems.length > 0) {
      errors.push(`Restricted items detected: ${restrictedItems.join(', ')}`);
    }
  }

  console.log('🔍 [COURIER_VALIDATION] Validation result:', { isValid: errors.length === 0, errors });
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export the configuration for use in other files
export default courierServiceConfigs;
