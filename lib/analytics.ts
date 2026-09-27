import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Produkt-Analytics (Phase 16). Schreibt in `public.analytics_events`,
 * die NUR ueber den Service-Role-Client (Admin-Dashboard) lesbar ist –
 * nicht einmal der eigene Business-Owner sieht seine eigenen Events (siehe
 * docs/SECURITY.md). Tracking darf niemals den eigentlichen Flow brechen:
 * Fehler werden geloggt, nie geworfen.
 */
export const ANALYTICS_EVENTS = [
  "signup",
  "onboarding_started",
  "onboarding_completed",
  "business_page_published",
  "lead_created",
  "quote_created",
  "quote_sent",
  "quote_viewed",
  "quote_accepted",
  "appointment_created",
  "lead_won",
  "trial_started",
  "checkout_started",
  "subscription_started",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface TrackOptions {
  businessId?: string;
  userId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function track(eventName: AnalyticsEventName, options: TrackOptions = {}) {
  try {
    const supabase = await createClient();
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      business_id: options.businessId ?? null,
      user_id: options.userId ?? null,
      metadata: options.metadata ?? {},
    });
  } catch (err) {
    // Analytics ist "best effort": ein Tracking-Fehler darf niemals eine
    // Kernfunktion (Signup, Lead-Erstellung, ...) zum Scheitern bringen.
    logger.warn("analytics.track", "Event konnte nicht protokolliert werden", {
      eventName,
    });
    void err;
  }
}
