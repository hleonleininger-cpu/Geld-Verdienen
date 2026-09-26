import type { MetadataRoute } from "next";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/admin",
          "/admin/",
          "/quotes/",
          "/login",
          "/register",
          "/reset-password",
          "/reset-password/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
