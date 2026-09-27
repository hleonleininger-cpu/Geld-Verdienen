"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Label, Input, Textarea, Select, FieldHint } from "@/components/ui/Field";
import { FIELD_TYPE_LABELS } from "@/lib/format";
import { REQUEST_FIELD_TYPES } from "@/lib/validation";
import {
  updateField,
  removeField,
  moveField,
  type FormActionState,
} from "@/app/dashboard/forms/actions";
import type { RequestFieldType, RequestFormFieldRow } from "@/types/database";

const OPTIONS_TYPES: RequestFieldType[] = ["select", "multiselect"];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Speichern…" : "Speichern"}
    </Button>
  );
}

export function FieldRow({
  formId,
  field,
  isFirst,
  isLast,
}: {
  formId: string;
  field: RequestFormFieldRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [fieldType, setFieldType] = useState<RequestFieldType>(field.field_type);
  const [optionsText, setOptionsText] = useState(field.options.join("\n"));
  const initialState: FormActionState = null;
  const [state, formAction] = useActionState(updateField, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.message) setEditing(false);
  }

  if (editing) {
    const options = optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      <form action={formAction} className="card-surface space-y-4 p-5">
        <input type="hidden" name="form_id" value={formId} />
        <input type="hidden" name="field_id" value={field.id} />
        <input type="hidden" name="options" value={JSON.stringify(options)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`type-${field.id}`}>Feldtyp</Label>
            <Select
              id={`type-${field.id}`}
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
            <Label htmlFor={`label-${field.id}`}>Label</Label>
            <Input id={`label-${field.id}`} name="label" required defaultValue={field.label} />
          </div>
        </div>

        <div>
          <Label htmlFor={`description-${field.id}`} optional>
            Beschreibung / Hilfetext
          </Label>
          <Input
            id={`description-${field.id}`}
            name="description"
            defaultValue={field.description ?? ""}
          />
        </div>

        {OPTIONS_TYPES.includes(fieldType) && (
          <div>
            <Label htmlFor={`options-${field.id}`}>Optionen</Label>
            <Textarea
              id={`options-${field.id}`}
              rows={4}
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
            />
            <FieldHint>Eine Option pro Zeile.</FieldHint>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="required"
            value="true"
            defaultChecked={field.required}
            className="h-4 w-4"
          />
          Pflichtfeld
        </label>

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
    <div className="card-surface flex items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink-900">{field.label}</p>
          <Badge className="bg-sand-100 text-ink-500">{FIELD_TYPE_LABELS[field.field_type]}</Badge>
          {field.required && <Badge className="bg-brand-50 text-brand-700">Pflichtfeld</Badge>}
        </div>
        {field.description && <p className="mt-1 text-xs text-ink-400">{field.description}</p>}
        {field.options.length > 0 && (
          <p className="mt-1 text-xs text-ink-400">Optionen: {field.options.join(", ")}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <form action={moveField.bind(null, formId, field.id, "up")}>
          <button
            type="submit"
            disabled={isFirst}
            aria-label="Nach oben"
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
        <form action={moveField.bind(null, formId, field.id, "down")}>
          <button
            type="submit"
            disabled={isLast}
            aria-label="Nach unten"
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-30"
          >
            <ArrowDown className="h-4 w-4" />
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
        <form action={removeField.bind(null, formId, field.id)}>
          <button
            type="submit"
            aria-label="Entfernen"
            className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
