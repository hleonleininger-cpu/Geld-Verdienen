"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { startCheckout, type BillingActionState } from "@/app/dashboard/billing/actions";

function SubmitButton({ label, highlighted }: { label: string; highlighted?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={highlighted ? "secondary" : "outline"} disabled={pending} className="w-full">
      {pending ? "Wird geöffnet…" : label}
    </Button>
  );
}

export function CheckoutButton({
  plan,
  label,
  highlighted,
}: {
  plan: "starter" | "pro" | "business";
  label: string;
  highlighted?: boolean;
}) {
  const initialState: BillingActionState = null;
  const [state, formAction] = useActionState(startCheckout, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <SubmitButton label={label} highlighted={highlighted} />
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
