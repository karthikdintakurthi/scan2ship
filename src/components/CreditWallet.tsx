'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function CreditWallet() {
  const { currentUser, creditBalance, refreshCredits } = useAuth();

  useEffect(() => {
    if (currentUser && !creditBalance) {
      refreshCredits();
    }
  }, [currentUser, creditBalance, refreshCredits]);

  if (!currentUser) {
    return null;
  }

  if (!creditBalance) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading credits...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
      <div className="w-4 h-4 text-blue-600 text-center font-bold text-sm">₹</div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-blue-900">
          {creditBalance.balance} Credits
        </span>
        <span className="text-xs text-blue-600">
          Available
        </span>
      </div>
    </div>
  );
}
