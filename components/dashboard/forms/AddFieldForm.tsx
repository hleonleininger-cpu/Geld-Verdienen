"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea, Select, FieldHint } from "@/components/ui/Field";
import { FIELD_TYPE_LABELS } from "@/lib/format";
import { REQUEST_FIELD_TYPES } from "@/lib/validation";
import { addField, type FormActionState } from "@/app/dashboard/forms/actions";
import type { RequestFieldType } from "@/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Wird hinzugefügt…" : "Feld hinzufügen"}
    </Button>
  );
}

const OPTIONS_TYPES: RequestFieldType[] = ["select", "multiselect"];

export function AddFieldForm({ formId }: { formId: string }) {
  const [open, setOpen] = useState(false);
  const [fieldType, setFieldType] = useState<RequestFieldType>("text");
  const [optionsText, setOptionsText] = useState("");
  const initialState: FormActionState = null;
  const [state, formAction] = useActionState(addField, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.message) {
      setOpen(false);
      setFieldType("text");
      setOptionsText("");
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Feld hinzufügen
      </Button>
    );
  }

  const options = optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <form action={formAction} className="card-surface space-y-4 p-5">
      <input type="hidden" name="form_id" value={formId} />
      <input type="hidden" name="options" value={JSON.stringify(options)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="field_type">Feldtyp</Label>
          <Select
            id="field_type"
            name="field_type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as RequestFieldType)}
          >
            {REQUEST_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" required placeholder="z. B. Gewünschter Service" />
        </div>
      </div>

      <div>
        <Label htmlFor="description" optional>
          Beschreibung / Hilfetext
        </Label>
        <Input id="description" name="description" placeholder="Wird unter dem Label angezeigt." />
      </div>

      {OPTIONS_TYPES.includes(fieldType) && (
        <div>
          <Label htmlFor="options_text">Optionen</Label>
          <Textarea
            id="options_text"
            rows={4}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={"Eine Option pro Zeile, z. B.:\nKlein\nMittel\nGroß"}
          />
          <FieldHint>Eine Option pro Zeile.</FieldHint>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="required" value="true" className="h-4 w-4" />
        Pflichtfeld
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
