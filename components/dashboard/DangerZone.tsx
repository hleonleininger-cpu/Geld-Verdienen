"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Download } from "lucide-react";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  deleteBusinessData,
  deleteAccount,
  type DangerActionState,
} from "@/app/dashboard/danger-actions";

function DangerSubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Wird gelöscht…" : children}
    </Button>
  );
}

export function DangerZone({
  businessId,
  businessName,
  accountEmail,
}: {
  businessId: string;
  businessName: string;
  accountEmail: string;
}) {
  const initialState: DangerActionState = null;
  const [businessState, businessFormAction] = useActionState(deleteBusinessData, initialState);
  const [accountState, accountFormAction] = useActionState(deleteAccount, initialState);

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink-950">Deine Daten</h2>
        <p className="mt-1 text-sm text-ink-500">
          Lade eine Kopie all deiner Daten (Unternehmen, Anfragen, Angebote) als JSON-Datei herunter.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Route Handler mit Datei-Download (Content-Disposition), kein App-Router-Page-Ziel */}
        <a
          href="/dashboard/export"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:border-ink-300"
        >
          <Download className="h-4 w-4" />
          Daten exportieren
        </a>
      </div>

      <div className="rounded-xl2 border border-red-200 bg-red-50/50 p-6">
        <h2 className="font-display text-lg font-semibold text-red-900">Gefahrenzone</h2>

        <div className="mt-4 border-t border-red-200 pt-4">
          <p className="text-sm font-medium text-ink-900">Unternehmensdaten löschen</p>
          <p className="mt-1 text-sm text-ink-600">
            Löscht dein Unternehmen inklusive aller Anfragen und Angebote unwiderruflich. Dein
            Login-Konto bleibt bestehen.
          </p>
          <form action={businessFormAction} className="mt-3 space-y-3">
            <input type="hidden" name="business_id" value={businessId} />
            <input type="hidden" name="expected_name" value={businessName} />
            <div>
              <Label htmlFor="confirmation_business">
                Gib zur Bestätigung „{businessName}“ ein
              </Label>
              <Input id="confirmation_business" name="confirmation" required />
            </div>
            {businessState?.error && (
              <p className="text-sm text-red-700">{businessState.error}</p>
            )}
            <DangerSubmitButton>Unternehmensdaten endgültig löschen</DangerSubmitButton>
          </form>
        </div>

        <div className="mt-6 border-t border-red-200 pt-4">
          <p className="text-sm font-medium text-ink-900">Konto vollständig löschen</p>
          <p className="mt-1 text-sm text-ink-600">
            Löscht dein Unternehmen, alle Anfragen/Angebote UND dein Login-Konto unwiderruflich.
          </p>
          <form action={accountFormAction} className="mt-3 space-y-3">
            <div>
              <Label htmlFor="confirmation_account">
                Gib zur Bestätigung deine E-Mail „{accountEmail}“ ein
              </Label>
              <Input id="confirmation_account" name="confirmation" type="email" required />
            </div>
            {accountState?.error && <p className="text-sm text-red-700">{accountState.error}</p>}
            <DangerSubmitButton>Konto endgültig löschen</DangerSubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
