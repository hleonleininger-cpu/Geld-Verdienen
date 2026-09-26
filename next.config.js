/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Cloudflare Workers runs no built-in Next.js image optimizer,
    // so images are served unoptimized (fine for our current image volume).
    unoptimized: true,
  },
};

// Enables Cloudflare bindings (env vars, KV, R2, ...) inside `next dev`
// so local development matches the Workers runtime used by
// @opennextjs/cloudflare in production/preview.
// See https://opennext.js.org/cloudflare/get-started
import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) =>
  initOpenNextCloudflareForDev()
);

module.exports = nextConfig;
