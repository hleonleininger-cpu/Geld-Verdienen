import type { RequestFormFieldRow } from "@/types/database";

/**
 * Formular-Builder: Rendering- und Validierungslogik fuer dynamische
 * Formulare (Custom Request Form Builder). Die Eingabe-Namen werden
 * ueber die Feld-ID gebildet, damit mehrere Felder desselben Typs nie
 * kollidieren.
 */
export function fieldInputName(fieldId: string): string {
  return `field_${fieldId}`;
}

export type CustomAnswerValue = string | string[] | boolean;

export interface DynamicSubmissionResult {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  preferredDate: string | null;
  description: string | null;
  customAnswers: Record<string, { label: string; value: CustomAnswerValue }>;
  attachmentFile: File | null;
}

export type DynamicSubmissionValidation =
  | { ok: true; data: DynamicSubmissionResult }
  | { ok: false; error: string };

const MAX_TEXT_LENGTH = 500;
const MAX_TEXTAREA_LENGTH = 3000;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Validiert eine dynamische Formular-Einreichung SERVERSEITIG gegen die
 * tatsaechlichen Feld-Definitionen aus der Datenbank (`fields`). Der
 * Aufrufer MUSS `fields` frisch aus `request_form_fields` laden – niemals
 * aus einem vom Client mitgeschickten Wert uebernehmen ("Never trust
 * field definitions from the browser").
 *
 * `customer_name`/`customer_email` sind immer eingebaute, nicht
 * loeschbare Pflichtfelder (analog zum bestehenden Standardformular) und
 * werden hier fest erwartet, unabhaengig von den dynamischen Feldern.
 *
 * Deterministische Zuordnung auf bestehende `leads`-Spalten (jeweils das
 * ERSTE Feld dieses Typs, damit ein Formular mit mehreren Feldern
 * desselben Typs nicht mehrdeutig wird):
 *  - erstes PHONE-Feld    -> customer_phone
 *  - erstes DATE-Feld     -> preferred_date
 *  - erstes TEXTAREA-Feld -> description
 *  - erstes FILE-Feld     -> attachment_url (Upload separat)
 * Alle weiteren Felder (und zusaetzliche Vorkommen der obigen Typen)
 * landen in `custom_answers`.
 */
export function validateDynamicSubmission(
  fields: RequestFormFieldRow[],
  formData: FormData
): DynamicSubmissionValidation {
  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerEmail = String(formData.get("customer_email") ?? "").trim();

  if (!customerName || customerName.length > 120) {
    return { ok: false, error: "Bitte gib deinen Namen an." };
  }
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return { ok: false, error: "Bitte gib eine gültige E-Mail-Adresse an." };
  }

  let customerPhone: string | null = null;
  let preferredDate: string | null = null;
  let description: string | null = null;
  let attachmentFile: File | null = null;
  const customAnswers: DynamicSubmissionResult["customAnswers"] = {};

  for (const field of fields) {
    const inputName = fieldInputName(field.id);

    if (field.field_type === "file") {
      const file = formData.get(inputName);
      const hasFile = file instanceof File && file.size > 0;
      if (field.required && !hasFile) {
        return { ok: false, error: `Bitte lade eine Datei hoch für "${field.label}".` };
      }
      if (hasFile && !attachmentFile) {
        attachmentFile = file as File;
      }
      continue;
    }

    if (field.field_type === "multiselect") {
      const values = formData
        .getAll(inputName)
        .map((v) => String(v))
        .filter(Boolean);
      if (field.required && values.length === 0) {
        return { ok: false, error: `Bitte wähle mindestens eine Option für "${field.label}".` };
      }
      if (values.some((v) => !field.options.includes(v))) {
        return { ok: false, error: `Ungültige Auswahl für "${field.label}".` };
      }
      if (values.length > 0) {
        customAnswers[field.id] = { label: field.label, value: values };
      }
      continue;
    }

    if (field.field_type === "checkbox") {
      const checked = formData.get(inputName) === "true";
      if (field.required && !checked) {
        return { ok: false, error: `Bitte bestätige "${field.label}".` };
      }
      customAnswers[field.id] = { label: field.label, value: checked };
      continue;
    }

    const raw = String(formData.get(inputName) ?? "").trim();
    if (field.required && !raw) {
      return { ok: false, error: `Bitte fülle "${field.label}" aus.` };
    }
    if (!raw) continue;

    if (field.field_type === "email" && !EMAIL_PATTERN.test(raw)) {
      return { ok: false, error: `Ungültige E-Mail-Adresse für "${field.label}".` };
    }
    if (field.field_type === "number" && !Number.isFinite(Number(raw))) {
      return { ok: false, error: `Ungültige Zahl für "${field.label}".` };
    }
    if (field.field_type === "date" && Number.isNaN(Date.parse(raw))) {
      return { ok: false, error: `Ungültiges Datum für "${field.label}".` };
    }
    if (field.field_type === "select" && !field.options.includes(raw)) {
      return { ok: false, error: `Ungültige Auswahl für "${field.label}".` };
    }
    if (field.field_type === "text" && raw.length > MAX_TEXT_LENGTH) {
      return { ok: false, error: `"${field.label}" ist zu lang.` };
    }
    if (field.field_type === "textarea" && raw.length > MAX_TEXTAREA_LENGTH) {
      return { ok: false, error: `"${field.label}" ist zu lang.` };
    }

    if (field.field_type === "phone" && customerPhone === null) {
      customerPhone = raw;
      continue;
    }
    if (field.field_type === "date" && preferredDate === null) {
      preferredDate = raw;
      continue;
    }
    if (field.field_type === "textarea" && description === null) {
      description = raw;
      continue;
    }

    customAnswers[field.id] = { label: field.label, value: raw };
  }

  return {
    ok: true,
    data: {
      customerName,
      customerEmail,
      customerPhone,
      preferredDate,
      description,
      customAnswers,
      attachmentFile,
    },
  };
}
