/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@study-collab/types'],
  async rewrites() {
    // For local dev: set NEXT_PUBLIC_API_URL to your Next.js origin (e.g. http://localhost:3000)
    // so the browser hits this app and rewrites proxy to each service.
    const base = process.env.API_GATEWAY_BASE || 'http://localhost'
    return [
      { source: '/api/auth/:path*', destination: `${base}:3001/auth/:path*` },
      { source: '/api/user/:path*', destination: `${base}:3002/user/:path*` },
      { source: '/api/study/:path*', destination: `${base}:3003/:path*` },
      { source: '/api/practice/:path*', destination: `${base}:3005/practice/:path*` },
      { source: '/api/pods/:path*', destination: `${base}:3006/pods/:path*` },
      { source: '/api/leaderboard/rank', destination: `${base}:3007/leaderboards/rank` },
      { source: '/api/leaderboard/:path*', destination: `${base}:3007/leaderboards/:path*` },
      { source: '/api/reference/:path*', destination: `${base}:3008/api/:path*` },
    ]
  },
}

module.exports = nextConfig
