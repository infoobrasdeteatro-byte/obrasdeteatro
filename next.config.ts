import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pnsirwtiiurczjwrayza.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/login',         destination: '/auth/login',    permanent: true },
      { source: '/registro',      destination: '/auth/registro', permanent: true },
      { source: '/profesionales', destination: '/directorio',    permanent: true },
    ]
  },
};

export default nextConfig;
