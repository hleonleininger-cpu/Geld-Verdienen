import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";
import { SHOP_PRODUCTS } from "@/lib/shop";
import { getIndustry } from "@/lib/industries";
import { formatCurrencyEUR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Shop",
  description: "Branchen-Starter-Pakete für AnfragePilot.",
};

export default function ShopPage() {
  return (
    <>
      <MarketingNavbar />
      <main className="section-pad">
        <div className="container-app">
          <div className="max-w-xl">
            <p className="eyebrow">Shop</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950">
              Branchen-Starter-Pakete
            </h1>
            <p className="mt-3 text-ink-600">
              Vorkonfigurierte Pakete mit passenden Vorlagen für deine Branche –
              perfekt für den schnellen Start.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SHOP_PRODUCTS.map((product) => {
              const industry = getIndustry(product.industry);
              return (
                <Link
                  key={product.slug}
                  href={`/shop/${product.slug}`}
                  className="group flex flex-col rounded-xl2 border border-ink-100 bg-white p-6 transition-colors hover:border-ink-300"
                >
                  <span className="eyebrow">{industry.label}</span>
                  <p className="mt-2 font-display text-lg font-semibold text-ink-950">
                    {product.name}
                  </p>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500">
                    {product.tagline}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-display text-xl font-semibold text-ink-950">
                      {formatCurrencyEUR(product.price)}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-brand-700">
                      Details
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
