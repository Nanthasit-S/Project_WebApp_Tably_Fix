/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // เพิ่มส่วนนี้เข้าไป
  experimental: {
    outputFileTracingIncludes: {
      '/api/auth/[...nextauth]': ['./node_modules/jose/**'],
    },
  },
};

module.exports = nextConfig;