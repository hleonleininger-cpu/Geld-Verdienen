"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Field";
import { canTransitionAppointmentStatus } from "@/lib/stateMachine";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/format";
import {
  updateAppointmentStatus,
  type AppointmentActionState,
} from "@/app/dashboard/appointments/actions";
import type { AppointmentStatus } from "@/types/database";

const ALL_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

function StatusSelect({ status }: { status: AppointmentStatus }) {
  const { pending } = useFormStatus();
  const options = ALL_STATUSES.filter(
    (candidate) => candidate === status || canTransitionAppointmentStatus(status, candidate)
  );

  return (
    <Select
      name="status"
      defaultValue={status}
      disabled={pending || options.length <= 1}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="w-auto"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {APPOINTMENT_STATUS_LABELS[option]}
        </option>
      ))}
    </Select>
  );
}

export function AppointmentStatusForm({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: AppointmentStatus;
}) {
  const initialState: AppointmentActionState = null;
  const [state, action] = useActionState(updateAppointmentStatus, initialState);

  return (
    <div className="text-right">
      <form action={action}>
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <StatusSelect status={status} />
      </form>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
