"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { ServiceFields } from "@/components/dashboard/services/ServiceFields";
import {
  updateService,
  deleteService,
  toggleServiceActive,
  type ServiceActionState,
} from "@/app/dashboard/services/actions";
import { formatCurrencyEUR } from "@/lib/format";
import type { ServiceRow } from "@/types/database";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Speichern…" : "Speichern"}
    </Button>
  );
}

export function ServiceCard({ service }: { service: ServiceRow }) {
  const [editing, setEditing] = useState(false);
  const initialState: ServiceActionState = null;
  const [state, formAction] = useActionState(updateService, initialState);

  if (editing) {
    return (
      <form action={formAction} className="card-surface space-y-4 p-5">
        <input type="hidden" name="service_id" value={service.id} />
        <ServiceFields defaults={service} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <SaveButton />
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="card-surface flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink-900">{service.name}</p>
          {!service.active && (
            <Badge className="bg-ink-100 text-ink-500">Inaktiv</Badge>
          )}
          {service.category && (
            <Badge className="bg-brand-50 text-brand-700">{service.category}</Badge>
          )}
        </div>
        {service.description && (
          <p className="mt-1 text-sm text-ink-500">{service.description}</p>
        )}
        <p className="mt-1.5 text-sm text-ink-400">
          {service.price !== null ? formatCurrencyEUR(service.price) : "Preis auf Anfrage"}
          {service.duration_minutes ? ` · ${service.duration_minutes} Min.` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <form action={toggleServiceActive}>
          <input type="hidden" name="service_id" value={service.id} />
          <input type="hidden" name="active" value={(!service.active).toString()} />
          <button
            type="submit"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
          >
            {service.active ? "Deaktivieren" : "Aktivieren"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Bearbeiten"
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <form action={deleteService}>
          <input type="hidden" name="service_id" value={service.id} />
          <button
            type="submit"
            aria-label="Löschen"
            className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
