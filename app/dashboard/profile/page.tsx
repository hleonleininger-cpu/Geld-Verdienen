import { Copy } from "lucide-react";
import { getCurrentBusiness, getCurrentUser } from "@/lib/data/business";
import { getReferralStats } from "@/lib/data/referrals";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { DangerZone } from "@/components/dashboard/DangerZone";
import { PublishToggle } from "@/components/dashboard/PublishToggle";
import { GalleryManager } from "@/components/dashboard/GalleryManager";
import { OpeningHoursEditor } from "@/components/dashboard/OpeningHoursEditor";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export default async function ProfilePage() {
  const [business, user] = await Promise.all([getCurrentBusiness(), getCurrentUser()]);
  if (!business || !user) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const publicUrl = `${siteUrl}/${business.slug}`;
  const referralUrl = `${siteUrl}/?ref=${business.referral_code}`;
  const referralStats = await getReferralStats(business.referral_code);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Profil</h1>
        <p className="mt-1 text-sm text-ink-500">
          Diese Angaben sieht dein Kunde auf deiner öffentlichen Anfrageseite.
        </p>
      </div>

      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Deine Anfrageseite
          </p>
          <p className="truncate text-sm font-medium text-ink-900">/{business.slug}</p>
          <p className="mt-0.5 text-xs text-ink-400">
            {business.published ? "Veröffentlicht" : "Nicht veröffentlicht – für Besucher nicht sichtbar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-ink-300"
          >
            <Copy className="h-3.5 w-3.5" />
            Ansehen
          </a>
          <PublishToggle businessId={business.id} published={business.published} />
        </div>
      </div>

      <ProfileForm business={business} />
      <p className="text-xs text-ink-400">Öffentlicher Link: {publicUrl}</p>

      <div className="card-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-950">Öffnungszeiten</h2>
        <p className="mt-1 text-sm text-ink-500">Wird auf deiner öffentlichen Seite angezeigt.</p>
        <div className="mt-4">
          <OpeningHoursEditor businessId={business.id} initialHours={business.opening_hours} />
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-950">Galerie</h2>
        <p className="mt-1 text-sm text-ink-500">
          Bis zu 8 Bilder von deiner Arbeit für deine öffentliche Seite.
        </p>
        <div className="mt-4">
          <GalleryManager businessId={business.id} images={business.gallery_urls} />
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink-950">Empfehlungen</h2>
        <p className="mt-1 text-sm text-ink-500">
          Empfiehl AnfragePilot weiter – dein persönlicher Link wird 30 Tage gemerkt.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="truncate rounded-lg bg-sand-50 px-3 py-2 text-sm text-ink-700">
            {referralUrl}
          </code>
          <CopyLinkButton url={referralUrl} label="Link kopieren" />
        </div>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <span className="font-semibold text-ink-950">{referralStats.clicks}</span>{" "}
            <span className="text-ink-500">Klicks</span>
          </div>
          <div>
            <span className="font-semibold text-ink-950">{referralStats.signups}</span>{" "}
            <span className="text-ink-500">Registrierungen</span>
          </div>
        </div>
        {referralStats.clicks === 0 && (
          <p className="mt-3 text-xs text-ink-400">
            Noch keine Klicks – teile deinen Link, um zu starten.
          </p>
        )}
      </div>

      <DangerZone
        businessId={business.id}
        businessName={business.business_name}
        accountEmail={user.email ?? ""}
      />
    </div>
  );
}
