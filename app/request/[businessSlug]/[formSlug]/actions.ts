"use server";

import { createClient } from "@/lib/supabase/server";
import { getFieldsForForm } from "@/lib/data/forms";
import { validateDynamicSubmission } from "@/lib/forms";
import { getClientIp, hashIp } from "@/lib/rateLimit";
import { ingestLead } from "@/lib/leadIngestion";
import { logger } from "@/lib/logger";

export type DynamicFormState = { error?: string; success?: boolean } | null;

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const RATE_LIMIT_ERROR =
  "Zu viele Anfragen von dir in kurzer Zeit. Bitte versuche es in einer Stunde erneut.";

/**
 * Wird via `.bind(null, businessSlug, formSlug)` an die Client-Komponente
 * uebergeben (siehe app/request/[businessSlug]/[formSlug]/page.tsx). Die
 * Feld-Definitionen werden HIER, serverseitig, frisch aus der Datenbank
 * geladen – der Client schickt nur Antworten, niemals die Feld-Definition
 * selbst ("Never trust field definitions from the browser").
 */
export async function submitDynamicForm(
  businessSlug: string,
  formSlug: string,
  _prev: DynamicFormState,
  formData: FormData
): Promise<DynamicFormState> {
  const honeypot = String(formData.get("website") ?? "");
  if (honeypot.trim().length > 0) {
    return { success: true };
  }

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, business_name, email, published, plan, subscription_status, trial_ends_at, is_demo"
    )
    .eq("slug", businessSlug)
    .maybeSingle();
  if (!business || !business.published) {
    return { error: "Dieses Unternehmen wurde nicht gefunden." };
  }

  const { data: form } = await supabase
    .from("request_forms")
    .select("id, name, active")
    .eq("business_id", business.id)
    .eq("slug", formSlug)
    .eq("active", true)
    .maybeSingle();
  if (!form) {
    return { error: "Dieses Formular ist aktuell nicht verfügbar." };
  }

  // Feld-Definitionen IMMER frisch aus der DB, niemals aus formData.
  const fields = await getFieldsForForm(form.id);

  const validation = validateDynamicSubmission(fields, formData);
  if (!validation.ok) {
    return { error: validation.error };
  }
  const data = validation.data;

  const ip = await getClientIp();
  const ipHash = await hashIp(ip);
  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "check_and_record_lead_attempt",
    { p_business_id: business.id, p_ip_hash: ipHash }
  );
  if (rateLimitError) {
    logger.warn("forms.submit", "Rate-Limit-Check nicht verfügbar", { businessId: business.id });
  } else if (allowed === false) {
    return { error: RATE_LIMIT_ERROR };
  }

  let attachmentUrl: string | null = null;
  if (data.attachmentFile) {
    const file = data.attachmentFile;
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
      logger.error("forms.submit", "Datei-Upload fehlgeschlagen", uploadError, {
        businessId: business.id,
      });
      return { error: "Die Datei konnte nicht hochgeladen werden. Bitte versuche es erneut." };
    }
    attachmentUrl = path;
  }

  const result = await ingestLead(business, {
    business_id: business.id,
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    customer_phone: data.customerPhone,
    service: form.name,
    preferred_date: data.preferredDate,
    location: null,
    budget: null,
    description: data.description,
    attachment_url: attachmentUrl,
    form_id: form.id,
    custom_answers: data.customAnswers,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}
