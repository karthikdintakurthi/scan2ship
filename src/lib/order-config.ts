export interface OrderConfig {
  // Default values
  defaultProductDescription: string;
  defaultPackageValue: number;
  defaultWeight: number;
  defaultTotalItems: number;
  
  // COD settings
  codEnabledByDefault: boolean;
  defaultCodAmount?: number;
  
  // Validation rules
  minPackageValue: number;
  maxPackageValue: number;
  minWeight: number;
  maxWeight: number;
  minTotalItems: number;
  maxTotalItems: number;
  
  // Field requirements
  requireProductDescription: boolean;
  requirePackageValue: boolean;
  requireWeight: boolean;
  requireTotalItems: boolean;
  
  // Reseller settings
  enableResellerFallback: boolean;
}

// Default fallback configuration
const defaultOrderConfig: OrderConfig = {
  // Default values
  defaultProductDescription: 'ARTIFICAL JEWELLERY',
  defaultPackageValue: 5000,
  defaultWeight: 100,
  defaultTotalItems: 1,
  
  // COD settings
  codEnabledByDefault: false,
  defaultCodAmount: undefined,
  
  // Validation rules
  minPackageValue: 100,
  maxPackageValue: 100000,
  minWeight: 1,
  maxWeight: 50000,
  minTotalItems: 1,
  maxTotalItems: 100,
  
  // Field requirements
  requireProductDescription: true,
  requirePackageValue: true,
  requireWeight: true,
  requireTotalItems: true,
  
  // Reseller settings
  enableResellerFallback: true
};

// Cache for order configuration
let orderConfigCache: OrderConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch order configuration from API
async function fetchOrderConfigFromAPI(): Promise<OrderConfig> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found, using default order config');
      return defaultOrderConfig;
    }

    console.log('🔍 [ORDER_CONFIG] Fetching order config from API...');

    const response = await fetch('/api/order-config', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('🔍 [ORDER_CONFIG] API response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('🔍 [ORDER_CONFIG] API response data:', data);
      const config = data.orderConfig || defaultOrderConfig;
      console.log('🔍 [ORDER_CONFIG] Returning config:', config);
      return config;
    } else {
      const errorText = await response.text();
      console.warn('Failed to fetch order config from API, using default. Status:', response.status, 'Error:', errorText);
      return defaultOrderConfig;
    }
  } catch (error) {
    console.error('Error fetching order config:', error);
    return defaultOrderConfig;
  }
}

// Function to get order configuration (with caching)
export async function getOrderConfig(): Promise<OrderConfig> {
  const now = Date.now();
  
  console.log('🔍 [ORDER_CONFIG] getOrderConfig called');
  console.log('🔍 [ORDER_CONFIG] Cache state:', { 
    hasCache: !!orderConfigCache, 
    cacheAge: now - cacheTimestamp,
    cacheValid: orderConfigCache && (now - cacheTimestamp) < CACHE_DURATION 
  });
  
  // Return cached data if still valid
  if (orderConfigCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('🔍 [ORDER_CONFIG] Returning cached data:', orderConfigCache);
    return orderConfigCache;
  }

  console.log('🔍 [ORDER_CONFIG] Cache invalid or missing, fetching fresh data');
  
  // Fetch fresh data
  const config = await fetchOrderConfigFromAPI();
  
  // Update cache
  orderConfigCache = config;
  cacheTimestamp = now;
  
  console.log('🔍 [ORDER_CONFIG] Updated cache with:', config);
  
  return config;
}

// Function to clear cache (useful when order config is updated)
export function clearOrderConfigCache(): void {
  orderConfigCache = null;
  cacheTimestamp = 0;
}

// Helper functions for validation
export async function validateOrderData(data: {
  package_value: number;
  weight: number;
  total_items: number;
  product_description?: string;
}): Promise<{ isValid: boolean; errors: string[] }> {
  const config = await getOrderConfig();
  const errors: string[] = [];

  // Validate package value
  if (data.package_value < config.minPackageValue) {
    errors.push(`Package value must be at least ₹${config.minPackageValue}`);
  }
  if (data.package_value > config.maxPackageValue) {
    errors.push(`Package value cannot exceed ₹${config.maxPackageValue}`);
  }

  // Validate weight
  if (data.weight < config.minWeight) {
    errors.push(`Weight must be at least ${config.minWeight}g`);
  }
  if (data.weight > config.maxWeight) {
    errors.push(`Weight cannot exceed ${config.maxWeight}g`);
  }

  // Validate total items
  if (data.total_items < config.minTotalItems) {
    errors.push(`Total items must be at least ${config.minTotalItems}`);
  }
  if (data.total_items > config.maxTotalItems) {
    errors.push(`Total items cannot exceed ${config.maxTotalItems}`);
  }

  // Validate required fields
  if (config.requireProductDescription && (!data.product_description || data.product_description.trim() === '')) {
    errors.push('Product description is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export default configuration for backward compatibility
export { defaultOrderConfig };
