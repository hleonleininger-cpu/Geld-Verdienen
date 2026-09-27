import { createClient } from "@/lib/supabase/server";
import { getLeadQuota } from "@/lib/entitlements";
import { track } from "@/lib/analytics";
import { getEmailProvider } from "@/lib/email";
import { logger } from "@/lib/logger";
import type { BusinessRow } from "@/types/database";

export type LeadIngestionBusiness = Pick<
  BusinessRow,
  "id" | "business_name" | "email" | "is_demo" | "plan" | "subscription_status" | "trial_ends_at"
>;

export interface LeadInsertInput {
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  service: string;
  preferred_date: string | null;
  location: string | null;
  budget: string | null;
  description: string | null;
  attachment_url: string | null;
  form_id?: string | null;
  custom_answers?: Record<string, unknown>;
}

export type LeadIngestionResult =
  | { ok: true; leadId: string }
  | { ok: false; error: string };

const QUOTA_ERROR =
  "Dieses Unternehmen hat sein monatliches Anfragelimit erreicht. Bitte versuche es später erneut oder kontaktiere es direkt.";
const GENERIC_ERROR = "Deine Anfrage konnte nicht gesendet werden. Bitte versuche es erneut.";

/**
 * Gemeinsamer "letzter Schritt" fuer JEDE Lead-Quelle (Standardformular
 * auf /[businessSlug] UND jedes individuelle Formular aus dem Formular-
 * Builder): Plan-Quote pruefen, Lead anlegen, Tracking, Benachrichtigungs-
 * E-Mail. Ein einziger Ort statt Duplikation zwischen den beiden Formen –
 * stellt sicher, dass sich beide Quellen identisch verhalten (Quote-
 * Durchsetzung, "first_lead"-Tracking, Owner-Benachrichtigung).
 *
 * Alles NACH dem Insert ist "best effort": ein Insert-Erfolg wird
 * niemals durch einen nachgelagerten Tracking-/E-Mail-Fehler rueckgaengig
 * gemacht ("A failed email must not destroy a lead").
 */
export async function ingestLead(
  business: LeadIngestionBusiness,
  lead: LeadInsertInput
): Promise<LeadIngestionResult> {
  if (!business.is_demo) {
    const quota = await getLeadQuota(business);
    if (!quota.allowed) {
      return { ok: false, error: QUOTA_ERROR };
    }
  }

  const supabase = await createClient();
  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert({
      business_id: lead.business_id,
      customer_name: lead.customer_name,
      customer_email: lead.customer_email,
      customer_phone: lead.customer_phone,
      service: lead.service,
      preferred_date: lead.preferred_date,
      location: lead.location,
      budget: lead.budget,
      description: lead.description,
      attachment_url: lead.attachment_url,
      status: "new",
      form_id: lead.form_id ?? null,
      custom_answers: lead.custom_answers ?? {},
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    logger.error("leadIngestion.insert", "Insert fehlgeschlagen", insertError, {
      businessId: business.id,
    });
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!business.is_demo) {
    await track("lead_created", { businessId: business.id });

    const { count: leadCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id);
    if (leadCount === 1) {
      await track("first_lead", { businessId: business.id });
    }
  }

  if (business.email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const emailProvider = getEmailProvider();
    const emailResult = await emailProvider.sendLeadNotification({
      to: business.email,
      businessName: business.business_name,
      customerName: lead.customer_name,
      service: lead.service,
      leadUrl: `${siteUrl}/dashboard/leads/${inserted.id}`,
    });
    if (!emailResult.ok) {
      logger.warn("leadIngestion.email", "Benachrichtigungs-E-Mail konnte nicht gesendet werden", {
        businessId: business.id,
      });
    }
  }

  return { ok: true, leadId: inserted.id };
}
