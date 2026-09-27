import { createClient } from "@/lib/supabase/server";
import type { BusinessPlan, BusinessRow } from "@/types/database";

/**
 * Zentrale Feature-/Entitlement-Definition (Phase 11). ALLE Plan-Checks in
 * der App laufen ueber diese Datei – es gibt bewusst keine verstreuten
 * `if (business.plan === "pro")`-Abfragen in Komponenten.
 *
 * Ehrlichkeits-Hinweis (siehe docs/MONETIZATION.md fuer Details): Nicht
 * jedes Feature-Flag hier hat bereits eine zugehoerige, echte Funktion.
 * `max_team_members` ist fuer ein Feature vorbereitet, das in diesem
 * Umfang NICHT gebaut wurde (kein Team-/Rollen-Modell) – es taucht hier
 * auf, damit die Struktur schon steht, gatet aber aktuell nichts Reales.
 * Tatsaechlich durchgesetzt werden: `max_leads_per_month`,
 * `custom_branding`, `advanced_analytics`, `custom_forms` (siehe
 * app/dashboard/forms/actions.ts::createForm) und `calendar` (siehe
 * business_has_calendar_feature() in supabase/schema.sql, geprueft von
 * den Terminbuchungs-RPCs).
 */
export interface PlanFeatures {
  max_leads_per_month: number | null; // null = unbegrenzt
  max_team_members: number;
  custom_forms: boolean;
  advanced_analytics: boolean;
  custom_branding: boolean;
  customer_portal: boolean;
  quote_actions: boolean;
  calendar: boolean;
  file_storage_limit_mb: number;
}

export const PLAN_FEATURES: Record<BusinessPlan, PlanFeatures> = {
  free: {
    max_leads_per_month: 5,
    max_team_members: 1,
    custom_forms: false,
    advanced_analytics: false,
    custom_branding: false,
    customer_portal: true,
    quote_actions: true,
    calendar: false,
    file_storage_limit_mb: 50,
  },
  starter: {
    max_leads_per_month: null,
    max_team_members: 1,
    custom_forms: false,
    advanced_analytics: false,
    custom_branding: true,
    customer_portal: true,
    quote_actions: true,
    calendar: false,
    file_storage_limit_mb: 500,
  },
  pro: {
    max_leads_per_month: null,
    max_team_members: 3,
    custom_forms: true,
    advanced_analytics: true,
    custom_branding: true,
    customer_portal: true,
    quote_actions: true,
    calendar: true,
    file_storage_limit_mb: 2000,
  },
  business: {
    max_leads_per_month: null,
    max_team_members: 10,
    custom_forms: true,
    advanced_analytics: true,
    custom_branding: true,
    customer_portal: true,
    quote_actions: true,
    calendar: true,
    file_storage_limit_mb: 10_000,
  },
};

export const TRIAL_LENGTH_DAYS = 14;
/** Waehrend der Trial-Phase wird der Funktionsumfang von "pro" gewaehrt. */
export const TRIAL_PLAN: BusinessPlan = "pro";

export interface EffectivePlanInfo {
  plan: BusinessPlan;
  features: PlanFeatures;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  trialExpired: boolean;
}

/**
 * Berechnet den tatsaechlich gueltigen Plan "lazy", ohne Cron-Job: ein
 * abgelaufener Trial oder eine gekuendigte Subscription faellt beim
 * naechsten Lesezugriff automatisch auf den gebuchten/kostenlosen Plan
 * zurueck. Es werden dabei NIEMALS Daten geloescht – nur der
 * Funktionsumfang aendert sich (siehe Phase 12: "never delete data
 * because a plan expired").
 */
export function getEffectivePlanInfo(
  business: Pick<BusinessRow, "plan" | "subscription_status" | "trial_ends_at">
): EffectivePlanInfo {
  const now = Date.now();
  const trialEndsAt = business.trial_ends_at ? new Date(business.trial_ends_at).getTime() : null;
  const trialActive = business.subscription_status === "trialing" && trialEndsAt !== null && trialEndsAt > now;
  const trialExpired = business.subscription_status === "trialing" && trialEndsAt !== null && trialEndsAt <= now;

  let plan: BusinessPlan;
  if (business.subscription_status === "active") {
    plan = business.plan;
  } else if (trialActive) {
    plan = TRIAL_PLAN;
  } else {
    // 'none' | 'past_due' | 'canceled' | abgelaufenes 'trialing'
    plan = "free";
  }

  const trialDaysLeft =
    trialActive && trialEndsAt !== null
      ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
      : null;

  return {
    plan,
    features: PLAN_FEATURES[plan],
    isTrialing: trialActive,
    trialDaysLeft,
    trialExpired,
  };
}

export function hasFeature(
  business: Pick<BusinessRow, "plan" | "subscription_status" | "trial_ends_at">,
  feature: keyof PlanFeatures
): boolean {
  const value = getEffectivePlanInfo(business).features[feature];
  return typeof value === "boolean" ? value : Boolean(value);
}

export interface LeadQuota {
  used: number;
  limit: number | null; // null = unbegrenzt
  allowed: boolean;
  remaining: number | null;
}

/**
 * Zaehlt die in diesem Kalendermonat erstellten Leads und vergleicht sie
 * mit dem Plan-Limit. Wird sowohl im Dashboard (UsageMeter) als auch beim
 * oeffentlichen Anfrageformular (harte Grenze) verwendet.
 */
export async function getLeadQuota(
  business: Pick<BusinessRow, "id" | "plan" | "subscription_status" | "trial_ends_at">
): Promise<LeadQuota> {
  const { features } = getEffectivePlanInfo(business);
  const limit = features.max_leads_per_month;

  if (limit === null) {
    return { used: 0, limit: null, allowed: true, remaining: null };
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const supabase = await createClient();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gte("created_at", startOfMonth.toISOString());

  const used = count ?? 0;
  return {
    used,
    limit,
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
  };
}
