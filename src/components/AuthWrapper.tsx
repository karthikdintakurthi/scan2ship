'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SaaSLogin from './SaaSLogin';
import Navigation from './Navigation';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading spinner while checking authentication or if not client-side yet
  if (isLoading || !isClient) {
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

  // Show SaaS login if not authenticated
  if (!isAuthenticated) {
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
