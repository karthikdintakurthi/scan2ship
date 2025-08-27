import { useState, useEffect } from 'react';

export function useClientSide() {
  const [isClient, setIsClient] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      // Small delay to ensure hydration is complete
      const timer = setTimeout(() => {
        setIsHydrated(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isClient]);

  return {
    isClient,
    isHydrated,
    // Helper to safely execute code only on client side
    safeExecute: <T>(fn: () => T, fallback?: T): T | undefined => {
      if (isClient) {
        try {
          return fn();
        } catch (error) {
          console.error('Client-side execution failed:', error);
          return fallback;
        }
      }
      return fallback;
    }
  };
}
