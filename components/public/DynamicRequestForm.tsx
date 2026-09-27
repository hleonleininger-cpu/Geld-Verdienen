"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { DynamicFieldRenderer } from "@/components/forms/DynamicFieldRenderer";
import { submitDynamicForm, type DynamicFormState } from "@/app/request/[businessSlug]/[formSlug]/actions";
import type { RequestFormFieldRow } from "@/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Wird gesendet…" : "Anfrage senden"}
    </Button>
  );
}

export function DynamicRequestForm({
  businessSlug,
  formSlug,
  fields,
}: {
  businessSlug: string;
  formSlug: string;
  fields: RequestFormFieldRow[];
}) {
  const initialState: DynamicFormState = null;
  const [state, formAction] = useActionState(
    submitDynamicForm.bind(null, businessSlug, formSlug),
    initialState
  );

  if (state?.success) {
    return (
      <div className="card-surface flex flex-col items-center px-6 py-14 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-600" strokeWidth={1.5} />
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-950">
          Danke! Deine Anfrage wurde erfolgreich gesendet.
        </h2>
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          Der Betrieb meldet sich in Kürze bei dir zurück.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card-surface space-y-5 p-6 sm:p-8">
      {/* Honeypot – fuer Menschen unsichtbar, Bots fuellen es oft aus. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="customer_name">Name</Label>
          <Input id="customer_name" name="customer_name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="customer_email">E-Mail</Label>
          <Input
            id="customer_email"
            name="customer_email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
      </div>

      {fields.map((field) => (
        <DynamicFieldRenderer key={field.id} field={field} />
      ))}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
