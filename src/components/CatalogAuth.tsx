'use client';

import { useState, useEffect } from 'react';
import { catalogService, CatalogAuthResponse } from '@/lib/catalog-service';

interface CatalogAuthProps {
  onAuthSuccess: (authData: CatalogAuthResponse) => void;
  onAuthError: (error: string) => void;
}

export default function CatalogAuth({ onAuthSuccess, onAuthError }: CatalogAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if already authenticated
    const isAuth = catalogService.loadStoredAuth();
    if (isAuth) {
      const userData = localStorage.getItem('catalog_user');
      if (userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const authData = await catalogService.authenticate(email, password);
      setUser(authData.user);
      setIsAuthenticated(true);
      onAuthSuccess(authData);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      onAuthError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    catalogService.clearAuth();
    setUser(null);
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setError('');
  };

  if (isAuthenticated && user) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">
                Connected to Catalog App
              </p>
              <p className="text-xs text-green-600">
                Logged in as {user.name} ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-green-600 hover:text-green-800 underline"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-blue-800 mb-1">
          Connect to Catalog App
        </h3>
        <p className="text-xs text-blue-600">
          Connect to your catalog app to search products and sync inventory
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-3">
        <div>
          <label htmlFor="catalog-email" className="block text-xs font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="catalog-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your catalog app email"
            required
          />
        </div>

        <div>
          <label htmlFor="catalog-password" className="block text-xs font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="catalog-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your catalog app password"
            required
          />
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : 'Connect to Catalog'}
        </button>
      </form>
    </div>
  );
}
