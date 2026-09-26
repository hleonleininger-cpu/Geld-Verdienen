"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Label, Input, Textarea, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { submitLead, type LeadFormState } from "@/app/actions/leads";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Wird gesendet…" : "Anfrage senden"}
    </Button>
  );
}

export function LeadForm({
  businessId,
  serviceExamples,
}: {
  businessId: string;
  serviceExamples: string[];
}) {
  const initialState: LeadFormState = null;
  const [state, formAction] = useFormState(submitLead, initialState);

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
      <input type="hidden" name="business_id" value={businessId} />
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
          <Input id="customer_email" name="customer_email" type="email" required autoComplete="email" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="customer_phone" optional>
            Telefonnummer
          </Label>
          <Input id="customer_phone" name="customer_phone" type="tel" autoComplete="tel" />
        </div>
        <div>
          <Label htmlFor="service">Gewünschte Leistung</Label>
          <Input
            id="service"
            name="service"
            required
            list="service-examples"
            placeholder="z. B. Innenreinigung"
          />
          <datalist id="service-examples">
            {serviceExamples.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="preferred_date" optional>
            Wunschtermin
          </Label>
          <Input id="preferred_date" name="preferred_date" type="date" />
        </div>
        <div>
          <Label htmlFor="location" optional>
            Ort
          </Label>
          <Input id="location" name="location" placeholder="z. B. München" />
        </div>
      </div>

      <div>
        <Label htmlFor="budget" optional>
          Budget
        </Label>
        <Input id="budget" name="budget" placeholder="z. B. 100-150 €" />
      </div>

      <div>
        <Label htmlFor="description" optional>
          Beschreibung
        </Label>
        <Textarea id="description" name="description" rows={4} placeholder="Erzähl uns kurz, worum es geht…" />
      </div>

      <div>
        <Label htmlFor="attachment" optional>
          Foto / Datei
        </Label>
        <Input id="attachment" name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
        <FieldHint>JPG, PNG oder PDF, max. 8 MB.</FieldHint>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
