'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Current user and client
  currentUser: User | null;
  currentClient: Client | null;
  currentSession: Session | null;
  
  // Admin switch state
  originalAdminUser: User | null;
  isAdminSwitchMode: boolean;
  
  // Authentication methods
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registerClient: (clientData: any) => Promise<{ success: boolean; error?: string }>;
  registerUser: (userData: any) => Promise<{ success: boolean; error?: string }>;
  
  // Session management
  checkAuth: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  
  // Client management
  switchClient: (clientId: string) => Promise<boolean>;
  switchToClient: (clientId: string, userId: string) => Promise<boolean>;
  resetAdminSwitchMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
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
  const [originalAdminUser, setOriginalAdminUser] = useState<User | null>(null);
  const [isAdminSwitchMode, setIsAdminSwitchMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const checkAuth = async (): Promise<boolean> => {
    try {
      // Check if we're on the client side before accessing localStorage
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
        }
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', data.session.token);
        }
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAdminSwitch');
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentClient(null);
    setCurrentSession(null);
    setOriginalAdminUser(null);
    setIsAdminSwitchMode(false);
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
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = localStorage.getItem('authToken');
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', data.token);
        }
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

  const switchClient = async (clientId: string): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/switch-client', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentClient(data.client);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const switchToClient = async (clientId: string, userId: string): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        return false;
      }

      // Store the original admin user before switching
      setOriginalAdminUser(currentUser);
      setIsAdminSwitchMode(true);

      // Create a new session for the admin user as the client user
      const response = await fetch('/api/auth/switch-to-client', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId, userId }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the current session and user context
        setCurrentUser(data.user);
        setCurrentClient(data.client);
        setCurrentSession(data.session);
        
        // Store the new token
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', data.session.token);
          
          // Set admin switch flag if this is an admin switch
          if (data.session.token) {
            try {
              const decoded = decodeJWT(data.session.token);
              if (decoded?.isAdminSwitch) {
                localStorage.setItem('isAdminSwitch', 'true');
              }
            } catch (error) {
              // Ignore decode errors
            }
          }
        }
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const resetAdminSwitchMode = () => {
    if (originalAdminUser) {
      setCurrentUser(originalAdminUser);
      setCurrentClient(null); // Reset to admin's client context
      setOriginalAdminUser(null);
      setIsAdminSwitchMode(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
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
    originalAdminUser,
    isAdminSwitchMode,
    login,
    logout,
    registerClient,
    registerUser,
    checkAuth,
    refreshSession,
    switchClient,
    switchToClient,
    resetAdminSwitchMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
