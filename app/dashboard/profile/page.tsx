import { Copy } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export default async function ProfilePage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${business.slug}`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Profil</h1>
        <p className="mt-1 text-sm text-ink-500">
          Diese Angaben sieht dein Kunde auf deiner öffentlichen Anfrageseite.
        </p>
      </div>

      <div className="card-surface flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Deine Anfrageseite
          </p>
          <p className="truncate text-sm font-medium text-ink-900">/{business.slug}</p>
        </div>
        <a
          href={`/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-ink-300"
        >
          <Copy className="h-3.5 w-3.5" />
          Ansehen
        </a>
      </div>

      <ProfileForm business={business} />
      <p className="text-xs text-ink-400">Öffentlicher Link: {publicUrl}</p>
    </div>
  );
}
