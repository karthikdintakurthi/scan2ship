'use client';

/**
 * useAuth Hook - Provides authentication state and methods
 */

import { useState, useEffect, useCallback } from 'react';
import { tokenManager } from '@/lib/token-manager';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Client {
  id: string;
  name: string;
  isActive: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  client: Client | null;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    client: null,
    error: null
  });

  const checkAuthStatus = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const token = await tokenManager.getValidToken();
      
      if (!token) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          client: null,
          error: null
        });
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: data.user,
          client: data.client,
          error: null
        });
      } else {
        // Token verification failed
        tokenManager.clearTokens();
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          client: null,
          error: 'Authentication failed'
        });
      }

    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        client: null,
        error: 'Authentication check failed'
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store tokens
        const expiresAt = Math.floor(Date.now() / 1000) + (8 * 60 * 60); // 8 hours
        tokenManager['storeTokens']({
          token: data.token,
          refreshToken: data.refreshToken,
          expiresAt,
          userId: data.user.id,
          clientId: data.client.id
        });

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: data.user,
          client: data.client,
          error: null
        });

        return { success: true };
      } else {
        const errorData = await response.json();
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: errorData.error || 'Login failed' 
        }));
        return { success: false, error: errorData.error || 'Login failed' };
      }

    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Login failed' 
      }));
      return { success: false, error: 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    tokenManager.clearTokens();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      client: null,
      error: null
    });
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refreshed = await tokenManager.refreshToken();
      if (refreshed) {
        // Re-check auth status with new token
        await checkAuthStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, [checkAuthStatus]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    ...authState,
    login,
    logout,
    refreshToken,
    checkAuthStatus
  };
}
