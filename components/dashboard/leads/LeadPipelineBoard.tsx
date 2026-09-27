"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Card";
import {
  formatDateDe,
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/format";
import { updateLeadStatus } from "@/app/dashboard/leads/actions";
import type { LeadRow, LeadStatus } from "@/types/database";

/**
 * Drag-and-drop ueber die native HTML5-DnD-API (kein zusaetzliches Paket).
 * Der Status-Wechsel wird optimistisch im Client-State uebernommen und
 * anschliessend server-seitig verifiziert (`updateLeadStatus` prueft
 * Business-Ownership erneut, nicht nur die UI) – schlaegt der Server-Call
 * fehl, wird die Karte in ihre urspruengliche Spalte zurueckversetzt.
 */
export function LeadPipelineBoard({ leads }: { leads: LeadRow[] }) {
  const [items, setItems] = useState(leads);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(status: LeadStatus) {
    const leadId = dragId;
    setDragId(null);
    if (!leadId) return;

    const lead = items.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    const previousStatus = lead.status;

    setItems((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("lead_id", leadId);
      formData.set("status", status);
      const result = await updateLeadStatus(null, formData);
      if (result?.error) {
        setError(result.error);
        setItems((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l))
        );
      }
    });
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => {
          const columnLeads = items.filter((l) => l.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(status)}
              className="w-72 shrink-0 rounded-xl bg-sand-50 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-ink-700">{STATUS_LABELS[status]}</p>
                <span className="text-xs text-ink-400">{columnLeads.length}</span>
              </div>
              <div className="space-y-2">
                {columnLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    className="block rounded-lg border border-ink-100 bg-white p-3 shadow-soft transition-colors hover:border-ink-300"
                  >
                    <p className="truncate text-sm font-medium text-ink-900">
                      {lead.customer_name}
                    </p>
                    <p className="truncate text-xs text-ink-500">{lead.service}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge className={PRIORITY_BADGE_CLASSES[lead.priority]}>
                        {PRIORITY_LABELS[lead.priority]}
                      </Badge>
                      <span className="text-[11px] text-ink-400">
                        {formatDateDe(lead.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
                {columnLeads.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-ink-300">Keine Anfragen</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
