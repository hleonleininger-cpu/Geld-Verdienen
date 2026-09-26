import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { LeadListItem } from "@/components/dashboard/LeadListItem";
import { getCurrentBusiness } from "@/lib/data/business";
import { getLeadsPage, getDashboardStats, getUpcomingReminders } from "@/lib/data/leads";
import { formatCurrencyEUR, formatDateTimeDe, STATUS_LABELS, STATUS_ORDER } from "@/lib/format";
import type { LeadStatus } from "@/types/database";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const { status, page: pageParam } = await searchParams;
  const activeStatus = status as LeadStatus | undefined;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [stats, leadsPage, reminders] = await Promise.all([
    getDashboardStats(business.id),
    getLeadsPage(business.id, { status: activeStatus, page }),
    getUpcomingReminders(business.id, 5),
  ]);

  const totalPages = Math.max(1, Math.ceil(leadsPage.total / leadsPage.pageSize));
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (activeStatus) params.set("status", activeStatus);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Übersicht</h1>
        <p className="mt-1 text-sm text-ink-500">
          Willkommen zurück, {business.business_name}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Neue Anfragen" value={stats.newCount} />
        <StatCard label="Offene Anfragen" value={stats.openCount} />
        <StatCard label="Antworten ausstehend" value={stats.pendingReplyCount} />
        <StatCard label="Geschätzter Anfragewert" value={formatCurrencyEUR(stats.estimatedValue)} />
      </div>

      {reminders.length > 0 && (
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-600" />
            <p className="font-medium text-ink-900">Erinnerungen</p>
          </div>
          <ul className="space-y-2">
            {reminders.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50"
                >
                  <span className="text-ink-800">{lead.customer_name} · {lead.service}</span>
                  <span className="text-ink-400">{formatDateTimeDe(lead.reminder_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterPill href="/dashboard" active={!activeStatus}>
            Alle ({stats.totalCount})
          </FilterPill>
          {STATUS_ORDER.map((s) => (
            <FilterPill key={s} href={`/dashboard?status=${s}`} active={activeStatus === s}>
              {STATUS_LABELS[s]} ({stats.statusCounts[s]})
            </FilterPill>
          ))}
        </div>

        {leadsPage.leads.length === 0 ? (
          <div className="card-surface p-10 text-center text-sm text-ink-500">
            {stats.totalCount === 0
              ? "Noch keine Anfragen. Teile deinen Anfrage-Link, um erste Kunden zu gewinnen."
              : "Keine Anfragen mit diesem Status."}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {leadsPage.leads.map((lead) => (
                <LeadListItem key={lead.id} lead={lead} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between text-sm">
                <Link
                  href={pageHref(page - 1)}
                  aria-disabled={page <= 1}
                  className={`flex items-center gap-1 rounded-lg border border-ink-100 px-3 py-1.5 font-medium ${
                    page <= 1
                      ? "pointer-events-none text-ink-300"
                      : "text-ink-700 hover:border-ink-300"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </Link>
                <span className="text-ink-400">
                  Seite {page} von {totalPages}
                </span>
                <Link
                  href={pageHref(page + 1)}
                  aria-disabled={page >= totalPages}
                  className={`flex items-center gap-1 rounded-lg border border-ink-100 px-3 py-1.5 font-medium ${
                    page >= totalPages
                      ? "pointer-events-none text-ink-300"
                      : "text-ink-700 hover:border-ink-300"
                  }`}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-ink-950 text-white" : "bg-white text-ink-600 border border-ink-100 hover:border-ink-300"
      }`}
    >
      {children}
    </Link>
  );
}
