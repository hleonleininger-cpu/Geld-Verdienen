"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { createForm, type FormActionState } from "@/app/dashboard/forms/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Wird angelegt…" : "Formular anlegen"}
    </Button>
  );
}

export function CreateFormForm() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initialState: FormActionState = null;
  const [state, formAction] = useActionState(createForm, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.formId) router.push(`/dashboard/forms/${state.formId}`);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Neues Formular
      </Button>
    );
  }

  return (
    <form action={formAction} className="card-surface space-y-4 p-5">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="z. B. Terminanfrage" />
      </div>
      <div>
        <Label htmlFor="description" optional>
          Beschreibung
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Wird oberhalb des Formulars angezeigt."
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
