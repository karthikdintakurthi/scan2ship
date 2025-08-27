'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect admin and master_admin users to admin dashboard
  useEffect(() => {
    console.log('🔍 [HOME_PAGE] Auth check:', { isAuthenticated, currentUser: currentUser?.email, role: currentUser?.role });
    
    if (isAuthenticated && currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
      console.log('✅ [HOME_PAGE] Redirecting admin user to /admin');
      router.push('/admin');
    }
  }, [isAuthenticated, currentUser, router]);

  // Show loading if authentication is still being checked
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

  // Don't render anything for admin and master_admin users (they'll be redirected)
  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'master_admin')) {
    return null;
  }

  // For client users (role: 'user' or 'viewer'), show the client dashboard
  if (currentUser && (currentUser.role === 'user' || currentUser.role === 'viewer')) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              {/* Logo */}
              <div className="inline-flex items-center justify-center mb-8">
                <Image
                  src="/images/scan2ship.png"
                  alt="Scan2Ship Logo"
                  width={120}
                  height={120}
                  className="rounded-xl shadow-2xl"
                  priority
                />
              </div>
              
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Welcome to{' '}
                <span className="text-blue-600">Scan2Ship</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                A software product that brings extra speed to your regular logistics operations. 
                Streamline order management, track shipments, and accelerate your logistics business with our advanced system.
              </p>
                
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/orders"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Order
                </Link>
                
                <Link
                  href="/view-orders"
                  className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Orders
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Accelerate Your Logistics with Smart Features
              </h2>
              <p className="text-lg text-gray-600">
                Built for speed and efficiency - transform your logistics operations with cutting-edge technology
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Order Management</h3>
                <p className="text-gray-600">Create and manage orders with intelligent automation and real-time tracking</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-gray-600">Optimized for speed - process orders in seconds, not minutes</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
                <p className="text-gray-600">Get detailed insights into your operations with comprehensive analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/images/scan2ship.png"
              alt="Scan2Ship Logo"
              width={80}
              height={80}
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan2Ship</h1>
          <p className="text-gray-600">SaaS Logistics Management Platform</p>
          <p className="text-sm text-gray-500 mt-1">Please log in to continue</p>
        </div>
      </div>
    </div>
  );
}
