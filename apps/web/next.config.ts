import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:4000/socket.io/:path*',
      },
      {
        source: '/collab',
        destination: 'http://localhost:4000/collab',
      },
    ];
  },
};

export default nextConfig;
