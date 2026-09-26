import { ButtonLink } from "@/components/ui/Button";
import { Check } from "lucide-react";
import type { PricingPlan } from "@/lib/pricing";

export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border p-7 ${
        plan.highlighted
          ? "border-ink-950 bg-ink-950 text-white shadow-card"
          : "border-ink-100 bg-white shadow-soft"
      }`}
    >
      {plan.highlighted && (
        <span className="mb-4 inline-flex w-fit items-center rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-300">
          Beliebt
        </span>
      )}
      <p className={`font-display text-lg font-semibold ${plan.highlighted ? "text-white" : "text-ink-950"}`}>
        {plan.name}
      </p>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold">{plan.price}</span>
        <span className={plan.highlighted ? "text-ink-300" : "text-ink-400"}>
          {plan.priceNote}
        </span>
      </p>
      <p className={`mt-3 text-sm ${plan.highlighted ? "text-ink-300" : "text-ink-500"}`}>
        {plan.description}
      </p>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                plan.highlighted ? "text-brand-300" : "text-brand-600"
              }`}
            />
            <span className={plan.highlighted ? "text-ink-100" : "text-ink-700"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <ButtonLink
        href="/register"
        variant={plan.highlighted ? "secondary" : "outline"}
        className="mt-7 w-full"
      >
        {plan.cta}
      </ButtonLink>
    </div>
  );
}
