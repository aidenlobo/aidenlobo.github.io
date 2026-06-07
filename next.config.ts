import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Required for GitHub Pages to correctly serve assets
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.1.193'],
};

export default nextConfig;