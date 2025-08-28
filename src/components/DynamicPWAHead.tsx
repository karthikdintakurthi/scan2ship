'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClientBranding } from '@/lib/pwa-config';

export default function DynamicPWAHead() {
  const { currentClient } = useAuth();
  const branding = getClientBranding(currentClient);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    try {
      // Update document title dynamically
      if (currentClient) {
        document.title = `${branding.shortName} - ${currentClient.companyName}`;
      } else {
        document.title = branding.name;
      }

      // Update favicon
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = branding.logo;
      }

      // Update apple touch icon
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleTouchIcon) {
        appleTouchIcon.href = branding.logo;
      }

      // Update theme color meta tag
      const themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (themeColor) {
        themeColor.content = branding.themeColor;
      }

      // Update manifest link
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        const manifestUrl = `/api/pwa/manifest?client=${currentClient?.id || 'default'}`;
        manifestLink.href = manifestUrl;
      }

      // Update apple-mobile-web-app-title
      const appleAppTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
      if (appleAppTitle) {
        appleAppTitle.content = branding.shortName;
      }

      // Update application-name
      const appName = document.querySelector('meta[name="application-name"]') as HTMLMetaElement;
      if (appName) {
        appName.content = branding.shortName;
      }
    } catch (error) {
      console.warn('Error updating PWA head elements:', error);
    }
  }, [currentClient, branding]);

  return null; // This component doesn't render anything
}
