"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import {
  cancelSubscription,
  type CancelSubscriptionState,
} from "@/app/dashboard/billing/actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending}>
      {pending ? "Wird gekündigt…" : "Ja, jetzt kündigen"}
    </Button>
  );
}

export function CancelSubscriptionButton() {
  const [confirming, setConfirming] = useState(false);
  const initialState: CancelSubscriptionState = null;
  const [state, formAction] = useActionState(cancelSubscription, initialState);

  if (state?.message) {
    return <p className="text-sm text-ink-600">{state.message}</p>;
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-ink-400 hover:text-red-600"
      >
        Abo kündigen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-3">
      <p className="text-sm text-ink-600">
        Sicher? Du verlierst sofort den Zugriff auf bezahlte Features.
      </p>
      <div className="flex shrink-0 gap-2">
        <ConfirmButton />
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Abbrechen
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
