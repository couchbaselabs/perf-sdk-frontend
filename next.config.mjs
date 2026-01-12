/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },

  // Runtime-configurable basePath. Empty locally; '/results' in prod.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: false,
}

export default nextConfig