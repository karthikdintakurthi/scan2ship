'use client';

import React, { useState, useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function AuthErrorBoundary({ children, fallback }: Props) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('AuthErrorBoundary caught an error:', event.error);
      setError(event.error);
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('AuthErrorBoundary caught an unhandled rejection:', event.reason);
      setError(new Error(event.reason?.message || 'Unhandled promise rejection'));
      setHasError(true);
    };

    // Add global error handlers
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    // Custom fallback UI
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default fallback UI
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
            <h1 className="text-3xl font-bold text-red-900 mb-2">Something went wrong</h1>
            <p className="text-red-600 mb-4">We encountered an unexpected error. Please try refreshing the page.</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => setHasError(false)} 
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
