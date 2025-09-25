'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientSide } from '@/hooks/useClientSide';
import { usePathname } from 'next/navigation';
import SaaSLogin from './SaaSLogin';
import Navigation from './Navigation';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isClient, isHydrated } = useClientSide();
  const pathname = usePathname();
  
  // Always call useAuth hook to maintain hook order consistency
  const auth = useAuth();

  // Allow public access to tracking page
  const isPublicPage = pathname === '/tracking';

  // Handle authentication errors gracefully
  useEffect(() => {
    if (auth && !auth.isLoading && !auth.isAuthenticated) {
      // Reset error state when authentication is successful
      // This will be handled by the context now
    }
  }, [auth?.isAuthenticated, auth?.isLoading]);

  // Show loading spinner while checking authentication or if not client-side yet
  // Also handle SSR case where auth.isLoading will be true
  if (!isClient || !isHydrated || auth.isLoading) {
    // For tracking page, show a simple loading state
    if (isPublicPage) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" suppressHydrationWarning>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" suppressHydrationWarning>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="inline-flex items-center justify-center mb-4">
                <div className="w-20 h-20 bg-blue-100 rounded-lg animate-pulse"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan2Ship</h1>
            <p className="text-gray-600">SaaS Logistics Management Platform</p>
            <p className="text-sm text-gray-500 mt-1">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Allow public pages to render without authentication
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Show SaaS login if not authenticated
  if (!auth.isAuthenticated) {
    return <SaaSLogin onLoginSuccess={() => {}} />;
  }

  // Show main application with navigation if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pt-12">
        {children}
      </main>
    </div>
  );
}
