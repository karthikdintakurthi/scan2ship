/**
 * Catalog Service - Integration with catalog-app
 * Handles authentication, product search, and inventory synchronization
 */

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  stockLevel: number;
  minStock: number;
  isActive: boolean;
  allowPreorder: boolean;
  category?: {
    id: string;
    name: string;
  };
  media?: Array<{
    id: string;
    url: string;
    kind: string;
    isPrimary: boolean;
  }>;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

export interface CatalogSearchResponse {
  products: CatalogProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OrderItem {
  product: CatalogProduct;
  quantity: number;
  price: number;
  isPreorder?: boolean;
}

export interface InventoryUpdateRequest {
  items: Array<{
    sku: string;
    quantity: number;
  }>;
}

export interface InventoryUpdateResponse {
  success: boolean;
  data: {
    client: {
      id: string;
      name: string;
      slug: string;
    };
    summary: {
      totalItems: number;
      availableItems: number;
      unavailableItems: number;
      lowStockItems: number;
      totalRequested: number;
      totalAvailable: number;
      totalShortfall: number;
    };
    availability: Array<{
      sku: string;
      available: boolean;
      error?: string;
      stockLevel: number;
      requested: number;
      shortfall: number;
    }>;
    unavailableItems: Array<{
      sku: string;
      error: string;
      available: boolean;
    }>;
    lowStockAlerts: any[];
    allItemsAvailable: boolean;
    timestamp: string;
  };
}

export class CatalogService {
  private baseUrl: string;
  private authToken: string | null = null;
  private clientSlug: string | null = null;

  constructor() {
    // For client-side, use the hardcoded URL since environment variables need to be available at build time
    this.baseUrl = 'http://localhost:3000'; // catalog-app is running on port 3000
    
    console.log('Catalog Service: Constructor called, loading stored auth...');
    console.log('Catalog Service: Base URL set to:', this.baseUrl);
    console.log('Catalog Service: Window available:', typeof window !== 'undefined');
    console.log('Catalog Service: localStorage available:', typeof window !== 'undefined' && typeof localStorage !== 'undefined');
    
    // Load stored authentication if available
    const loaded = this.loadStoredAuth();
    console.log('Catalog Service: Stored auth loaded:', loaded);
    console.log('Catalog Service: Final state - authToken:', !!this.authToken, 'clientSlug:', this.clientSlug);
  }

  /**
   * Authenticate with catalog-app
   */
  async authenticate(email: string, password: string): Promise<CatalogAuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      this.authToken = data.token;
      
      // Set client slug from user data
      if (data.user?.client?.slug) {
        this.clientSlug = data.user.client.slug;
        console.log('Catalog Service: Client slug set to:', this.clientSlug);
      } else {
        console.log('Catalog Service: No client slug found in user data:', data.user);
      }
      
          // Store auth token and client slug in localStorage for persistence
          if (typeof window !== 'undefined') {
            console.log('Catalog Service: Storing auth data in localStorage:', {
              hasToken: !!data.token,
              hasUser: !!data.user,
              hasClientSlug: !!data.user?.client?.slug,
              clientSlugValue: data.user?.client?.slug
            });
            
            localStorage.setItem('catalog_auth_token', data.token);
            localStorage.setItem('catalog_user', JSON.stringify(data.user));
            if (data.user?.client?.slug) {
              localStorage.setItem('catalog_client_slug', data.user.client.slug);
              console.log('Catalog Service: Client slug stored in localStorage:', data.user.client.slug);
            } else {
              console.log('Catalog Service: No client slug to store in localStorage');
            }
            
            // Verify storage
            const storedToken = localStorage.getItem('catalog_auth_token');
            const storedUser = localStorage.getItem('catalog_user');
            const storedClientSlug = localStorage.getItem('catalog_client_slug');
            console.log('Catalog Service: Verification of stored data:', {
              storedToken: !!storedToken,
              storedUser: !!storedUser,
              storedClientSlug: !!storedClientSlug,
              storedClientSlugValue: storedClientSlug
            });
          }

