import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // API base URL — point at eventful-api in dev, real domain in prod
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1',
  },
  // Allow ngrok tunnels to load Next.js dev resources (chunks, HMR)
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.io',
  ],
};

export default nextConfig;
