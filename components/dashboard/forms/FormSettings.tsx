"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { updateForm, toggleFormActive, type FormActionState } from "@/app/dashboard/forms/actions";
import type { RequestFormRow } from "@/types/database";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Speichern…" : "Speichern"}
    </Button>
  );
}

function ActiveToggleButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg border px-3.5 py-2 text-sm font-medium disabled:opacity-60 ${
        active
          ? "border-ink-200 text-ink-700 hover:border-ink-300"
          : "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
      }`}
    >
      {pending ? "Wird gespeichert…" : active ? "Deaktivieren" : "Veröffentlichen"}
    </button>
  );
}

export function FormSettings({ form }: { form: RequestFormRow }) {
  const [editing, setEditing] = useState(false);
  const initialState: FormActionState = null;
  const [renameState, renameAction] = useActionState(updateForm, initialState);
  const [toggleState, toggleAction] = useActionState(toggleFormActive, initialState);

  const [handledState, setHandledState] = useState(renameState);
  if (renameState !== handledState) {
    setHandledState(renameState);
    if (renameState?.message) setEditing(false);
  }

  return (
    <div className="card-surface p-5">
      {editing ? (
        <form action={renameAction} className="space-y-4">
          <input type="hidden" name="form_id" value={form.id} />
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={form.name} />
          </div>
          <div>
            <Label htmlFor="description" optional>
              Beschreibung
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={form.description ?? ""}
            />
          </div>
          {renameState?.error && <p className="text-sm text-red-600">{renameState.error}</p>}
          <div className="flex gap-2">
            <SaveButton />
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-ink-950">{form.name}</h1>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Formular umbenennen"
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            {form.description && <p className="mt-1 text-sm text-ink-500">{form.description}</p>}
          </div>

          <form action={toggleAction}>
            <input type="hidden" name="form_id" value={form.id} />
            <input type="hidden" name="active" value={(!form.active).toString()} />
            <ActiveToggleButton active={form.active} />
          </form>
        </div>
      )}
      {toggleState?.error && <p className="mt-2 text-sm text-red-600">{toggleState.error}</p>}
    </div>
  );
}
