"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Field";
import { updateLeadPriority, type LeadActionState } from "@/app/dashboard/leads/actions";
import type { LeadPriority } from "@/types/database";

function PrioritySelect({ defaultValue }: { defaultValue: LeadPriority }) {
  const { pending } = useFormStatus();
  return (
    <Select name="priority" defaultValue={defaultValue} disabled={pending} onChange={(e) => e.target.form?.requestSubmit()}>
      <option value="low">Niedrige Priorität</option>
      <option value="medium">Mittlere Priorität</option>
      <option value="high">Hohe Priorität</option>
    </Select>
  );
}

export function PriorityPicker({ leadId, priority }: { leadId: string; priority: LeadPriority }) {
  const initialState: LeadActionState = null;
  const [state, formAction] = useActionState(updateLeadPriority, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="w-44">
        <PrioritySelect defaultValue={priority} />
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
