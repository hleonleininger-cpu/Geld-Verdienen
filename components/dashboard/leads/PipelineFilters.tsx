import Link from "next/link";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PRIORITY_LABELS } from "@/lib/format";
import type { LeadPriority } from "@/types/database";

const PRIORITY_ORDER: LeadPriority[] = ["high", "medium", "low"];

export function PipelineFilters({
  search,
  priority,
  sort,
  view,
}: {
  search?: string;
  priority?: LeadPriority;
  sort: "newest" | "oldest";
  view: "board" | "list";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <form className="flex flex-wrap items-center gap-2" method="get">
        <input type="hidden" name="view" value={view} />
        <div className="w-56">
          <Input name="q" defaultValue={search} placeholder="Suche nach Name oder Leistung" />
        </div>
        <div className="w-40">
          <Select name="priority" defaultValue={priority ?? ""}>
            <option value="">Alle Prioritäten</option>
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select name="sort" defaultValue={sort}>
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </Select>
        </div>
        <Button type="submit" variant="outline" size="sm">
          Filtern
        </Button>
      </form>

      <div className="flex gap-1.5 rounded-lg border border-ink-100 bg-white p-1">
        <ViewLink view="board" active={view === "board"} search={search} priority={priority} sort={sort}>
          Board
        </ViewLink>
        <ViewLink view="list" active={view === "list"} search={search} priority={priority} sort={sort}>
          Liste
        </ViewLink>
      </div>
    </div>
  );
}

function ViewLink({
  view,
  active,
  search,
  priority,
  sort,
  children,
}: {
  view: "board" | "list";
  active: boolean;
  search?: string;
  priority?: LeadPriority;
  sort: "newest" | "oldest";
  children: React.ReactNode;
}) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (search) params.set("q", search);
  if (priority) params.set("priority", priority);
  if (sort !== "newest") params.set("sort", sort);

  return (
    <Link
      href={`/dashboard/leads?${params.toString()}`}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-ink-950 text-white" : "text-ink-600 hover:bg-ink-50"
      }`}
    >
      {children}
    </Link>
  );
}
