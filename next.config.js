/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: false, // <-- REQUIRED FOR NETLIFY API ROUTES
  },
};

module.exports = nextConfig;
