"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/data/business";
import { getFormById } from "@/lib/data/forms";
import { hasFeature } from "@/lib/entitlements";
import { track } from "@/lib/analytics";
import { slugify } from "@/lib/format";
import { getIndustry } from "@/lib/industries";
import { logger } from "@/lib/logger";
import {
  createFormSchema,
  updateFormSchema,
  formFieldSchema,
  updateFormFieldSchema,
} from "@/lib/validation";

export type FormActionState = { error?: string; message?: string; formId?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
const NOT_YOURS_ERROR = "Dieses Formular gehört nicht zu deinem Unternehmen.";

async function requireOwnBusiness() {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Bitte melde dich erneut an." } as const;
  return { business } as const;
}

async function uniqueFormSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  base: string
): Promise<string> {
  const cleanBase = base || "formular";
  let candidate = cleanBase;
  let attempt = 1;
  // Kleine Anzahl an Businesses/Formularen im MVP-Umfang – eine simple
  // Schleife statt einer SQL-Sequenz ist hier voellig ausreichend.
  while (attempt < 50) {
    const { data } = await supabase
      .from("request_forms")
      .select("id")
      .eq("business_id", businessId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    attempt += 1;
    candidate = `${cleanBase}-${attempt}`;
  }
  return `${cleanBase}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * Formular-Builder ist ein Pro/Business-Feature (siehe
 * lib/entitlements.ts, PLAN_FEATURES.custom_forms). Ein bestehendes
 * Formular bleibt bei einem Downgrade nutzbar (kein Datenverlust) – nur
 * das ANLEGEN eines neuen Formulars ist gegated.
 */
export async function createForm(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = createFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  if (!hasFeature(ctx.business, "custom_forms")) {
    return {
      error:
        "Individuelle Formulare sind ab dem Pro-Plan verfügbar. Bitte upgrade dein Abo.",
    };
  }

  const supabase = await createClient();
  const slug = await uniqueFormSlug(supabase, ctx.business.id, slugify(parsed.data.name));

  const { data, error } = await supabase
    .from("request_forms")
    .insert({
      business_id: ctx.business.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      active: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("forms.create", "Insert fehlgeschlagen", error, { businessId: ctx.business.id });
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/forms");
  return { message: "Formular erstellt.", formId: data.id };
}

/**
 * Legt ein Formular aus der Branchen-Vorlage an (siehe lib/industries.ts,
 * IndustryDefinition.formFields) – ein produktionsreifer Startpunkt statt
 * eines leeren Formulars, ohne pro Branche eine eigene Form-Builder-UI zu
 * duplizieren (dieselbe request_forms/request_form_fields-Struktur, nur
 * mit branchenspezifischen Daten vorbefuellt).
 */
export async function createFormFromTemplate(
  _prev: FormActionState,
  _formData: FormData
): Promise<FormActionState> {
  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  if (!hasFeature(ctx.business, "custom_forms")) {
    return {
      error:
        "Individuelle Formulare sind ab dem Pro-Plan verfügbar. Bitte upgrade dein Abo.",
    };
  }

  const industry = getIndustry(ctx.business.industry);
  const supabase = await createClient();
  const slug = await uniqueFormSlug(supabase, ctx.business.id, "anfrage");

  const { data: form, error } = await supabase
    .from("request_forms")
    .insert({
      business_id: ctx.business.id,
      name: `${industry.label}-Anfrage`,
      slug,
      description: null,
      active: false,
    })
    .select("id")
    .single();

  if (error || !form) {
    logger.error("forms.createFromTemplate", "Insert fehlgeschlagen", error, {
      businessId: ctx.business.id,
    });
    return { error: GENERIC_ERROR };
  }

  const fieldRows = industry.formFields.map((field, index) => ({
    form_id: form.id,
    field_type: field.field_type,
    label: field.label,
    description: field.description ?? null,
    required: field.required,
    options: field.options ?? [],
    position: index,
  }));

  const { error: fieldsError } = await supabase.from("request_form_fields").insert(fieldRows);
  if (fieldsError) {
    logger.error("forms.createFromTemplate", "Felder konnten nicht angelegt werden", fieldsError, {
      formId: form.id,
    });
    // Das Formular besteht bereits (nur ohne Felder) – der Owner kann es
    // im Editor manuell vervollstaendigen, daher kein Fehler nach oben.
  }

  revalidatePath("/dashboard/forms");
  return { message: "Formular aus Vorlage erstellt.", formId: form.id };
}

export async function updateForm(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = updateFormSchema.safeParse({
    form_id: formData.get("form_id"),
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("request_forms")
    .update({ name: parsed.data.name, description: parsed.data.description || null })
    .eq("id", parsed.data.form_id)
    .eq("business_id", ctx.business.id)
    .select("id");

  if (error) {
    logger.error("forms.update", "Update fehlgeschlagen", error, { formId: parsed.data.form_id });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  revalidatePath("/dashboard/forms");
  revalidatePath(`/dashboard/forms/${parsed.data.form_id}`);
  return { message: "Formular gespeichert." };
}

export async function toggleFormActive(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const formId = String(formData.get("form_id") ?? "");
  const active = formData.get("active") === "true";
  if (!formId) return { error: "Ungültiges Formular." };

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();

  // Mindestens ein Feld ist Pflicht, bevor ein Formular veroeffentlicht
  // werden kann – ein leeres, aktives Formular waere fuer Besucher
  // nutzlos (nur Name/E-Mail).
  if (active) {
    const { count } = await supabase
      .from("request_form_fields")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId);
    if (!count || count === 0) {
      return { error: "Bitte füge mindestens ein Feld hinzu, bevor du das Formular aktivierst." };
    }
  }

  const { data, error } = await supabase
    .from("request_forms")
    .update({ active })
    .eq("id", formId)
    .eq("business_id", ctx.business.id)
    .select("id");

  if (error) {
    logger.error("forms.toggleActive", "Update fehlgeschlagen", error, { formId });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  if (active) {
    const { count: activeCount } = await supabase
      .from("request_forms")
      .select("id", { count: "exact", head: true })
      .eq("business_id", ctx.business.id)
      .eq("active", true);
    if (activeCount === 1) {
      await track("first_form_published", { businessId: ctx.business.id });
    }
  }

  revalidatePath("/dashboard/forms");
  revalidatePath(`/dashboard/forms/${formId}`);
  return { message: active ? "Formular veröffentlicht." : "Formular deaktiviert." };
}

async function requireOwnForm(formId: string) {
  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const form = await getFormById(formId);
  if (!form || form.business_id !== ctx.business.id) {
    return { error: NOT_YOURS_ERROR } as const;
  }
  return { business: ctx.business, form } as const;
}

export async function addField(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const formId = String(formData.get("form_id") ?? "");
  const optionsRaw = String(formData.get("options") ?? "[]");
  let options: unknown;
  try {
    options = JSON.parse(optionsRaw);
  } catch {
    return { error: "Ungültige Optionen." };
  }

  const parsed = formFieldSchema.safeParse({
    field_type: formData.get("field_type"),
    label: formData.get("label"),
    description: formData.get("description"),
    required: formData.get("required") === "true",
    options,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnForm(formId);
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { count } = await supabase
    .from("request_form_fields")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId);

  const { error } = await supabase.from("request_form_fields").insert({
    form_id: formId,
    field_type: parsed.data.field_type,
    label: parsed.data.label,
    description: parsed.data.description || null,
    required: parsed.data.required,
    options: parsed.data.options,
    position: count ?? 0,
  });

  if (error) {
    logger.error("forms.addField", "Insert fehlgeschlagen", error, { formId });
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/dashboard/forms/${formId}`);
  return { message: "Feld hinzugefügt." };
}

