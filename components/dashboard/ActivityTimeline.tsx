import { ArrowRightLeft, Check, Eye, FileText, Send, UserPlus, X } from "lucide-react";
import { formatDateTimeDe, STATUS_LABELS } from "@/lib/format";
import type { ActivityActor, ActivityEventRow, LeadStatus } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  lead_created: "Anfrage eingegangen",
  status_changed: "Status geändert",
  quote_created: "Angebot als Entwurf erstellt",
  quote_sent: "Angebot versendet",
  quote_viewed: "Angebot vom Kunden angesehen",
  quote_accepted: "Angebot angenommen",
  quote_declined: "Angebot abgelehnt",
};

const TYPE_ICONS: Record<string, typeof UserPlus> = {
  lead_created: UserPlus,
  status_changed: ArrowRightLeft,
  quote_created: FileText,
  quote_sent: Send,
  quote_viewed: Eye,
  quote_accepted: Check,
  quote_declined: X,
};

const ACTOR_LABELS: Record<ActivityActor, string> = {
  system: "System",
  owner: "Du",
  customer: "Kunde",
};

function describeEvent(event: ActivityEventRow): string {
  const label = TYPE_LABELS[event.type] ?? event.type;
  if (event.type === "status_changed") {
    const status = event.payload.status;
    if (typeof status === "string" && status in STATUS_LABELS) {
      return `${label}: ${STATUS_LABELS[status as LeadStatus]}`;
    }
  }
  return label;
}

/**
 * Reusable Timeline-Komponente (Phase 8): zeigt `activity_events` fuer
 * einen Lead in chronologischer Reihenfolge. Bewusst generisch gehalten
 * (unbekannte `type`-Werte fallen auf den Rohwert zurueck), damit neue
 * Event-Typen keine Anpassung dieser Komponente erfordern.
 */
export function ActivityTimeline({ events }: { events: ActivityEventRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-ink-400">Noch keine Aktivität.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const Icon = TYPE_ICONS[event.type] ?? ArrowRightLeft;
        return (
          <li key={event.id} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-500">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm text-ink-800">{describeEvent(event)}</p>
              <p className="text-xs text-ink-400">
                {formatDateTimeDe(event.created_at)} · {ACTOR_LABELS[event.actor]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
