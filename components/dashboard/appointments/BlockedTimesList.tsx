"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { formatDateTimeDe } from "@/lib/format";
import { removeBlockedTime } from "@/app/dashboard/appointments/actions";
import type { BlockedTimeRow } from "@/types/database";

function BlockedTimeRow({ blockedTime }: { blockedTime: BlockedTimeRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-100 px-4 py-2.5">
      <div>
        <p className="text-sm font-medium text-ink-900">
          {formatDateTimeDe(blockedTime.starts_at)} – {formatDateTimeDe(blockedTime.ends_at)}
        </p>
        {blockedTime.reason && <p className="text-xs text-ink-400">{blockedTime.reason}</p>}
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => removeBlockedTime(blockedTime.id))}
        aria-label="Blockierte Zeit entfernen"
        className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-red-600 disabled:opacity-60"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function BlockedTimesList({ blockedTimes }: { blockedTimes: BlockedTimeRow[] }) {
  if (blockedTimes.length === 0) {
    return <p className="text-sm text-ink-400">Keine blockierten Zeiten.</p>;
  }
  return (
    <div className="space-y-2">
      {blockedTimes.map((bt) => (
        <BlockedTimeRow key={bt.id} blockedTime={bt} />
      ))}
    </div>
  );
}
