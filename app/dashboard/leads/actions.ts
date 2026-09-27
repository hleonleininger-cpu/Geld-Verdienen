"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/data/business";
import { logActivity } from "@/lib/data/activity";
import { computeQuoteTotals } from "@/lib/quotes";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import {
  updateLeadStatusSchema,
  updateLeadPrioritySchema,
  reminderSchema,
  clearReminderSchema,
  quoteSchema,
} from "@/lib/validation";
import type { QuoteLineItem } from "@/types/database";

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

  await logActivity({
    businessId: ctx.business.id,
    leadId: parsed.data.lead_id,
    type: "status_changed",
    payload: { status: parsed.data.status },
  });

  if (parsed.data.status === "won") {
    await track("lead_won", { businessId: ctx.business.id });
  }

  revalidatePath(`/dashboard/leads/${parsed.data.lead_id}`);
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { message: "Status aktualisiert." };
}

export async function updateLeadPriority(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const parsed = updateLeadPrioritySchema.safeParse({
    lead_id: formData.get("lead_id"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ priority: parsed.data.priority })
    .eq("id", parsed.data.lead_id)
    .eq("business_id", ctx.business.id)
    .select("id");

  if (error) {
    logger.error("leads.updatePriority", "Update fehlgeschlagen", error, {
      leadId: parsed.data.lead_id,
    });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  revalidatePath(`/dashboard/leads/${parsed.data.lead_id}`);
  revalidatePath("/dashboard/leads");
  return { message: "Priorität aktualisiert." };
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

/**
 * Angebote werden immer als Entwurf angelegt – der Versand (und damit die
 * Sichtbarkeit fuer den Kunden ueber den oeffentlichen Token-Link sowie der
 * Pipeline-Uebergang des Leads) passiert erst explizit ueber `sendQuote`.
 * So kann ein Angebot vorbereitet und geprueft werden, bevor der Kunde es
 * sieht.
 */
export async function createQuote(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  let lineItemsRaw: unknown;
  try {
    lineItemsRaw = JSON.parse(String(formData.get("line_items") ?? "[]"));
  } catch {
    return { error: "Ungültige Positionen." };
  }

  const parsed = quoteSchema.safeParse({
    lead_id: formData.get("lead_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    line_items: lineItemsRaw,
    discount_amount: Number.parseFloat(
      String(formData.get("discount_amount") ?? "0").replace(",", ".") || "0"
    ),
    tax_rate: Number.parseFloat(
      String(formData.get("tax_rate") ?? "0").replace(",", ".") || "0"
    ),
    valid_until: formData.get("valid_until"),
    notes: formData.get("notes"),
    terms: formData.get("terms"),
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

  const lineItems: QuoteLineItem[] = parsed.data.line_items;
  const { subtotal, taxAmount, total } = computeQuoteTotals(
    lineItems,
    parsed.data.discount_amount,
    parsed.data.tax_rate
  );

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      lead_id: parsed.data.lead_id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      line_items: lineItems,
      subtotal,
      discount_amount: parsed.data.discount_amount,
      tax_rate: parsed.data.tax_rate,
      tax_amount: taxAmount,
      price: total,
      valid_until: parsed.data.valid_until || null,
      notes: parsed.data.notes || null,
      terms: parsed.data.terms || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !quote) {
    logger.error("leads.createQuote", "Insert fehlgeschlagen", error, {
      leadId: parsed.data.lead_id,
    });
    return { error: GENERIC_ERROR };
  }

  await logActivity({
    businessId: ctx.business.id,
    leadId: parsed.data.lead_id,
    quoteId: quote.id,
    type: "quote_created",
  });
  await track("quote_created", { businessId: ctx.business.id });

  revalidatePath(`/dashboard/leads/${parsed.data.lead_id}`);
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard");
  return { message: "Angebot als Entwurf gespeichert." };
}

/**
 * Versendet ein Angebot: setzt `status='sent'` + `sent_at` und schiebt den
 * Lead in der Pipeline weiter (nur vorwaerts, nur aus fruehen Stufen – ein
 * bereits verhandelter/gewonnener/verlorener Lead wird nicht ueberschrieben).
 */
export async function sendQuote(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const quoteId = String(formData.get("quote_id") ?? "");
  if (!quoteId) {
    return { error: "Ungültiges Angebot." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status, lead_id")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) {
    return { error: NOT_YOURS_ERROR };
  }

  // Ownership wird ueber den Lead geprueft (Quotes haben keine eigene
  // `business_id`-Spalte) – siehe gleiches Muster in `createQuote` oben.
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", quote.lead_id)
    .eq("business_id", ctx.business.id)
    .maybeSingle();
  if (!lead) {
    return { error: NOT_YOURS_ERROR };
  }
  if (quote.status !== "draft") {
    return { error: "Dieses Angebot wurde bereits versendet." };
  }

  const { error } = await supabase
    .from("quotes")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", quoteId);

  if (error) {
    logger.error("leads.sendQuote", "Update fehlgeschlagen", error, { quoteId });
    return { error: GENERIC_ERROR };
  }

  await supabase
    .from("leads")
    .update({ status: "quote_sent" })
    .eq("id", quote.lead_id)
    .eq("business_id", ctx.business.id)
    .in("status", ["new", "contacted", "qualified"]);

  await logActivity({
    businessId: ctx.business.id,
    leadId: quote.lead_id,
    quoteId,
    type: "quote_sent",
  });
  await track("quote_sent", { businessId: ctx.business.id });

  revalidatePath(`/dashboard/leads/${quote.lead_id}`);
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/quotes");
  revalidatePath("/dashboard");
  return { message: "Angebot versendet." };
}
