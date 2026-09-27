"use server";

import { createClient } from "@/lib/supabase/server";
import { leadFormSchema } from "@/lib/leadSchema";
import { getClientIp, hashIp } from "@/lib/rateLimit";
import { ingestLead } from "@/lib/leadIngestion";
import { logger } from "@/lib/logger";

export type LeadFormState = { error?: string; success?: boolean } | null;

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const RATE_LIMIT_ERROR =
  "Zu viele Anfragen von dir in kurzer Zeit. Bitte versuche es in einer Stunde erneut.";

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  // Honeypot: reale Nutzer lassen dieses Feld leer, Bots füllen es meist aus.
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

  const supabase = await createClient();

  // Sicherstellen, dass das Business tatsächlich existiert (RLS erlaubt
  // Inserts ohnehin nur für existierende business_ids, das ist die
  // serverseitige Bestätigung dafür).
  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_name, email, plan, subscription_status, trial_ends_at, is_demo")
    .eq("id", parsed.data.business_id)
    .maybeSingle();

  if (!business) {
    return { error: "Dieses Unternehmen wurde nicht gefunden." };
  }

  // Rate-Limiting: max. 5 Anfragen pro IP+Business und Stunde (siehe
  // public.check_and_record_lead_attempt in supabase/schema.sql). Das
  // laeuft server-seitig ueber eine SECURITY DEFINER Funktion, damit die
  // rohe IP-Adresse nie ueber PostgREST lesbar ist.
  const ip = await getClientIp();
  const ipHash = await hashIp(ip);
  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "check_and_record_lead_attempt",
    { p_business_id: business.id, p_ip_hash: ipHash }
  );

  if (rateLimitError) {
    // Rate-Limiting darf nie den ganzen Flow blockieren, wenn die Funktion
    // (z. B. bei einer frischen DB ohne diese Migration) fehlt – dann wird
    // konservativ durchgelassen, aber geloggt.
    logger.warn("leads.rateLimit", "Rate-Limit-Check nicht verfügbar", {
      businessId: business.id,
    });
  } else if (allowed === false) {
    return { error: RATE_LIMIT_ERROR };
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

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${business.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("lead-attachments")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      logger.error("leads.submit", "Datei-Upload fehlgeschlagen", uploadError, {
        businessId: business.id,
      });
      return { error: "Die Datei konnte nicht hochgeladen werden. Bitte versuche es erneut." };
    }
    attachmentUrl = path;
  }

  const result = await ingestLead(business, {
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
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}
