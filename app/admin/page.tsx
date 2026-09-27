import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, isCurrentUserAdmin } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/Card";
import { formatDateTimeDe, daysAgoIso } from "@/lib/format";
import { getIndustry } from "@/lib/industries";
import type { AnalyticsEventName } from "@/lib/analytics";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [
  { key: "7", label: "7 Tage", days: 7 },
  { key: "30", label: "30 Tage", days: 30 },
  { key: "90", label: "90 Tage", days: 90 },
  { key: "all", label: "Gesamt", days: null },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

const FUNNEL_STEPS: { event: AnalyticsEventName; label: string }[] = [
  { event: "landing_view", label: "Landingpage-Aufrufe" },
  { event: "signup", label: "Registrierungen" },
  { event: "onboarding_started", label: "Onboarding gestartet" },
  { event: "onboarding_completed", label: "Onboarding abgeschlossen" },
  { event: "business_page_published", label: "Seite veröffentlicht" },
  { event: "first_form_published", label: "Erstes Formular veröffentlicht" },
  { event: "first_lead", label: "Erste Anfrage erhalten" },
  { event: "first_quote", label: "Erstes Angebot erstellt" },
  { event: "quote_sent", label: "Angebot versendet" },
  { event: "quote_viewed", label: "Angebot angesehen" },
  { event: "quote_accepted", label: "Angebot angenommen" },
  { event: "appointment_booked", label: "Termin gebucht" },
  { event: "lead_won", label: "Kunde gewonnen" },
  { event: "trial_started", label: "Testphase gestartet" },
  { event: "checkout_started", label: "Checkout gestartet" },
  { event: "subscription_started", label: "Abo gestartet" },
];

function resolveRange(raw: string | undefined): (typeof RANGE_OPTIONS)[number] {
  return RANGE_OPTIONS.find((r) => r.key === raw) ?? RANGE_OPTIONS[1];
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  // Autorisierung laeuft vollstaendig serverseitig ueber die DB (public.users.is_admin)
  // plus ADMIN_EMAILS als Server-only-Bootstrap-Fallback – niemals ueber
  // Client-State. Siehe lib/supabase/admin.ts und docs/SECURITY.md.
  const { user, isAdmin } = await isCurrentUserAdmin();
  if (!user) redirect("/login");

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 px-5">
        <div className="card-surface max-w-sm p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-ink-950">Kein Zugriff</h1>
          <p className="mt-2 text-sm text-ink-500">
            Dieser Bereich ist internen Administrator:innen vorbehalten.
          </p>
        </div>
      </div>
    );
  }

  const { range: rangeParam } = await searchParams;
  const range = resolveRange(rangeParam);
  const since = daysAgoIso(range.days);

  let businessCount = 0;
  let leadCount = 0;
  let newBusinessCount = 0;
  let newLeadCount = 0;
  let recentBusinesses: { business_name: string; industry: string; created_at: string }[] = [];
  let industryTally: { industry: string; count: number }[] = [];
  let funnelCounts: Record<string, number> = {};
  let loadError: string | null = null;

  try {
    const admin = createAdminClient();

    let newBusinessQuery = admin.from("businesses").select("id", { count: "exact", head: true });
    let newLeadQuery = admin.from("leads").select("id", { count: "exact", head: true });
    if (since) {
      newBusinessQuery = newBusinessQuery.gte("created_at", since);
      newLeadQuery = newLeadQuery.gte("created_at", since);
    }

    const [
      { count: bCount },
      { count: lCount },
      { count: newBCount },
      { count: newLCount },
      { data: recent },
      { data: allBusinesses },
      { data: funnelData },
    ] = await Promise.all([
      admin.from("businesses").select("id", { count: "exact", head: true }),
      admin.from("leads").select("id", { count: "exact", head: true }),
      newBusinessQuery,
      newLeadQuery,
      admin
        .from("businesses")
        .select("business_name, industry, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      admin.from("businesses").select("industry"),
      admin.rpc("admin_funnel_counts", { p_since: since }),
    ]);

    businessCount = bCount ?? 0;
    leadCount = lCount ?? 0;
    newBusinessCount = newBCount ?? 0;
    newLeadCount = newLCount ?? 0;
    recentBusinesses = recent ?? [];
    funnelCounts = (funnelData as Record<string, number> | null) ?? {};

    const tally = new Map<string, number>();
    for (const row of allBusinesses ?? []) {
      tally.set(row.industry, (tally.get(row.industry) ?? 0) + 1);
    }
    industryTally = Array.from(tally.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Unbekannter Fehler.";
  }

  const funnelMax = Math.max(1, funnelCounts[FUNNEL_STEPS[0].event] ?? 0);

  return (
    <div className="min-h-screen bg-sand-50 px-5 py-10">
      <div className="container-app max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-950">Admin</h1>
            <p className="mt-1 text-sm text-ink-500">Interner Überblick über AnfragePilot.</p>
          </div>
          <div className="flex gap-1.5 rounded-lg border border-ink-100 bg-white p-1">
            {RANGE_OPTIONS.map((option) => (
              <Link
                key={option.key}
                href={`/admin?range=${option.key}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range.key === option.key
                    ? "bg-ink-950 text-white"
                    : "text-ink-600 hover:bg-ink-50"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        {loadError ? (
          <div className="mt-8 rounded-xl2 border border-dashed border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Auswertungen konnten nicht geladen werden: {loadError}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Unternehmen (gesamt)" value={businessCount} />
              <StatCard label="Leads (gesamt)" value={leadCount} />
              <StatCard label={`Neue Unternehmen (${range.label})`} value={newBusinessCount} />
              <StatCard label={`Neue Anfragen (${range.label})`} value={newLeadCount} />
            </div>

            <div className="mt-8 card-surface p-6">
              <h2 className="font-display text-lg font-semibold text-ink-950">
                Aktivierungs-Funnel ({range.label})
              </h2>
              <div className="mt-5 space-y-3">
                {FUNNEL_STEPS.map((step) => {
                  const count = funnelCounts[step.event] ?? 0;
                  const percent = Math.round((count / funnelMax) * 100);
                  return (
                    <div key={step.event}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink-700">{step.label}</span>
                        <span className="font-medium text-ink-950">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="card-surface p-6">
                <h2 className="font-display text-lg font-semibold text-ink-950">
                  Letzte Registrierungen
                </h2>
                <ul className="mt-4 space-y-3">
                  {recentBusinesses.map((b, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-ink-800">{b.business_name}</span>
                      <span className="text-ink-400">{formatDateTimeDe(b.created_at)}</span>
                    </li>
                  ))}
                  {recentBusinesses.length === 0 && (
                    <p className="text-sm text-ink-400">Noch keine Registrierungen.</p>
                  )}
                </ul>
              </div>

              <div className="card-surface p-6">
                <h2 className="font-display text-lg font-semibold text-ink-950">
                  Meistgenutzte Branchen
                </h2>
                <ul className="mt-4 space-y-3">
                  {industryTally.map((row) => (
                    <li key={row.industry} className="flex items-center justify-between text-sm">
                      <span className="text-ink-800">{getIndustry(row.industry).label}</span>
                      <span className="font-medium text-ink-950">{row.count}</span>
                    </li>
                  ))}
                  {industryTally.length === 0 && (
                    <p className="text-sm text-ink-400">Noch keine Daten.</p>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
