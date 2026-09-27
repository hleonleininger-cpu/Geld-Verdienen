"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Label, Input, FieldError } from "@/components/ui/Field";
import {
  updateAppointmentSettings,
  type AppointmentActionState,
} from "@/app/dashboard/appointments/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Speichern…" : "Speichern"}
    </button>
  );
}

export function AppointmentSettingsForm({
  durationMinutes,
  bufferMinutes,
}: {
  durationMinutes: number;
  bufferMinutes: number;
}) {
  const initialState: AppointmentActionState = null;
  const [state, action] = useActionState(updateAppointmentSettings, initialState);

  return (
    <form action={action} className="card-surface space-y-4 p-5">
      <div>
        <h2 className="font-display text-base font-semibold text-ink-950">Termineinstellungen</h2>
        <p className="mt-1 text-sm text-ink-500">
          Bestimmt die Slots, die Kunden nach Angebotsannahme buchen können. Die
          Öffnungszeiten legst du im Profil fest.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="appointment_duration_minutes">Termindauer (Minuten)</Label>
          <Input
            id="appointment_duration_minutes"
            name="appointment_duration_minutes"
            type="number"
            min={5}
            max={480}
            required
            defaultValue={durationMinutes}
          />
        </div>
        <div>
          <Label htmlFor="appointment_buffer_minutes" optional>
            Pufferzeit (Minuten)
          </Label>
          <Input
            id="appointment_buffer_minutes"
            name="appointment_buffer_minutes"
            type="number"
            min={0}
            max={240}
            required
            defaultValue={bufferMinutes}
          />
        </div>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
      {state?.message && <p className="text-sm text-brand-700">{state.message}</p>}
      <SaveButton />
    </form>
  );
}
