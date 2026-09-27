import { createClient } from "@/lib/supabase/server";
import type { ActivityEventRow, ActivityActor } from "@/types/database";

/**
 * Protokolliert ein Timeline-Event fuer ein eigenes Business (Owner-
 * Kontext). Kundenausgeloeste Events (Angebot angesehen/angenommen/
 * abgelehnt) laufen NICHT hierueber, sondern ueber die SECURITY DEFINER
 * RPC `record_public_quote_event` (siehe supabase/schema.sql), weil dort
 * kein authentifizierter Owner-Kontext existiert.
 */
export async function logActivity(params: {
  businessId: string;
  leadId?: string | null;
  quoteId?: string | null;
  type: string;
  payload?: Record<string, unknown>;
  actor?: ActivityActor;
}) {
  const supabase = await createClient();
  await supabase.from("activity_events").insert({
    business_id: params.businessId,
    lead_id: params.leadId ?? null,
    quote_id: params.quoteId ?? null,
    type: params.type,
    payload: params.payload ?? {},
    actor: params.actor ?? "owner",
  });
}

export async function getActivityForLead(leadId: string): Promise<ActivityEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getRecentActivityForBusiness(
  businessId: string,
  limit = 20
): Promise<ActivityEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_events")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
