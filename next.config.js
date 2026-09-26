/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Cloudflare Pages does not run Next's built-in image optimizer,
    // so images are served unoptimized (still fine for an MVP).
    unoptimized: true,
  },
};

module.exports = nextConfig;
