"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Label, Input, Textarea, Select, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { INDUSTRY_LIST } from "@/lib/industries";
import { createBusiness, type BusinessActionState } from "@/app/dashboard/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Wird angelegt…" : "Unternehmen anlegen"}
    </Button>
  );
}

export function CreateBusinessForm() {
  const initialState: BusinessActionState = null;
  const [state, formAction] = useFormState(createBusiness, initialState);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-ink-950">
        Willkommen bei AnfragePilot!
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Richte in einer Minute dein Unternehmen ein, um deine persönliche
        Anfrageseite zu bekommen.
      </p>

      <form action={formAction} className="card-surface mt-7 space-y-5 p-6">
        <div>
          <Label htmlFor="business_name">Unternehmensname</Label>
          <Input id="business_name" name="business_name" required placeholder="z. B. Glanzwerk Autopflege" />
        </div>
        <div>
          <Label htmlFor="industry">Branche</Label>
          <Select id="industry" name="industry" required defaultValue="">
            <option value="" disabled>
              Branche wählen…
            </option>
            {INDUSTRY_LIST.map((industry) => (
              <option key={industry.key} value={industry.key}>
                {industry.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone" optional>
              Telefon
            </Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div>
            <Label htmlFor="email" optional>
              Kontakt-E-Mail
            </Label>
            <Input id="email" name="email" type="email" />
          </div>
        </div>
        <div>
          <Label htmlFor="description" optional>
            Kurzbeschreibung
          </Label>
          <Textarea id="description" name="description" rows={3} placeholder="Was bietest du an?" />
          <FieldHint>Wird auf deiner öffentlichen Anfrageseite angezeigt.</FieldHint>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
