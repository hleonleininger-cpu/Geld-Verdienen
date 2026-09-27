import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { EffectivePlanInfo } from "@/lib/entitlements";

/**
 * Zeigt sich nur waehrend einer aktiven Testphase bzw. direkt danach
 * (abgelaufen, aber noch nicht auf einen bezahlten Plan gewechselt).
 * Verschwindet automatisch, sobald `subscription_status` auf 'active'
 * steht oder gar keine Testphase existiert.
 */
export function TrialBanner({ planInfo }: { planInfo: EffectivePlanInfo }) {
  if (planInfo.isTrialing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm text-brand-800">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            Noch <strong>{planInfo.trialDaysLeft}</strong>{" "}
            {planInfo.trialDaysLeft === 1 ? "Tag" : "Tage"} kostenlose Pro-Testphase.
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="whitespace-nowrap text-sm font-semibold text-brand-800 hover:underline"
        >
          Jetzt Plan wählen →
        </Link>
      </div>
    );
  }

  if (planInfo.trialExpired) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="text-sm text-amber-800">
          Deine Testphase ist abgelaufen. Deine Daten bleiben erhalten – einige Funktionen sind
          jetzt eingeschränkt.
        </span>
        <Link
          href="/dashboard/billing"
          className="whitespace-nowrap text-sm font-semibold text-amber-800 hover:underline"
        >
          Plan upgraden →
        </Link>
      </div>
    );
  }

  return null;
}
