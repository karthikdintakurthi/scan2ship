import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use SWC for production builds, Babel only for Jest testing
  swcMinify: true,
  experimental: {
    // Ensure SWC is used for font loading
    forceSwcTransforms: true,
  }
};

export default nextConfig;
