'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import CreditWallet from './CreditWallet';
import { getClientBranding } from '@/lib/pwa-config';
import { usePickupLocations } from '@/hooks/usePickupLocations';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser, currentClient, logout } = useAuth();
  const { pickupLocations } = usePickupLocations();

  // Get dynamic branding based on current client
  const branding = getClientBranding(currentClient);

  // Determine navigation based on context
  console.log('🔍 [NAVIGATION] Current user:', currentUser);
  console.log('🔍 [NAVIGATION] User role:', currentUser?.role);
  
  let navigation;
  let clientDropdownItems;
  
  if (currentUser?.role === 'master_admin') {
    console.log('✅ [NAVIGATION] Setting up master admin navigation');
    // Master Admin view - full system access
    navigation = [
      { name: 'Master Dashboard', href: '/admin', current: pathname === '/admin' },
      { name: 'System Settings', href: '/admin/settings', current: pathname === '/admin/settings' },
      { name: 'Credit Management', href: '/admin/credits', current: pathname === '/admin/credits' },
    ];
    clientDropdownItems = [
      { name: 'Client Management', href: '/admin/clients', current: pathname === '/admin/clients' },
      { name: 'Client Configurations', href: '/admin/client-configurations', current: pathname === '/admin/client-configurations' },
    ];
  } else if (currentUser?.role === 'admin') {
    console.log('✅ [NAVIGATION] Setting up client admin navigation');
    // Client admin view
    navigation = [
      { name: 'Admin Dashboard', href: '/admin', current: pathname === '/admin' },
      { name: 'Create Order', href: '/orders', current: pathname === '/orders' },
      { name: 'View Orders', href: '/admin/orders', current: pathname === '/admin/orders' },
      { name: 'Settings', href: '/admin/settings', current: pathname === '/admin/settings' },
    ];
  } else {
    console.log('✅ [NAVIGATION] Setting up regular user navigation');
    // Regular client user view
    navigation = [
      { name: 'Dashboard', href: '/', current: pathname === '/' },
      { name: 'Create Order', href: '/orders', current: pathname === '/orders' },
      { name: 'View Orders', href: '/view-orders', current: pathname === '/view-orders' },
    ];
    
    // Add Wallet menu only for non-child users
    if (currentUser?.role !== 'child_user') {
      navigation.push({ name: 'Wallet', href: '/credits', current: pathname === '/credits' });
    }
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Image
                src={branding.logo}
                alt={branding.shortName}
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">{branding.shortName}</h1>
                {currentClient && (
                  <p className="text-xs text-gray-600">{currentClient.companyName}</p>
                )}
                {/* Show pickup locations for child users */}
                {currentUser?.role === 'child_user' && pickupLocations.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-blue-600 font-medium">
                      📍 {pickupLocations.map(pl => pl.label).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    item.current
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <div className="hidden md:ml-4 md:flex md:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  {/* Credit Wallet - Only show for non-master-admin and non-child-user users */}
                  {currentUser && currentUser.role !== 'master_admin' && currentUser.role !== 'child_user' && (
                    <CreditWallet />
                  )}
                  
                  {/* User Info */}
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentUser?.role || 'user'} • {currentUser?.email}
                    </p>
                  </div>
                  
                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  item.current
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile User Info */}
            <div className="px-3 py-2 border-t border-gray-200">
              {/* Credit Wallet - Only show for non-master-admin and non-child-user users */}
              {currentUser && currentUser.role !== 'master_admin' && currentUser.role !== 'child_user' && (
                <div className="mb-3">
                  <CreditWallet />
                </div>
              )}
              
              <p className="text-sm font-medium text-gray-900">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500">
                {currentUser?.role || 'user'} • {currentUser?.email}
              </p>
              {currentClient && (
                <p className="text-xs text-gray-500 mt-1">
                  {currentClient.companyName}
                </p>
              )}
              
              <button
                onClick={handleLogout}
                className="mt-2 w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
