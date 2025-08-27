'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientSide } from '@/hooks/useClientSide';
import SaaSLogin from './SaaSLogin';
import Navigation from './Navigation';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isClient, isHydrated } = useClientSide();
  
  // Only use the useAuth hook on the client side
  const auth = isClient ? useAuth() : null;

  // Handle authentication errors gracefully
  useEffect(() => {
    if (auth && !auth.isLoading && !auth.isAuthenticated) {
      // Reset error state when authentication is successful
      // This will be handled by the context now
    }
  }, [auth?.isAuthenticated, auth?.isLoading]);

  // Show loading spinner while checking authentication or if not client-side yet
  if (!isClient || !isHydrated || (auth?.isLoading)) {
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

  // Show error boundary if authentication context fails
  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-red-900 mb-2">Authentication Error</h1>
            <p className="text-red-600">Unable to load authentication. Please refresh the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show SaaS login if not authenticated
  if (!auth.isAuthenticated) {
    return <SaaSLogin onLoginSuccess={() => {}} />;
  }

  // Show main application with navigation if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
