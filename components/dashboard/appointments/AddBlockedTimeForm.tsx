"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Label, Input, FieldError } from "@/components/ui/Field";
import { addBlockedTime, type AppointmentActionState } from "@/app/dashboard/appointments/actions";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:border-ink-300 disabled:opacity-60"
    >
      {pending ? "Wird hinzugefügt…" : "Hinzufügen"}
    </button>
  );
}

export function AddBlockedTimeForm() {
  const initialState: AppointmentActionState = null;
  const [state, action] = useActionState(addBlockedTime, initialState);
  const [formKey, setFormKey] = useState(0);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.message) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={action} className="grid gap-3 sm:grid-cols-4">
      <div className="sm:col-span-1">
        <Label htmlFor="starts_at">Von</Label>
        <Input id="starts_at" name="starts_at" type="datetime-local" required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="ends_at">Bis</Label>
        <Input id="ends_at" name="ends_at" type="datetime-local" required />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="reason" optional>
          Grund
        </Label>
        <Input id="reason" name="reason" placeholder="z. B. Urlaub" />
      </div>
      <div className="flex items-end sm:col-span-1">
        <AddButton />
      </div>
      {state?.error && (
        <div className="sm:col-span-4">
          <FieldError>{state.error}</FieldError>
        </div>
      )}
    </form>
  );
}
