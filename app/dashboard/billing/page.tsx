import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getEffectivePlanInfo } from "@/lib/entitlements";
import { getPaymentProvider } from "@/lib/billing";
import { PRICING_PLANS } from "@/lib/pricing";
import { PlanBadge } from "@/components/dashboard/PlanBadge";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { CheckoutButton } from "@/components/dashboard/billing/CheckoutButton";
import { PortalButton } from "@/components/dashboard/billing/PortalButton";
import { formatDateDe } from "@/lib/format";

export const metadata: Metadata = { title: "Abrechnung" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const { checkout } = await searchParams;
  const planInfo = getEffectivePlanInfo(business);
  const provider = getPaymentProvider();
  const paidPlans = PRICING_PLANS.filter((p) => p.key !== "free");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Abrechnung</h1>
        <p className="mt-1 text-sm text-ink-500">Dein Plan, deine Testphase und dein Abo.</p>
      </div>

      {checkout === "success" && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Danke! Dein Abo wird gerade eingerichtet – das kann einen Moment dauern.
        </div>
      )}
      {checkout === "cancelled" && (
        <div className="rounded-xl border border-ink-100 bg-sand-50 px-4 py-3 text-sm text-ink-600">
          Checkout abgebrochen. Du kannst jederzeit erneut upgraden.
        </div>
      )}

      <TrialBanner planInfo={planInfo} />

      <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Aktueller Plan
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <PlanBadge plan={planInfo.plan} isTrialing={planInfo.isTrialing} />
            {business.subscription_status === "past_due" && (
              <span className="text-sm text-amber-700">Zahlung ausstehend</span>
            )}
          </div>
          {business.trial_ends_at && planInfo.isTrialing && (
            <p className="mt-2 text-sm text-ink-500">
              Testphase endet am {formatDateDe(business.trial_ends_at)}.
            </p>
          )}
        </div>
        {business.stripe_customer_id && <PortalButton />}
      </div>

      {!provider.isConfigured() && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-sand-50 p-5 text-sm text-ink-500">
          Die Bezahlfunktion ist in dieser Umgebung noch nicht eingerichtet (keine
          Stripe-Zugangsdaten hinterlegt). Die Pläne unten sind bereits sichtbar, ein Upgrade ist
          aber erst möglich, sobald Stripe konfiguriert ist.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {paidPlans.map((plan) => {
          const isCurrent = planInfo.plan === plan.key && !planInfo.isTrialing;
          return (
            <div key={plan.key} className="card-surface flex flex-col p-5">
              <p className="font-display text-lg font-semibold text-ink-950">{plan.name}</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold text-ink-950">
                  {plan.price}
                </span>
                <span className="text-sm text-ink-400">{plan.priceNote}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-ink-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <p className="rounded-lg bg-ink-100 px-3 py-2 text-center text-sm font-medium text-ink-500">
                    Aktueller Plan
                  </p>
                ) : (
                  <CheckoutButton
                    plan={plan.key as "starter" | "pro" | "business"}
                    label={plan.cta}
                    highlighted={plan.highlighted}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
