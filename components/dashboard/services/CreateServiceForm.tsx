"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ServiceFields } from "@/components/dashboard/services/ServiceFields";
import { createService, type ServiceActionState } from "@/app/dashboard/services/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Wird angelegt…" : "Leistung anlegen"}
    </Button>
  );
}

export function CreateServiceForm() {
  const [open, setOpen] = useState(false);
  const initialState: ServiceActionState = null;
  const [state, formAction] = useActionState(createService, initialState);

  // "Adjusting state during rendering" statt Effect (siehe React-Doku):
  // schliesst das Formular, sobald eine neue Erfolgsmeldung eintrifft,
  // ohne einen zusaetzlichen Render-Zyklus durch einen Effect zu erzeugen.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.message) setOpen(false);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Leistung hinzufügen
      </Button>
    );
  }

  return (
    <form action={formAction} className="card-surface space-y-4 p-5">
      <ServiceFields />
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
