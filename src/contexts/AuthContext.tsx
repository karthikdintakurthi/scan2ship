'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeLocalStorage } from '@/lib/browser-utils';

// Browser-compatible JWT decode function
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isActive: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  clientId: string;
}

interface Session {
  id: string;
  userId: string;
  clientId: string;
  token: string;
  expiresAt: string;
}

interface ClientCredits {
  id: string;
  clientId: string;
  balance: number;
  totalAdded: number;
  totalUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Current user and client
  currentUser: User | null;
  currentClient: Client | null;
  currentSession: Session | null;
  
  // Credit balance
  creditBalance: ClientCredits | null;
  
  // Authentication methods
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registerClient: (clientData: any) => Promise<{ success: boolean; error?: string }>;
  registerUser: (userData: any) => Promise<{ success: boolean; error?: string }>;
  
  // Session management
  checkAuth: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  
  // Credit management
  refreshCredits: () => Promise<void>;
  updateCredits: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  
  // Handle SSR case - return safe defaults if context is not available
  if (context === undefined) {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      // Return safe defaults for SSR
      return {
        isAuthenticated: false,
        isLoading: true,
        currentUser: null,
        currentClient: null,
        currentSession: null,
        creditBalance: null,
        login: async () => ({ success: false, error: 'SSR not supported' }),
        logout: () => {},
        registerClient: async () => ({ success: false, error: 'SSR not supported' }),
        registerUser: async () => ({ success: false, error: 'SSR not supported' }),
        checkAuth: async () => false,
        refreshSession: async () => false,
        refreshCredits: async () => {},
        updateCredits: () => {},
      };
    }
    
    // On client side, throw error if context is not available
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [creditBalance, setCreditBalance] = useState<ClientCredits | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safe localStorage access using utility functions
  const getStoredToken = (): string | null => {
    return safeLocalStorage.getItem('authToken');
  };

  const setStoredToken = (token: string): void => {
    safeLocalStorage.setItem('authToken', token);
  };

  const removeStoredToken = (): void => {
    safeLocalStorage.removeItem('authToken');
  };

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = getStoredToken();
      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setCurrentClient(data.client);
        setCurrentSession(data.session);
        setIsAuthenticated(true);
        return true;
      } else {
        // Clear invalid session
        removeStoredToken();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCurrentClient(null);
        setCurrentSession(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      removeStoredToken();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentClient(null);
      setCurrentSession(null);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStoredToken(data.session.token);
        setCurrentUser(data.user);
        setCurrentClient(data.client);
        setCurrentSession(data.session);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    removeStoredToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentClient(null);
    setCurrentSession(null);
    setCreditBalance(null);
  };

  const refreshCredits = async (): Promise<void> => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    try {
      const token = getStoredToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/credits', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCreditBalance(data.data);
      }
    } catch (error) {
      console.error('Failed to refresh credits:', error);
    }
  };

  const updateCredits = (newBalance: number) => {
    if (creditBalance) {
      setCreditBalance({
        ...creditBalance,
        balance: newBalance
      });
    }
  };

  const registerClient = async (clientData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const registerUser = async (userData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const token = getStoredToken();
      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStoredToken(data.token);
        setCurrentSession(data.session);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      logout();
      return false;
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (!isClient || typeof window === 'undefined') {
      return;
    }
    
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const isAuth = await checkAuth();
        setIsAuthenticated(isAuth);
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [isClient]);

  const value = {
    isAuthenticated,
    isLoading,
    currentUser,
    currentClient,
    currentSession,
    creditBalance,
    login,
    logout,
    registerClient,
    registerUser,
    checkAuth,
    refreshSession,
    refreshCredits,
    updateCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
