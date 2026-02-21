/** @type {import('next').NextConfig} */
const normalizeAuthEnv = () => {
  const keys = ["NEXTAUTH_URL", "NEXTAUTH_URL_INTERNAL", "VERCEL_URL"];

  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim() === "") {
      delete process.env[key];
    }
  }

  if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
};

normalizeAuthEnv();

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
