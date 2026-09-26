"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/data/business";
import { logger } from "@/lib/logger";
import {
  updateLeadStatusSchema,
  reminderSchema,
  clearReminderSchema,
  quoteSchema,
} from "@/lib/validation";

export type LeadActionState = { error?: string; message?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
const NOT_YOURS_ERROR = "Diese Anfrage gehört nicht zu deinem Unternehmen.";

/**
 * Lädt das Business des aktuell eingeloggten Nutzers oder gibt einen
 * Fehlerzustand zurück. Jede Mutation unten scoped ihre Query zusätzlich
 * zu RLS explizit auf `business_id = business.id` – RLS ist die harte
 * Grenze, dieser Check sorgt zusätzlich für eine ehrliche Fehlermeldung
 * statt eines stillen No-ops, falls jemand eine fremde `lead_id` einreicht.
 */
async function requireOwnBusiness(): Promise<
  { business: NonNullable<Awaited<ReturnType<typeof getCurrentBusiness>>> } | { error: string }
> {
  const business = await getCurrentBusiness();
  if (!business) {
    return { error: "Bitte melde dich erneut an." };
  }
  return { business };
}

export async function updateLeadStatus(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const parsed = updateLeadStatusSchema.safeParse({
    lead_id: formData.get("lead_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.lead_id)
    .eq("business_id", ctx.business.id)
    .select("id");

  if (error) {
    logger.error("leads.updateStatus", "Update fehlgeschlagen", error, {
      leadId: parsed.data.lead_id,
    });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  revalidatePath(`/dashboard/leads/${parsed.data.lead_id}`);
  revalidatePath("/dashboard");
  return { message: "Status aktualisiert." };
}

export async function setReminder(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const parsed = reminderSchema.safeParse({
    lead_id: formData.get("lead_id"),
    reminder_at: formData.get("reminder_at"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ reminder_at: new Date(parsed.data.reminder_at).toISOString() })
    .eq("id", parsed.data.lead_id)
    .eq("business_id", ctx.business.id)
    .select("id");

  if (error) {
    logger.error("leads.setReminder", "Update fehlgeschlagen", error, {
      leadId: parsed.data.lead_id,
    });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  revalidatePath(`/dashboard/leads/${parsed.data.lead_id}`);
  revalidatePath("/dashboard");
  return { message: "Erinnerung gesetzt." };
}

export async function clearReminder(leadId: string): Promise<void> {
  const parsed = clearReminderSchema.safeParse({ lead_id: leadId });
  if (!parsed.success) return;

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return;

  const supabase = await createClient();
  await supabase
    .from("leads")
    .update({ reminder_at: null })
    .eq("id", parsed.data.lead_id)
    .eq("business_id", ctx.business.id);

  revalidatePath(`/dashboard/leads/${parsed.data.lead_id}`);
  revalidatePath("/dashboard");
}

export async function createQuote(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const priceRaw = String(formData.get("price") ?? "0").replace(",", ".");
  const parsed = quoteSchema.safeParse({
    lead_id: formData.get("lead_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    price: Number.parseFloat(priceRaw),
    valid_until: formData.get("valid_until"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();

  // Explizite Ownership-Pruefung VOR dem Insert: `quotes_insert_own_business`
  // (RLS) wuerde einen Insert fuer einen fremden Lead ohnehin verwerfen,
  // aber so bekommt der Nutzer eine ehrliche Fehlermeldung statt eines
  // generischen DB-Fehlers.
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", parsed.data.lead_id)
    .eq("business_id", ctx.business.id)
    .maybeSingle();
  if (!lead) {
    return { error: NOT_YOURS_ERROR };
  }

  const { error } = await supabase.from("quotes").insert({
    lead_id: parsed.data.lead_id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    price: parsed.data.price,
    valid_until: parsed.data.valid_until || null,
  });

  if (error) {
    logger.error("leads.createQuote", "Insert fehlgeschlagen", error, {
      leadId: parsed.data.lead_id,
    });
    return { error: GENERIC_ERROR };
  }

  await supabase
    .from("leads")
    .update({ status: "quote_sent" })
    .eq("id", parsed.data.lead_id)
    .eq("business_id", ctx.business.id)
    .in("status", ["new", "in_progress"]);

  revalidatePath(`/dashboard/leads/${parsed.data.lead_id}`);
  revalidatePath("/dashboard");
  return { message: "Angebot erstellt." };
}
