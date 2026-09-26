"use client";

import { useFormState, useFormStatus } from "react-dom";
import Image from "next/image";
import { Label, Input, Textarea, Select, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { INDUSTRY_LIST } from "@/lib/industries";
import { updateBusinessProfile, type BusinessActionState } from "@/app/dashboard/actions";
import type { BusinessRow } from "@/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Speichern…" : "Änderungen speichern"}
    </Button>
  );
}

export function ProfileForm({ business }: { business: BusinessRow }) {
  const initialState: BusinessActionState = null;
  const [state, formAction] = useFormState(updateBusinessProfile, initialState);

  return (
    <form action={formAction} className="card-surface space-y-5 p-6 sm:p-8">
      <input type="hidden" name="business_id" value={business.id} />

      <div className="flex items-center gap-4">
        {business.logo_url ? (
          <Image
            src={business.logo_url}
            alt={business.business_name}
            width={56}
            height={56}
            className="h-14 w-14 rounded-xl2 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl2 bg-ink-950 font-display text-lg font-semibold text-brand-300">
            {business.business_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <Label htmlFor="logo" optional>
            Logo ändern
          </Label>
          <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        </div>
      </div>

      <div>
        <Label htmlFor="business_name">Unternehmensname</Label>
        <Input id="business_name" name="business_name" required defaultValue={business.business_name} />
      </div>

      <div>
        <Label htmlFor="industry">Branche</Label>
        <Select id="industry" name="industry" required defaultValue={business.industry}>
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
          <Input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="email" optional>
            Kontakt-E-Mail
          </Label>
          <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="description" optional>
          Beschreibung
        </Label>
        <Textarea id="description" name="description" rows={4} defaultValue={business.description ?? ""} />
        <FieldHint>Wird auf deiner öffentlichen Anfrageseite angezeigt.</FieldHint>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.message}</p>
      )}

      <SubmitButton />
    </form>
  );
}
