'use client';

import { useEffect } from 'react';

export default function PWAScript() {
  useEffect(() => {
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

  return null; // This component doesn't render anything
}
