import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: [".open-next/**", ".wrangler/**", "cloudflare-env.d.ts"],
  },
];

export default config;
