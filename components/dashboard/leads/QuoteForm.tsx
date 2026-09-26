"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createQuote, type LeadActionState } from "@/app/dashboard/leads/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Wird erstellt…" : "Angebot erstellen"}
    </Button>
  );
}

export function QuoteForm({
  leadId,
  defaultTitle,
  defaultPrice,
}: {
  leadId: string;
  defaultTitle: string;
  defaultPrice: number;
}) {
  const initialState: LeadActionState = null;
  const [state, formAction] = useFormState(createQuote, initialState);

  const inFourWeeks = new Date();
  inFourWeeks.setDate(inFourWeeks.getDate() + 28);
  const defaultValidUntil = inFourWeeks.toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <div>
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required defaultValue={defaultTitle} />
      </div>
      <div>
        <Label htmlFor="description" optional>
          Beschreibung
        </Label>
        <Textarea id="description" name="description" rows={3} placeholder="Was ist im Angebot enthalten?" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="price">Preis (€)</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" required defaultValue={defaultPrice} />
        </div>
        <div>
          <Label htmlFor="valid_until" optional>
            Gültig bis
          </Label>
          <Input id="valid_until" name="valid_until" type="date" defaultValue={defaultValidUntil} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
