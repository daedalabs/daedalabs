import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    '192.168.1.14',
    '192.168.1.*',
    '192.168.*',
    '*.local',
    'localhost',
    '127.0.0.1',
  ],
};

export default nextConfig;
