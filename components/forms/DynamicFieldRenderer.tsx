import { Input, Textarea, Select, Label, FieldHint } from "@/components/ui/Field";
import { fieldInputName } from "@/lib/forms";
import type { RequestFormFieldRow } from "@/types/database";

/**
 * Reusable Renderer fuer ein einzelnes dynamisches Formularfeld
 * (Custom Request Form Builder). Wird von der oeffentlichen
 * Formularseite genutzt; rendert reines HTML (keine Client-Interaktivitaet
 * noetig – Mehrfachauswahl nutzt native Checkboxen mit gleichem `name`,
 * die der Browser ohnehin als Array an FormData.getAll() liefert).
 *
 * WICHTIG: Die Eingabe-Namen (`fieldInputName`) muessen exakt mit
 * `lib/forms.ts::validateDynamicSubmission` uebereinstimmen, da dort die
 * serverseitige Validierung anhand derselben Feld-IDs erfolgt.
 */
export function DynamicFieldRenderer({ field }: { field: RequestFormFieldRow }) {
  const inputName = fieldInputName(field.id);
  const id = `df-${field.id}`;

  return (
    <div>
      <Label htmlFor={id} optional={!field.required}>
        {field.label}
      </Label>
      <FieldHint>{field.description}</FieldHint>

      {field.field_type === "textarea" && (
        <Textarea id={id} name={inputName} required={field.required} rows={4} maxLength={3000} />
      )}

      {field.field_type === "select" && (
        <Select id={id} name={inputName} required={field.required} defaultValue="">
          <option value="" disabled>
            Bitte wählen
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      )}

      {field.field_type === "multiselect" && (
        <div className="space-y-1.5 rounded-lg border border-ink-200 p-3">
          {field.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name={inputName} value={option} className="h-4 w-4" />
              {option}
            </label>
          ))}
        </div>
      )}

      {field.field_type === "checkbox" && (
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name={inputName} value="true" className="h-4 w-4" />
          {field.required ? "Erforderlich" : "Optional"}
        </label>
      )}

      {field.field_type === "file" && (
        <input
          id={id}
          type="file"
          name={inputName}
          required={field.required}
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-700"
        />
      )}

      {(field.field_type === "text" ||
        field.field_type === "email" ||
        field.field_type === "phone" ||
        field.field_type === "number" ||
        field.field_type === "date") && (
        <Input
          id={id}
          name={inputName}
          required={field.required}
          type={
            field.field_type === "email"
              ? "email"
              : field.field_type === "phone"
                ? "tel"
                : field.field_type === "number"
                  ? "number"
                  : field.field_type === "date"
                    ? "date"
                    : "text"
          }
          maxLength={field.field_type === "text" ? 500 : undefined}
        />
      )}
    </div>
  );
}
