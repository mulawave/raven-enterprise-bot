/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const parsedApiUrl = new URL(apiUrl)

const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained build in .next/standalone — required for
  // Phusion Passenger / cPanel Node.js App deployment.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: parsedApiUrl.protocol.replace(':', ''),
        hostname: parsedApiUrl.hostname,
        port: parsedApiUrl.port,
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
        pathname: '/**',
      },
    ],
  },
  // Required for Sentry instrumentation.ts to be loaded
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
