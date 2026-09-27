import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Generischer Upsell-Hinweis fuer ein gesperrtes Feature (siehe
 * `FeatureGate`). Bewusst textlich generisch gehalten, damit ein Feature
 * ohne UI-Anpassung hinter das Gate gesetzt werden kann.
 */
export function UpgradeBanner({
  title = "Dieses Feature ist Teil eines höheren Plans",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-ink-200 bg-sand-50 p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        <Lock className="h-4 w-4" />
      </span>
      <div>
        <p className="font-medium text-ink-900">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        <Link
          href="/dashboard/billing"
          className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Plan upgraden →
        </Link>
      </div>
    </div>
  );
}
