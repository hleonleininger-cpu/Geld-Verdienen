import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SHOP_PRODUCTS, getShopProduct } from "@/lib/shop";
import { getIndustry } from "@/lib/industries";
import { formatCurrencyEUR } from "@/lib/format";

export function generateStaticParams() {
  return SHOP_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) return { title: "Nicht gefunden" };
  return { title: product.name, description: product.tagline };
}

export default async function ShopProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) notFound();
  const industry = getIndustry(product.industry);

  return (
    <>
      <MarketingNavbar />
      <main className="section-pad">
        <div className="container-app max-w-3xl">
          <Link
            href="/shop"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Shop
          </Link>

          <div className="mt-6">
            <span className="eyebrow">{industry.label}</span>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 max-w-xl text-ink-600">{product.description}</p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="card-surface p-6">
              <p className="font-display text-lg font-semibold text-ink-950">
                Enthalten
              </p>
              <ul className="mt-4 space-y-3">
                {product.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-surface h-fit p-6">
              <p className="font-display text-3xl font-semibold text-ink-950">
                {formatCurrencyEUR(product.price)}
              </p>
              <p className="mt-1 text-xs text-ink-400">einmalig</p>
              <Button className="mt-5 w-full" disabled>
                Zahlung folgt in Kürze
              </Button>
              <p className="mt-2 text-center text-xs text-ink-400">
                Checkout ist im MVP noch nicht aktiv.
              </p>
              <ButtonLink href="/register" variant="outline" className="mt-3 w-full">
                Kostenlos registrieren
              </ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
