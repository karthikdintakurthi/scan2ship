import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthWrapper from '@/components/AuthWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Scan2Ship - SaaS Logistics Management Platform',
  description: 'A comprehensive SaaS platform for logistics management, order processing, and courier integration.',
  keywords: 'logistics, SaaS, order management, courier services, shipping, delivery',
  authors: [{ name: 'Scan2Ship' }],
  creator: 'Scan2Ship',
  publisher: 'Scan2Ship',
  metadataBase: new URL('https://scan2ship.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Scan2Ship - SaaS Logistics Management Platform',
    description: 'A comprehensive SaaS platform for logistics management, order processing, and courier integration.',
    url: 'https://scan2ship.com',
    siteName: 'Scan2Ship',
    images: [
      {
        url: '/images/scan2ship.png',
        width: 1200,
        height: 630,
        alt: 'Scan2Ship SaaS Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scan2Ship - SaaS Logistics Management Platform',
    description: 'A comprehensive SaaS platform for logistics management, order processing, and courier integration.',
    images: ['/images/scan2ship.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  applicationName: 'Scan2Ship - SaaS Logistics Management Platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Scan2Ship - SaaS Logistics Management Platform',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Static PWA Meta Tags - will be updated by DynamicPWAHead */}
        <link rel="icon" href="/images/scan2ship.png" />
        <link rel="apple-touch-icon" href="/images/scan2ship.png" />
        <link rel="manifest" href="/api/pwa/manifest?client=default" />
        <meta name="theme-color" content="#2563eb" />
        
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Scan2Ship" />
        
        {/* iOS PWA Meta Tags */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        
        {/* Android PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Scan2Ship" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
