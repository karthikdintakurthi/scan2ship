import { Client } from '@/types/auth';

export interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  orientation: string;
  scope: string;
  lang: string;
  categories: string[];
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
  screenshots: Array<{
    src: string;
    sizes: string;
    type: string;
    form_factor: string;
  }>;
}

export interface ClientBranding {
  name: string;
  shortName: string;
  description: string;
  logo: string;
  themeColor: string;
  backgroundColor: string;
}

// Default branding for Scan2Ship
const defaultBranding: ClientBranding = {
  name: 'Scan2Ship - SaaS Logistics Management Platform',
  shortName: 'Scan2Ship',
  description: 'A comprehensive SaaS platform for logistics management, order processing, and courier integration.',
  logo: '/images/scan2ship.png',
  themeColor: '#2563eb',
  backgroundColor: '#ffffff'
};

// Client-specific branding configurations
const clientBrandingMap: Record<string, ClientBranding> = {
  'vanitha-logistics': {
    name: 'Vanitha Logistics - Order Management System',
    shortName: 'Vanitha Logistics',
    description: 'Professional logistics and order management system for Vanitha Logistics.',
    logo: '/images/vanitha-logistics.png',
    themeColor: '#059669', // Green theme
    backgroundColor: '#f0fdf4'
  },
  'vjl': {
    name: 'VJL - Logistics Management Platform',
    shortName: 'VJL',
    description: 'Advanced logistics management and order processing system for VJL.',
    logo: '/images/vjl.png',
    themeColor: '#7c3aed', // Purple theme
    backgroundColor: '#faf5ff'
  }
};

export function getClientBranding(client: Client | null): ClientBranding {
  if (!client) {
    return defaultBranding;
  }

  // Try to match client by company name or ID
  const clientKey = client.companyName?.toLowerCase().replace(/\s+/g, '-') || 
                   client.id?.toLowerCase();
  
  return clientBrandingMap[clientKey] || defaultBranding;
}

export function generatePWAManifest(client: Client | null): PWAManifest {
  const branding = getClientBranding(client);
  
  return {
    name: branding.name,
    short_name: branding.shortName,
    description: branding.description,
    start_url: '/',
    display: 'standalone',
    background_color: branding.backgroundColor,
    theme_color: branding.themeColor,
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: branding.logo,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: branding.logo,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    screenshots: [
      {
        src: branding.logo,
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide'
      },
      {
        src: branding.logo,
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow'
      }
    ]
  };
}

export function updatePWAHead(client: Client | null) {
  const branding = getClientBranding(client);
  
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
    // Generate a unique manifest URL for the client
    const manifestUrl = `/api/pwa/manifest?client=${client?.id || 'default'}`;
    manifestLink.href = manifestUrl;
  }
}
