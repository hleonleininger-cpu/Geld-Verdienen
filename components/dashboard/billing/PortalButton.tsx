"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { openBillingPortal, type BillingActionState } from "@/app/dashboard/billing/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Wird geöffnet…" : "Abo verwalten"}
    </Button>
  );
}

export function PortalButton() {
  const initialState: BillingActionState = null;
  const [state, formAction] = useActionState(openBillingPortal, initialState);

  return (
    <form action={formAction}>
      <SubmitButton />
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
