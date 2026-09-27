"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  createFormFromTemplate,
  type FormActionState,
} from "@/app/dashboard/forms/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      <Sparkles className="h-4 w-4" />
      {pending ? "Wird angelegt…" : "Aus Branchen-Vorlage erstellen"}
    </Button>
  );
}

export function CreateFormFromTemplateButton() {
  const router = useRouter();
  const initialState: FormActionState = null;
  const [state, formAction] = useActionState(createFormFromTemplate, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.formId) router.push(`/dashboard/forms/${state.formId}`);
  }

  return (
    <form action={formAction}>
      {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
