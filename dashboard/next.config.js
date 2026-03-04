/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained build in .next/standalone — required for
  // Phusion Passenger / cPanel Node.js App deployment.
  output: 'standalone',
  // Required for Sentry instrumentation.ts to be loaded
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
