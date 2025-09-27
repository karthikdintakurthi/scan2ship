'use client';

import SaaSLogin from '@/components/SaaSLogin';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // If already authenticated, redirect appropriately
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === 'client_admin' || currentUser.role === 'super_admin' || currentUser.role === 'master_admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [isAuthenticated, currentUser, router]);

  const handleLoginSuccess = () => {
    // The useEffect above will handle the redirect
  };

  // Show loading if checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <SaaSLogin onLoginSuccess={handleLoginSuccess} />;
}
