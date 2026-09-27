import Link from "next/link";
import { Badge } from "@/components/ui/Card";
import {
  formatDateDe,
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "@/lib/format";
import type { LeadRow } from "@/types/database";

export function LeadPipelineList({ leads }: { leads: LeadRow[] }) {
  if (leads.length === 0) {
    return (
      <div className="card-surface p-10 text-center text-sm text-ink-500">
        Keine Anfragen gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <Link
          key={lead.id}
          href={`/dashboard/leads/${lead.id}`}
          className="flex flex-col gap-3 rounded-xl2 border border-ink-100 bg-white p-4 transition-colors hover:border-ink-300 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-950">{lead.customer_name}</p>
            <p className="truncate text-sm text-ink-500">{lead.service}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-500 sm:justify-end">
            <span className="whitespace-nowrap">{formatDateDe(lead.created_at)}</span>
            <Badge className={PRIORITY_BADGE_CLASSES[lead.priority]}>
              {PRIORITY_LABELS[lead.priority]}
            </Badge>
            <Badge className={STATUS_BADGE_CLASSES[lead.status]}>
              {STATUS_LABELS[lead.status]}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
