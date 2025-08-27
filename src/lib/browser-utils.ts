/**
 * Utility functions for safe browser API access during SSR
 */

export const isBrowser = typeof window !== 'undefined';

export const isServer = !isBrowser;

/**
 * Safely access localStorage
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isServer) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    if (isServer) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    if (isServer) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  clear: (): boolean => {
    if (isServer) return false;
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Safely access sessionStorage
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (isServer) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    if (isServer) return false;
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    if (isServer) return false;
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  clear: (): boolean => {
    if (isServer) return false;
    try {
      sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Safely access cookies
 */
export const safeCookies = {
  get: (name: string): string | null => {
    if (isServer) return null;
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    } catch {
      return null;
    }
  },
  
  set: (name: string, value: string, options?: { expires?: number; path?: string; domain?: string; secure?: boolean; sameSite?: string }): boolean => {
    if (isServer) return false;
    try {
      let cookie = `${name}=${value}`;
      
      if (options?.expires) {
        const date = new Date();
        date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
        cookie += `; expires=${date.toUTCString()}`;
      }
      
      if (options?.path) cookie += `; path=${options.path}`;
      if (options?.domain) cookie += `; domain=${options.domain}`;
      if (options?.secure) cookie += '; secure';
      if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
      
      document.cookie = cookie;
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (name: string, options?: { path?: string; domain?: string }): boolean => {
    if (isServer) return false;
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${options?.path ? `; path=${options.path}` : ''}${options?.domain ? `; domain=${options.domain}` : ''}`;
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Safely execute browser-specific code
 */
export const safeExecute = <T>(
  fn: () => T,
  fallback?: T,
  errorHandler?: (error: Error) => void
): T | undefined => {
  if (isServer) return fallback;
  
  try {
    return fn();
  } catch (error) {
    if (errorHandler && error instanceof Error) {
      errorHandler(error);
    } else {
      console.error('Browser API execution failed:', error);
    }
    return fallback;
  }
};

/**
 * Wait for browser APIs to be available
 */
export const waitForBrowser = (): Promise<void> => {
  if (isBrowser) {
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    const check = () => {
      if (typeof window !== 'undefined') {
        resolve();
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
};
