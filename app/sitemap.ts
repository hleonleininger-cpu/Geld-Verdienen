import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SHOP_PRODUCTS } from "@/lib/shop";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/shop`, changeFrequency: "monthly", priority: 0.6 },
    ...SHOP_PRODUCTS.map((product) => ({
      url: `${base}/shop/${product.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  // Oeffentliche Business-Anfrageseiten sind bewusst indexierbar (siehe
  // robots.ts) – businesses_select_public erlaubt anonymes Lesen genau
  // dieser Spalten.
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1000);

  const businessEntries: MetadataRoute.Sitemap = (businesses ?? []).map((b) => ({
    url: `${base}/${b.slug}`,
    lastModified: b.updated_at,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticEntries, ...businessEntries];
}
