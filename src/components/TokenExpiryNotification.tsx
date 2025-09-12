/**
 * TokenExpiryNotification - Shows notification when token is about to expire
 */

import React, { useState, useEffect } from 'react';
import { tokenManager } from '@/lib/token-manager';

interface TokenExpiryNotificationProps {
  onRefresh?: () => void;
  onLogout?: () => void;
}

export function TokenExpiryNotification({ onRefresh, onLogout }: TokenExpiryNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkTokenExpiry = () => {
      if (tokenManager.isTokenExpired(15)) { // 15 minutes before expiry
        setShowNotification(true);
        
        // Calculate time remaining
        const tokenData = tokenManager['getStoredTokens']();
        if (tokenData) {
          const now = Date.now() / 1000;
          const remaining = Math.max(0, tokenData.expiresAt - now);
          setTimeRemaining(Math.floor(remaining / 60)); // Convert to minutes
        }
      } else {
        setShowNotification(false);
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await tokenManager.refreshToken();
      if (refreshed) {
        setShowNotification(false);
        onRefresh?.();
      } else {
        // Refresh failed, redirect to login
        onLogout?.();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      onLogout?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    tokenManager.clearTokens();
    onLogout?.();
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            Session Expiring Soon
          </h3>
          <div className="mt-2 text-sm">
            <p>
              Your session will expire in {timeRemaining} minutes. 
              Would you like to extend your session?
            </p>
          </div>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? 'Extending...' : 'Extend Session'}
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => setShowNotification(false)}
            className="text-yellow-400 hover:text-yellow-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
