"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Globe, EyeOff } from "lucide-react";
import { togglePublished, type BusinessActionState } from "@/app/dashboard/actions";

function SubmitButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
        published
          ? "border-ink-200 text-ink-700 hover:border-ink-300"
          : "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
      }`}
    >
      {published ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
      {pending ? "Wird gespeichert…" : published ? "Seite offline nehmen" : "Seite veröffentlichen"}
    </button>
  );
}

export function PublishToggle({ businessId, published }: { businessId: string; published: boolean }) {
  const initialState: BusinessActionState = null;
  const [state, formAction] = useActionState(togglePublished, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5 sm:items-end">
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="published" value={(!published).toString()} />
      <SubmitButton published={published} />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
