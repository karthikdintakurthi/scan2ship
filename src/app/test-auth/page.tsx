'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function TestAuthPage() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginResult, setLoginResult] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginResult('Logging in...');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        setLoginResult(`✅ Login successful! User: ${data.user.name}, Role: ${data.user.role}`);
        // Reload the page to update auth context
        window.location.reload();
      } else {
        setLoginResult(`❌ Login failed: ${data.error}`);
      }
    } catch (error) {
      setLoginResult(`❌ Error: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Authentication Test</h1>
        
        {/* Current Status */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold text-gray-900 mb-2">Current Status:</h2>
          <p className="text-sm text-gray-600">
            <strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}
          </p>
          {currentUser && (
            <>
              <p className="text-sm text-gray-600">
                <strong>User:</strong> {currentUser.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {currentUser.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Role:</strong> {currentUser.role}
              </p>
            </>
          )}
        </div>

        {/* Login Form */}
        {!isAuthenticated && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="karthik@scan2ship.in"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Darling@2706"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Login
            </button>
          </form>
        )}

        {/* Login Result */}
        {loginResult && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-700">{loginResult}</p>
          </div>
        )}

        {/* Navigation Links */}
        {isAuthenticated && (
          <div className="mt-6 space-y-2">
            <h3 className="font-semibold text-gray-900">Navigation:</h3>
            <a
              href="/admin"
              className="block w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-center"
            >
              Go to Admin Dashboard
            </a>
            <a
              href="/"
              className="block w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-center"
            >
              Go to Home
            </a>
          </div>
        )}

        {/* Test Credentials */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Test Credentials:</h3>
          <p className="text-sm text-blue-700">
            <strong>Email:</strong> karthik@scan2ship.in
          </p>
          <p className="text-sm text-blue-700">
            <strong>Password:</strong> Darling@2706
          </p>
        </div>
      </div>
    </div>
  );
}
