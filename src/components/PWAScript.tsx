'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function PWAScript() {
  const { currentClient } = useAuth();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });

      // Handle updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
      });
    }

    // Add to home screen prompt for mobile
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button or notification
      console.log('App can be installed');
      
      // You can show a custom install button here
      // For now, we'll just log it
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('App was installed');
      deferredPrompt = null;
    });
  }, []);

  // Update PWA branding when client changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (currentClient) {
      // Use a timeout to avoid race conditions with other components
      const timeoutId = setTimeout(() => {
        try {
          // Update PWA head elements based on client branding
          import('@/lib/pwa-config').then(({ updatePWAHead }) => {
            updatePWAHead(currentClient);
          }).catch(console.error);
        } catch (error) {
          console.error('Error updating PWA branding:', error);
        }
      }, 100); // Small delay to avoid race conditions

      return () => clearTimeout(timeoutId);
    }
  }, [currentClient]);

  return null; // This component doesn't render anything
}
