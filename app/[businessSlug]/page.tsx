import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getIndustry } from "@/lib/industries";
import { getServicesForBusiness } from "@/lib/data/services";
import { formatCurrencyEUR } from "@/lib/format";
import { DAY_LABELS, DAY_ORDER } from "@/lib/openingHours";
import { LeadForm } from "@/components/public/LeadForm";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";
import Link from "next/link";
import type { OpeningHoursEntry } from "@/types/database";

export const dynamic = "force-dynamic";

const FAQ_ITEMS = [
  {
    q: "Ist eine Anfrage kostenlos und unverbindlich?",
    a: "Ja. Das Absenden einer Anfrage kostet nichts und verpflichtet dich zu nichts – du bekommst zunächst nur eine Rückmeldung.",
  },
  {
    q: "Wie schnell bekomme ich eine Antwort?",
    a: "Das hängt vom Unternehmen ab, meist erfolgt eine Rückmeldung innerhalb weniger Stunden bis Tage.",
  },
  {
    q: "Was passiert nach meiner Anfrage?",
    a: "Das Unternehmen meldet sich direkt bei dir und kann dir bei Bedarf ein individuelles Angebot zusenden.",
  },
];

async function getBusiness(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const business = await getBusiness(businessSlug);
  if (!business || !business.published) {
    return { title: "Nicht gefunden", robots: { index: false, follow: false } };
  }

  const title = business.tagline
    ? `${business.business_name} – ${business.tagline}`
    : `Anfrage an ${business.business_name}`;
  const description =
    business.description ?? `Stelle ${business.business_name} unverbindlich eine Anfrage.`;

  return {
    title,
    description,
    alternates: { canonical: `/${business.slug}` },
    openGraph: {
      title,
      description,
      url: `/${business.slug}`,
      type: "website",
      ...(business.logo_url ? { images: [{ url: business.logo_url }] } : {}),
    },
  };
}

function hasCustomHours(hours: OpeningHoursEntry[]): boolean {
  return hours.length > 0;
}

export default async function BusinessLeadPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getBusiness(businessSlug);
  if (!business) notFound();

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isOwnerPreview = userData.user?.id === business.owner_id;
  if (!business.published && !isOwnerPreview) notFound();

  const industry = getIndustry(business.industry);
  const services = await getServicesForBusiness(business.id, { activeOnly: true });

  const accentColor = business.accent_color;
  const orderedHours = DAY_ORDER.map((day) =>
    business.opening_hours.find((h) => h.day === day)
  ).filter((h): h is OpeningHoursEntry => Boolean(h));

  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      {!business.published && isOwnerPreview && (
        <div className="bg-amber-500 py-2 text-center text-sm font-medium text-white">
          Vorschau – diese Seite ist noch nicht veröffentlicht und für Besucher nicht sichtbar.
        </div>
      )}

      <header className="container-app flex h-16 items-center justify-between">
        <Link href="/" aria-label="AnfragePilot Startseite">
          <Logo />
        </Link>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-500 shadow-soft">
          Powered by AnfragePilot
        </span>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container-app py-8 sm:py-12">
          <div className="mx-auto max-w-xl text-center">
            {business.logo_url ? (
              <Image
                src={business.logo_url}
                alt={business.business_name}
                width={64}
                height={64}
                className="mx-auto h-16 w-16 rounded-xl2 object-cover shadow-soft"
              />
            ) : (
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl2 bg-ink-950 font-display text-xl font-semibold text-brand-300 shadow-soft"
                style={accentColor ? { backgroundColor: accentColor } : undefined}
              >
                {business.business_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
              {business.business_name}
            </h1>
            <p
              className="mt-1 text-sm font-medium"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {business.tagline || industry.label}
            </p>
            {business.description && (
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
                {business.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-ink-400">
              {business.phone && <span>{business.phone}</span>}
              {business.email && <span>{business.email}</span>}
            </div>
            <div className="mt-6">
              <ButtonLink
                href="#anfrage"
                size="lg"
                style={accentColor ? { backgroundColor: accentColor } : undefined}
              >
                Jetzt unverbindlich anfragen
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Leistungen */}
        {services.length > 0 && (
          <section className="border-t border-ink-100 bg-white py-10 sm:py-14">
            <div className="container-app">
              <h2 className="text-center font-display text-xl font-semibold text-ink-950">
                Leistungen
              </h2>
              <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <div key={service.id} className="rounded-xl border border-ink-100 p-4">
                    <p className="font-medium text-ink-900">{service.name}</p>
                    {service.description && (
                      <p className="mt-1 text-sm text-ink-500">{service.description}</p>
                    )}
                    {(service.price !== null || service.duration_minutes !== null) && (
                      <p className="mt-2 text-sm font-medium text-ink-700">
                        {service.price !== null && formatCurrencyEUR(service.price)}
                        {service.price !== null && service.duration_minutes !== null && " · "}
                        {service.duration_minutes !== null && `${service.duration_minutes} Min.`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Galerie */}
        {business.gallery_urls.length > 0 && (
          <section className="border-t border-ink-100 py-10 sm:py-14">
            <div className="container-app">
              <h2 className="text-center font-display text-xl font-semibold text-ink-950">
                Impressionen
              </h2>
              <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
                {business.gallery_urls.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-xl border border-ink-100 bg-white"
                  >
                    <Image src={url} alt="" fill sizes="300px" className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Öffnungszeiten */}
        {hasCustomHours(orderedHours) && (
          <section className="border-t border-ink-100 bg-white py-10 sm:py-14">
            <div className="container-app">
              <h2 className="text-center font-display text-xl font-semibold text-ink-950">
                Öffnungszeiten
              </h2>
              <div className="mx-auto mt-6 max-w-sm space-y-1.5 text-sm">
                {orderedHours.map((entry) => (
                  <div key={entry.day} className="flex justify-between">
                    <span className="text-ink-600">{DAY_LABELS[entry.day]}</span>
                    <span className="font-medium text-ink-900">
                      {entry.closed ? "Geschlossen" : `${entry.open} – ${entry.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="border-t border-ink-100 py-10 sm:py-14">
          <div className="container-app">
            <h2 className="text-center font-display text-xl font-semibold text-ink-950">
              Häufige Fragen
            </h2>
            <div className="mx-auto mt-6 max-w-xl space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q}>
                  <p className="font-medium text-ink-900">{item.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Anfrageformular */}
        <section id="anfrage" className="scroll-mt-6 border-t border-ink-100 bg-white py-10 sm:py-14">
          <div className="container-app">
            <div className="mx-auto max-w-xl">
              <h2 className="text-center font-display text-xl font-semibold text-ink-950">
                Jetzt Anfrage stellen
              </h2>
              <p className="mt-1 text-center text-sm text-ink-500">
                {business.business_name} meldet sich direkt bei dir zurück.
              </p>
              <div className="mt-6">
                <LeadForm businessId={business.id} serviceExamples={industry.exampleServices} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
