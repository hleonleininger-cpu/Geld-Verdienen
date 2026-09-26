"use server";

import { createClient } from "@/lib/supabase/server";
import { leadFormSchema } from "@/lib/leadSchema";

export type LeadFormState = { error?: string; success?: boolean } | null;

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  // Honeypot: reales Nutzer lassen dieses Feld leer, Bots füllen es meist aus.
  const honeypot = String(formData.get("website") ?? "");
  if (honeypot.trim().length > 0) {
    // Stiller Erfolg fürs Bot – keine Fehlermeldung, die Bots zum Anpassen anregt.
    return { success: true };
  }

  const raw = {
    business_id: String(formData.get("business_id") ?? ""),
    customer_name: String(formData.get("customer_name") ?? ""),
    customer_email: String(formData.get("customer_email") ?? ""),
    customer_phone: String(formData.get("customer_phone") ?? ""),
    service: String(formData.get("service") ?? ""),
    preferred_date: String(formData.get("preferred_date") ?? ""),
    location: String(formData.get("location") ?? ""),
    budget: String(formData.get("budget") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const supabase = createClient();

  // Sicherstellen, dass das Business tatsächlich existiert (RLS erlaubt
  // Inserts ohnehin nur für existierende business_ids, das ist die
  // serverseitige Bestätigung dafür).
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", parsed.data.business_id)
    .maybeSingle();

  if (!business) {
    return { error: "Dieses Unternehmen wurde nicht gefunden." };
  }

  let attachmentUrl: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return { error: "Die Datei darf maximal 8 MB groß sein." };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: "Erlaubt sind nur Fotos (JPG/PNG/WEBP) oder PDF-Dateien." };
    }

    const extension = file.name.split(".").pop() ?? "bin";
    const path = `${business.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("lead-attachments")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return { error: "Die Datei konnte nicht hochgeladen werden. Bitte versuche es erneut." };
    }
    attachmentUrl = path;
  }

  const { error: insertError } = await supabase.from("leads").insert({
    business_id: parsed.data.business_id,
    customer_name: parsed.data.customer_name,
    customer_email: parsed.data.customer_email,
    customer_phone: parsed.data.customer_phone || null,
    service: parsed.data.service,
    preferred_date: parsed.data.preferred_date || null,
    location: parsed.data.location || null,
    budget: parsed.data.budget || null,
    description: parsed.data.description || null,
    attachment_url: attachmentUrl,
    status: "new",
  });

  if (insertError) {
    return { error: "Deine Anfrage konnte nicht gesendet werden. Bitte versuche es erneut." };
  }

  return { success: true };
}
