"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { DAY_LABELS, DEFAULT_OPENING_HOURS } from "@/lib/openingHours";
import { updateOpeningHours, type BusinessActionState } from "@/app/dashboard/actions";
import type { OpeningHoursEntry } from "@/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Wird gespeichert…" : "Öffnungszeiten speichern"}
    </Button>
  );
}

export function OpeningHoursEditor({
  businessId,
  initialHours,
}: {
  businessId: string;
  initialHours: OpeningHoursEntry[];
}) {
  const [hours, setHours] = useState<OpeningHoursEntry[]>(
    initialHours.length > 0 ? initialHours : DEFAULT_OPENING_HOURS
  );
  const initialState: BusinessActionState = null;
  const [state, formAction] = useActionState(updateOpeningHours, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="opening_hours" value={JSON.stringify(hours)} />
      <div className="space-y-2">
        {hours.map((entry, i) => (
          <div key={entry.day} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-ink-700">{DAY_LABELS[entry.day]}</span>
            <label className="flex items-center gap-1.5 text-ink-500">
              <input
                type="checkbox"
                checked={!entry.closed}
                onChange={(e) =>
                  setHours((h) =>
                    h.map((d, idx) => (idx === i ? { ...d, closed: !e.target.checked } : d))
                  )
                }
              />
              geöffnet
            </label>
            {!entry.closed && (
              <>
                <input
                  type="time"
                  value={entry.open}
                  onChange={(e) =>
                    setHours((h) =>
                      h.map((d, idx) => (idx === i ? { ...d, open: e.target.value } : d))
                    )
                  }
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
                <span className="text-ink-400">–</span>
                <input
                  type="time"
                  value={entry.close}
                  onChange={(e) =>
                    setHours((h) =>
                      h.map((d, idx) => (idx === i ? { ...d, close: e.target.value } : d))
                    )
                  }
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
              </>
            )}
          </div>
        ))}
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-brand-700">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}
