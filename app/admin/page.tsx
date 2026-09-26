import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/business";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/Card";
import { formatDateTimeDe } from "@/lib/format";
import { getIndustry } from "@/lib/industries";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isAdminEmail(user.email)) {
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

  let businessCount = 0;
  let leadCount = 0;
  let recentBusinesses: { business_name: string; industry: string; created_at: string }[] = [];
  let industryTally: { industry: string; count: number }[] = [];
  let loadError: string | null = null;

  try {
    const admin = createAdminClient();

    const [{ count: bCount }, { count: lCount }, { data: recent }, { data: allBusinesses }] =
      await Promise.all([
        admin.from("businesses").select("id", { count: "exact", head: true }),
        admin.from("leads").select("id", { count: "exact", head: true }),
        admin
          .from("businesses")
          .select("business_name, industry, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        admin.from("businesses").select("industry"),
      ]);

    businessCount = bCount ?? 0;
    leadCount = lCount ?? 0;
    recentBusinesses = recent ?? [];

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

  return (
    <div className="min-h-screen bg-sand-50 px-5 py-10">
      <div className="container-app max-w-4xl">
        <h1 className="font-display text-2xl font-semibold text-ink-950">Admin</h1>
        <p className="mt-1 text-sm text-ink-500">Interner Überblick über AnfragePilot.</p>

        {loadError ? (
          <div className="mt-8 rounded-xl2 border border-dashed border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Auswertungen konnten nicht geladen werden: {loadError}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <StatCard label="Unternehmen" value={businessCount} />
              <StatCard label="Leads insgesamt" value={leadCount} />
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
