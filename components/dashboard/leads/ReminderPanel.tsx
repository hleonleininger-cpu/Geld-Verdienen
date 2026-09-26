"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Bell, X } from "lucide-react";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { setReminder, clearReminder, type LeadActionState } from "@/app/dashboard/leads/actions";
import { formatDateTimeDe } from "@/lib/format";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Speichern…" : "Erinnerung speichern"}
    </Button>
  );
}

export function ReminderPanel({
  leadId,
  reminderAt,
}: {
  leadId: string;
  reminderAt: string | null;
}) {
  const initialState: LeadActionState = null;
  const [state, formAction] = useActionState(setReminder, initialState);

  return (
    <div id="erinnerung" className="card-surface p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-brand-600" />
        <h2 className="font-display text-lg font-semibold text-ink-950">Erinnerung</h2>
      </div>

      {reminderAt && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
          <span>Erinnerung am {formatDateTimeDe(reminderAt)}</span>
          <form action={clearReminder.bind(null, leadId)}>
            <button type="submit" aria-label="Erinnerung entfernen" className="text-brand-600 hover:text-brand-800">
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="lead_id" value={leadId} />
        <div>
          <Label htmlFor="reminder_at">Später erinnern am</Label>
          <Input id="reminder_at" name="reminder_at" type="datetime-local" required />
        </div>
        <SubmitButton />
      </form>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
