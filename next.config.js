/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.mapbox.com', 'cf.bstatic.com'],
  },
}

module.exports = nextConfig

