/**
 * Token Manager - Handles JWT token lifecycle and automatic refresh
 */

interface TokenData {
  token: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  clientId: string;
}

interface RefreshResponse {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: any;
  client: any;
}

export class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<TokenData | null> | null = null;

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Get stored token data from localStorage
   */
  private getStoredTokens(): TokenData | null {
    try {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      const expiresAt = localStorage.getItem('tokenExpiresAt');
      const userId = localStorage.getItem('userId');
      const clientId = localStorage.getItem('clientId');

      if (!token || !refreshToken || !expiresAt || !userId || !clientId) {
        return null;
      }

      return {
        token,
        refreshToken,
        expiresAt: parseInt(expiresAt),
        userId,
        clientId
      };
    } catch (error) {
      console.error('Error getting stored tokens:', error);
      return null;
    }
  }

  /**
   * Store token data in localStorage
   */
  private storeTokens(tokenData: TokenData): void {
    try {
      localStorage.setItem('token', tokenData.token);
      localStorage.setItem('refreshToken', tokenData.refreshToken);
      localStorage.setItem('tokenExpiresAt', tokenData.expiresAt.toString());
      localStorage.setItem('userId', tokenData.userId);
      localStorage.setItem('clientId', tokenData.clientId);
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  /**
   * Clear all stored tokens
   */
  public clearTokens(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('userId');
      localStorage.removeItem('clientId');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Check if token is expired or will expire soon
   */
  public isTokenExpired(bufferMinutes: number = 5): boolean {
    const tokenData = this.getStoredTokens();
    if (!tokenData) return true;

    const now = Date.now() / 1000;
    const bufferTime = bufferMinutes * 60; // Convert minutes to seconds
    
    return tokenData.expiresAt <= (now + bufferTime);
  }

  /**
   * Get current valid token, refreshing if necessary
   */
  public async getValidToken(): Promise<string | null> {
    const tokenData = this.getStoredTokens();
    
    if (!tokenData) {
      console.log('🔐 No tokens found, user needs to login');
      return null;
    }

    // Check if token needs refresh (5 minutes buffer)
    if (this.isTokenExpired(5)) {
      console.log('🔄 Token expired or expiring soon, refreshing...');
      const refreshed = await this.refreshToken();
      return refreshed ? refreshed.token : null;
    }

    return tokenData.token;
  }

  /**
   * Refresh the access token using refresh token
   */
  public async refreshToken(): Promise<TokenData | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      console.log('🔄 Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<TokenData | null> {
    const tokenData = this.getStoredTokens();
    
    if (!tokenData) {
      console.log('❌ No refresh token available');
      return null;
    }

    try {
      console.log('🔄 Refreshing token...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokenData.refreshToken
        })
      });

      if (!response.ok) {
        console.error('❌ Token refresh failed:', response.status, response.statusText);
        this.clearTokens();
        return null;
      }

      const data: RefreshResponse = await response.json();
      
      // Calculate new expiry time (8 hours from now)
      const newExpiresAt = Math.floor(Date.now() / 1000) + (8 * 60 * 60);
      
      const newTokenData: TokenData = {
        token: data.token,
        refreshToken: data.refreshToken,
        expiresAt: newExpiresAt,
        userId: data.user.id,
        clientId: data.client.id
      };

      this.storeTokens(newTokenData);
      
      console.log('✅ Token refreshed successfully');
      return newTokenData;

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  public async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getValidToken();
    
    if (!token) {
      throw new Error('No valid token available. Please login.');
    }

    // Add authorization header
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // If we get 401, try to refresh token once
      if (response.status === 401) {
        console.log('🔄 Got 401, attempting token refresh...');
        const refreshed = await this.refreshToken();
        
        if (refreshed) {
          // Retry the request with new token
          const newHeaders = {
            ...headers,
            'Authorization': `Bearer ${refreshed.token}`
          };
          
          return fetch(url, {
            ...options,
            headers: newHeaders
          });
        } else {
          // Refresh failed, redirect to login
          this.redirectToLogin();
          throw new Error('Authentication failed. Please login again.');
        }
      }

      return response;

    } catch (error) {
      console.error('❌ Authenticated request failed:', error);
      throw error;
    }
  }

  /**
   * Redirect to login page
   */
  private redirectToLogin(): void {
    console.log('🔐 Redirecting to login...');
    this.clearTokens();
    window.location.href = '/login?reason=session-expired';
  }

  /**
   * Initialize token monitoring
   */
  public startTokenMonitoring(): void {
    // Check token expiry every minute
    setInterval(() => {
      if (this.isTokenExpired(15)) { // 15 minutes before expiry
        console.log('⚠️ Token will expire soon, refreshing...');
        this.refreshToken();
      }
    }, 60000); // Check every minute
  }

  /**
   * Get user info from stored tokens
   */
  public getCurrentUser(): { userId: string; clientId: string } | null {
    const tokenData = this.getStoredTokens();
    return tokenData ? { userId: tokenData.userId, clientId: tokenData.clientId } : null;
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  tokenManager.startTokenMonitoring();
}
