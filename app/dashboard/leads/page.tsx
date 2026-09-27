import type { Metadata } from "next";
import { Kanban } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getLeadsForPipeline } from "@/lib/data/leads";
import { LeadPipelineBoard } from "@/components/dashboard/leads/LeadPipelineBoard";
import { LeadPipelineList } from "@/components/dashboard/leads/LeadPipelineList";
import { PipelineFilters } from "@/components/dashboard/leads/PipelineFilters";
import { ButtonLink } from "@/components/ui/Button";
import type { LeadPriority } from "@/types/database";

export const metadata: Metadata = { title: "Anfragen" };

const VALID_PRIORITIES: LeadPriority[] = ["low", "medium", "high"];

export default async function LeadsPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; priority?: string; sort?: string; view?: string }>;
}) {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const { q, priority, sort, view } = await searchParams;
  const validPriority = VALID_PRIORITIES.includes(priority as LeadPriority)
    ? (priority as LeadPriority)
    : undefined;
  const validSort = sort === "oldest" ? "oldest" : "newest";
  const activeView = view === "list" ? "list" : "board";

  const leads = await getLeadsForPipeline(business.id, {
    search: q,
    priority: validPriority,
    sort: validSort,
  });
  const hasNoFilters = !q && !validPriority;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Anfragen</h1>
        <p className="mt-1 text-sm text-ink-500">
          Ziehe Karten zwischen den Spalten, um den Status zu ändern, oder wechsle in die
          Listenansicht.
        </p>
      </div>

      {leads.length === 0 && hasNoFilters ? (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <Kanban className="h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">
            Noch keine Anfragen. Teile deinen Anfrage-Link, um erste Kunden zu gewinnen.
          </p>
          <ButtonLink href={`/${business.slug}`} target="_blank">
            Anfrageseite ansehen
          </ButtonLink>
        </div>
      ) : (
        <>
          <PipelineFilters search={q} priority={validPriority} sort={validSort} view={activeView} />

          {activeView === "board" ? (
            <LeadPipelineBoard
              key={`${q ?? ""}-${validPriority ?? ""}-${validSort}`}
              leads={leads}
            />
          ) : (
            <LeadPipelineList leads={leads} />
          )}
        </>
      )}
    </div>
  );
}