      return data;
    } catch (error) {
      console.error('Catalog authentication error:', error);
      throw error;
    }
  }

  /**
   * Load stored authentication
   */
  loadStoredAuth(): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem('catalog_auth_token');
    const user = localStorage.getItem('catalog_user');
    const clientSlug = localStorage.getItem('catalog_client_slug');
    
    console.log('Catalog Service: Checking localStorage:', {
      hasToken: !!token,
      hasUser: !!user,
      hasClientSlug: !!clientSlug,
      clientSlugValue: clientSlug
    });
    
    if (token && user) {
      this.authToken = token;
      
      // Try to get client slug from stored client slug first, then from user data
      if (clientSlug) {
        this.clientSlug = clientSlug;
        console.log('Catalog Service: Loaded client slug from storage:', this.clientSlug);
      } else {
        // Try to extract client slug from user data
        try {
          const userData = JSON.parse(user);
          if (userData?.client?.slug) {
            this.clientSlug = userData.client.slug;
            // Store it for future use
            localStorage.setItem('catalog_client_slug', userData.client.slug);
            console.log('Catalog Service: Extracted and stored client slug from user data:', this.clientSlug);
          } else {
            console.log('Catalog Service: No client slug found in user data:', userData);
          }
        } catch (error) {
          console.error('Catalog Service: Error parsing user data:', error);
        }
      }
      return true;
    }
    
    return false;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.authToken = null;
    this.clientSlug = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('catalog_auth_token');
      localStorage.removeItem('catalog_user');
      localStorage.removeItem('catalog_client_slug');
    }
  }

  /**
   * Logout from catalog (invalidate session)
   */
  async logout(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/catalog`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'logout',
          data: {}
        })
      });

      if (response.ok) {
        this.clearAuth();
        console.log('Catalog Service: Successfully logged out');
        return true;
      } else {
        console.error('Catalog Service: Logout failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Catalog Service: Logout error:', error);
      return false;
    }
  }

  /**
   * Check if catalog session is valid
   */
  async checkSessionStatus(): Promise<{
    isValid: boolean;
    requiresLogin: boolean;
    message?: string;
  }> {
    try {
      // Try to search for products to test session validity
      const response = await fetch(`${this.baseUrl}/api/catalog`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'search_products',
          data: {
            query: 'test',
            page: 1,
            limit: 1
          }
        })
      });

      if (response.ok) {
        return { isValid: true, requiresLogin: false };
      } else if (response.status === 401) {
        const errorData = await response.json();
        return { 
          isValid: false, 
          requiresLogin: true,
          message: errorData.error || 'Session expired'
        };
      } else {
        return { 
          isValid: false, 
          requiresLogin: false,
          message: 'Session check failed'
        };
      }
    } catch (error) {
      console.error('Catalog Service: Session check error:', error);
      return { 
        isValid: false, 
        requiresLogin: false,
        message: 'Session check failed'
      };
    }
  }

  /**
   * Set client slug for API calls
   */
  setClientSlug(slug: string): void {
    this.clientSlug = slug;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Search products by SKU or name
   */
  async searchProducts(query: string, page: number = 1, limit: number = 20): Promise<CatalogSearchResponse> {
    if (!this.authToken) {
      throw new Error('Not authenticated with catalog-app');
    }

    try {
      const searchParams = new URLSearchParams({
        search: query,
        page: page.toString(),
        limit: limit.toString(),
      });

      const url = `${this.baseUrl}/api/products?${searchParams}`;
      console.log('Catalog Service: Searching products with URL:', url);
      console.log('Catalog Service: Auth token available:', !!this.authToken);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search products');
      }

      return await response.json();
    } catch (error) {
      console.error('Product search error:', error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string): Promise<CatalogProduct | null> {
    if (!this.authToken) {
      throw new Error('Not authenticated with catalog-app');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/products/sku/${encodeURIComponent(sku)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to get product');
      }

      return await response.json();
    } catch (error) {
      console.error('Get product by SKU error:', error);
      throw error;
    }
  }

  /**
   * Check inventory availability
   */
  async checkInventory(items: Array<{ sku: string; quantity: number }>): Promise<InventoryUpdateResponse> {
    console.log('Catalog Service: checkInventory called with clientSlug:', this.clientSlug);
    if (!this.clientSlug) {
      console.error('Catalog Service: Client slug not set. Auth token:', !!this.authToken);
      throw new Error('Client slug not set');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/public/inventory/check?client=${this.clientSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check inventory');
      }

      return await response.json();
    } catch (error) {
      console.error('Inventory check error:', error);
      throw error;
    }
  }

  /**
   * Reduce inventory (for order creation)
   */
  async reduceInventory(items: Array<{ sku: string; quantity: number; isPreorder?: boolean }>, orderId?: string): Promise<InventoryUpdateResponse> {
    console.log('Catalog Service: reduceInventory called with clientSlug:', this.clientSlug);
    
    if (!this.authToken) {
      throw new Error('Not authenticated with catalog-app');
    }

    // Generate a temporary order ID if none provided
    const tempOrderId = orderId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Call scan2ship catalog API instead of catalog app directly
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          action: 'reduce_inventory',
          data: {
            items: items.map(item => ({ sku: item.sku, quantity: item.quantity })),
            orderId: tempOrderId
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reduce inventory');
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Inventory reduction error:', error);
      throw error;
    }
  }

  /**
   * Restore inventory (for order cancellation/updates)
   */
  async restoreInventory(items: Array<{ sku: string; quantity: number }>): Promise<InventoryUpdateResponse> {
    if (!this.clientSlug) {
      throw new Error('Client slug not set');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/public/inventory/restore?client=${this.clientSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore inventory');
      }

      return await response.json();
    } catch (error) {
      console.error('Inventory restoration error:', error);
      throw error;
    }
  }

  /**
   * Get product details for order display
   */
  async getProductDetails(sku: string): Promise<CatalogProduct | null> {
    return this.getProductBySku(sku);
  }

  /**
   * Validate authentication status
   */
  async validateAuth(): Promise<boolean> {
    if (!this.authToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/users/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Auth validation error:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.authToken && this.clientSlug);
  }

  /**
   * Get current client slug
   */
  getClientSlug(): string | null {
    return this.clientSlug;
  }

  /**
   * Debug method to check current state
   */
  debugState(): void {
    console.log('Catalog Service Debug State:', {
      hasAuthToken: !!this.authToken,
      hasClientSlug: !!this.clientSlug,
      clientSlugValue: this.clientSlug,
      baseUrl: this.baseUrl,
      localStorage: {
        hasToken: typeof window !== 'undefined' ? !!localStorage.getItem('catalog_auth_token') : 'N/A',
        hasUser: typeof window !== 'undefined' ? !!localStorage.getItem('catalog_user') : 'N/A',
        hasClientSlug: typeof window !== 'undefined' ? !!localStorage.getItem('catalog_client_slug') : 'N/A',
        clientSlugValue: typeof window !== 'undefined' ? localStorage.getItem('catalog_client_slug') : 'N/A'
      }
    });
  }

  /**
   * Refresh client slug from stored user data
   */
  refreshClientSlug(): boolean {
    if (typeof window === 'undefined') return false;
    
    const user = localStorage.getItem('catalog_user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData?.client?.slug) {
          this.clientSlug = userData.client.slug;
          localStorage.setItem('catalog_client_slug', userData.client.slug);
          console.log('Catalog Service: Refreshed client slug:', this.clientSlug);
          return true;
        }
      } catch (error) {
        console.error('Catalog Service: Error refreshing client slug:', error);
      }
    }
    return false;
  }
}

// Singleton instance
export const catalogService = new CatalogService();
