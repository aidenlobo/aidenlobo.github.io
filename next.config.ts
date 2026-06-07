import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Required for GitHub Pages to correctly serve assets
  images: {
    unoptimized: true,
  },
};

export default nextConfig;