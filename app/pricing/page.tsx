import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";
import { PricingCard } from "@/components/marketing/PricingCard";
import { PRICING_PLANS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Preise",
  description: "Faire Preise für kleine lokale Dienstleistungsunternehmen.",
};

export default function PricingPage() {
  return (
    <>
      <MarketingNavbar />
      <main className="section-pad">
        <div className="container-app">
          <div className="mx-auto max-w-xl text-center">
            <p className="eyebrow">Preise</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950">
              Fair für kleine Betriebe.
            </h1>
            <p className="mt-3 text-ink-600">
              Starte kostenlos. Upgrade, sobald sich AnfragePilot für dich lohnt.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <PricingCard key={plan.key} plan={plan} />
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-xl2 border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
            Die Bezahlfunktion ist aktuell als Vorschau zu sehen. Eine echte
            Zahlungsintegration (z. B. via Stripe) ist für eine spätere Version
            geplant und noch nicht aktiv.
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
