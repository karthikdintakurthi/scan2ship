'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

interface SaaSLoginProps {
  onLoginSuccess: () => void;
}

export default function SaaSLogin({ onLoginSuccess }: SaaSLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(loginEmail, loginPassword);
    
    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" suppressHydrationWarning>
      <div className="max-w-md w-full">
        {/* Logo and Title */}
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
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h2>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Terms and Conditions Disclaimer */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            By logging in, you agree to our{' '}
            <a 
              href="https://www.scan2ship.in/terms-and-conditions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Terms and Conditions
            </a>
            {' '}and{' '}
            <a 
              href="https://www.scan2ship.in/privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Privacy Policy
            </a>
            . Please review these documents before proceeding.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 mt-6">
          <p>© 2024 Scan2Ship. All rights reserved.</p>
          <p className="mt-1">SaaS Logistics Management Platform</p>
        </div>
      </div>
    </div>
  );
}
