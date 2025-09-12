/**
 * API Utilities - Handles authenticated API requests with automatic token refresh
 */

import { tokenManager } from '@/lib/token-manager';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

/**
 * Make an authenticated API request with automatic token refresh
 */
export async function apiRequest<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await tokenManager.authenticatedRequest(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Request failed with status ${response.status}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed'
    };
  }
}

/**
 * GET request
 */
export async function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost<T = any>(url: string, data: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/**
 * PUT request
 */
export async function apiPut<T = any>(url: string, data: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: 'DELETE' });
}

/**
 * Upload file with authentication
 */
export async function apiUpload<T = any>(url: string, formData: FormData): Promise<ApiResponse<T>> {
  const token = await tokenManager.getValidToken();
  
  if (!token) {
    return {
      success: false,
      error: 'No valid token available. Please login.'
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Upload failed with status ${response.status}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('File upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Format address API call
 */
export async function formatAddress(addressText: string): Promise<ApiResponse> {
  return apiPost('/api/format-address', { addressText });
}

/**
 * Format address from image API call
 */
export async function formatAddressFromImage(imageFile: File): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);
  return apiUpload('/api/format-address-image', formData);
}

/**
 * Create order API call
 */
export async function createOrder(orderData: any): Promise<ApiResponse> {
  return apiPost('/api/orders', orderData);
}

/**
 * Get orders API call
 */
export async function getOrders(params: any = {}): Promise<ApiResponse> {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/api/orders?${queryString}` : '/api/orders';
  return apiGet(url);
}

/**
 * Fulfill order API call
 */
export async function fulfillOrder(orderId: string): Promise<ApiResponse> {
  return apiPost(`/api/orders/${orderId}/fulfill`, {});
}

/**
 * Get client settings API call
 */
export async function getClientSettings(): Promise<ApiResponse> {
  return apiGet('/api/client-settings');
}

/**
 * Update client settings API call
 */
export async function updateClientSettings(settings: any): Promise<ApiResponse> {
  return apiPut('/api/client-settings', settings);
}
