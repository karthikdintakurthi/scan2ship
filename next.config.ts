import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // SWC minification is enabled by default in Next.js 13+
  // experimental: {
  //   // Ensure SWC is used for font loading
  //   forceSwcTransforms: true,
  // },
  // Cache busting and asset optimization
  generateBuildId: async () => {
    // Generate a unique build ID based on timestamp and git commit
    const timestamp = Date.now().toString(36);
    const gitHash = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || 'local';
    return `build-${timestamp}-${gitHash}`;
  },
  // Asset optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Headers for cache control
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            // Production chunk filenames are content-hashed, so caching them
            // forever is safe. In dev the filenames are stable (e.g.
            // app/orders/page.js), so an immutable header makes the browser
            // hold on to stale application code for a year — every source
            // change then needs a hard reload to become visible.
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  // Webpack configuration for better cache busting
  // webpack: (config, { buildId, dev, isServer }) => {
  //   // Add build ID to all chunks for better cache busting
  //   if (!dev && !isServer) {
  //     if (config.output && config.output.filename) {
  //       config.output.filename = `static/chunks/[name]-${buildId}.js`;
  //     }
  //     if (config.output && config.output.chunkFilename) {
  //       config.output.chunkFilename = `static/chunks/[name]-${buildId}.js`;
  //     }
  //   }
  //   return config;
  // },
};

export default nextConfig;
