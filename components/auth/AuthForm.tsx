"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Einen Moment…" : children}
    </Button>
  );
}

export function AuthForm({
  action,
  submitLabel,
  children,
  hiddenFields,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  submitLabel: string;
  children: React.ReactNode;
  hiddenFields?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {children}
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {state.message}
        </p>
      )}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