export async function updateField(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const formId = String(formData.get("form_id") ?? "");
  const optionsRaw = String(formData.get("options") ?? "[]");
  let options: unknown;
  try {
    options = JSON.parse(optionsRaw);
  } catch {
    return { error: "Ungültige Optionen." };
  }

  const parsed = updateFormFieldSchema.safeParse({
    field_id: formData.get("field_id"),
    field_type: formData.get("field_type"),
    label: formData.get("label"),
    description: formData.get("description"),
    required: formData.get("required") === "true",
    options,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnForm(formId);
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("request_form_fields")
    .update({
      field_type: parsed.data.field_type,
      label: parsed.data.label,
      description: parsed.data.description || null,
      required: parsed.data.required,
      options: parsed.data.options,
    })
    .eq("id", parsed.data.field_id)
    .eq("form_id", formId)
    .select("id");

  if (error) {
    logger.error("forms.updateField", "Update fehlgeschlagen", error, {
      fieldId: parsed.data.field_id,
    });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: "Dieses Feld gehört nicht zu diesem Formular." };
  }

  revalidatePath(`/dashboard/forms/${formId}`);
  return { message: "Feld gespeichert." };
}

export async function removeField(formId: string, fieldId: string): Promise<void> {
  const ctx = await requireOwnForm(formId);
  if ("error" in ctx) return;

  const supabase = await createClient();
  await supabase.from("request_form_fields").delete().eq("id", fieldId).eq("form_id", formId);

  revalidatePath(`/dashboard/forms/${formId}`);
}

export async function moveField(
  formId: string,
  fieldId: string,
  direction: "up" | "down"
): Promise<void> {
  const ctx = await requireOwnForm(formId);
  if ("error" in ctx) return;

  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("request_form_fields")
    .select("id, position")
    .eq("form_id", formId)
    .order("position", { ascending: true });
  if (!fields) return;

  const index = fields.findIndex((f) => f.id === fieldId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= fields.length) return;

  const current = fields[index];
  const swapWith = fields[swapIndex];

  await supabase
    .from("request_form_fields")
    .update({ position: swapWith.position })
    .eq("id", current.id);
  await supabase
    .from("request_form_fields")
    .update({ position: current.position })
    .eq("id", swapWith.id);

  revalidatePath(`/dashboard/forms/${formId}`);
}
