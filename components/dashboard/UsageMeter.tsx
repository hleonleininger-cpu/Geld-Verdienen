import Link from "next/link";
import type { LeadQuota } from "@/lib/entitlements";

/**
 * Zeigt sich nur, wenn der Plan ein echtes Limit hat (`limit !== null`) –
 * bezahlte Plaene mit unbegrenzten Leads brauchen keinen Meter.
 */
export function UsageMeter({ quota }: { quota: LeadQuota }) {
  if (quota.limit === null) return null;

  const percent = Math.min(100, Math.round((quota.used / quota.limit) * 100));
  const isNearLimit = percent >= 80;

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-ink-900">Anfragen diesen Monat</p>
        <p className="text-ink-500">
          {quota.used} / {quota.limit}
        </p>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all ${isNearLimit ? "bg-amber-500" : "bg-brand-600"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!quota.allowed && (
        <p className="mt-3 text-sm text-amber-700">
          Monatslimit erreicht. Neue Anfragen über deine öffentliche Seite werden aktuell
          abgelehnt.{" "}
          <Link href="/dashboard/billing" className="font-semibold hover:underline">
            Jetzt upgraden
          </Link>{" "}
          für unbegrenzte Anfragen.
        </p>
      )}
    </div>
  );
}
