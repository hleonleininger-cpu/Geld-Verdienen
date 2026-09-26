"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/types/database";

export type LeadActionState = { error?: string; message?: string } | null;

export async function updateLeadStatus(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const leadId = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;

  const validStatuses: LeadStatus[] = ["new", "in_progress", "quote_sent", "won", "lost"];
  if (!validStatuses.includes(status)) {
    return { error: "Ungültiger Status." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);

  if (error) {
    return { error: "Status konnte nicht aktualisiert werden." };
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { message: "Status aktualisiert." };
}

export async function setReminder(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const leadId = String(formData.get("lead_id") ?? "");
  const reminderAt = String(formData.get("reminder_at") ?? "");

  if (!reminderAt) {
    return { error: "Bitte wähle ein Datum für die Erinnerung." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ reminder_at: new Date(reminderAt).toISOString() })
    .eq("id", leadId);

  if (error) {
    return { error: "Erinnerung konnte nicht gespeichert werden." };
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { message: "Erinnerung gesetzt." };
}

export async function clearReminder(leadId: string) {
  const supabase = createClient();
  await supabase.from("leads").update({ reminder_at: null }).eq("id", leadId);
  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard");
}

export async function createQuote(
  _prev: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const leadId = String(formData.get("lead_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "0").replace(",", ".");
  const validUntil = String(formData.get("valid_until") ?? "");

  const price = Number.parseFloat(priceRaw);
  if (!title) {
    return { error: "Bitte gib einen Titel für das Angebot an." };
  }
  if (Number.isNaN(price) || price < 0) {
    return { error: "Bitte gib einen gültigen Preis an." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("quotes").insert({
    lead_id: leadId,
    title,
    description: description || null,
    price,
    valid_until: validUntil || null,
  });

  if (error) {
    return { error: "Angebot konnte nicht erstellt werden." };
  }

  await supabase
    .from("leads")
    .update({ status: "quote_sent" })
    .eq("id", leadId)
    .in("status", ["new", "in_progress"]);

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { message: "Angebot erstellt." };
}
