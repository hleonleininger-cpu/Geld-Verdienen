import { createClient } from "@/lib/supabase/server";
import type { AppointmentRow, BlockedTimeRow } from "@/types/database";

export type AppointmentWithLead = AppointmentRow & {
  lead: { customer_name: string; customer_email: string } | null;
};

export async function getAppointmentsForBusiness(
  businessId: string,
  options: { upcomingOnly?: boolean; limit?: number } = {}
): Promise<AppointmentWithLead[]> {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("*")
    .eq("business_id", businessId)
    .order("scheduled_at", { ascending: true });

  if (options.upcomingOnly) {
    query = query.gte("scheduled_at", new Date().toISOString()).in("status", [
      "scheduled",
      "confirmed",
    ]);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  const appointments = data ?? [];
  if (appointments.length === 0) return [];

  const leadIds = [...new Set(appointments.map((a) => a.lead_id))];
  const { data: leads } = await supabase
    .from("leads")
    .select("id, customer_name, customer_email")
    .in("id", leadIds);
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));

  return appointments.map((appointment) => ({
    ...appointment,
    lead: leadById.get(appointment.lead_id) ?? null,
  }));
}

export async function getAppointmentForLead(leadId: string): Promise<AppointmentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function getBlockedTimesForBusiness(
  businessId: string
): Promise<BlockedTimeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocked_times")
    .select("*")
    .eq("business_id", businessId)
    .order("starts_at", { ascending: true });
  return data ?? [];
}

/**
 * Liest verfuegbare Terminslots fuer ein angenommenes Angebot an einem
 * bestimmten Tag – ruft die SECURITY DEFINER RPC auf, die serverseitig
 * (nicht nur im UI) prueft, dass das Angebot angenommen ist UND das
 * Business das Calendar-Feature freigeschaltet hat. Liefert bei jedem
 * Fehler/fehlender Berechtigung schlicht eine leere Liste statt zu
 * werfen – der Aufrufer zeigt dann "keine Termine verfuegbar" an.
 */
export async function getAvailableAppointmentSlots(
  publicToken: string,
  date: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_available_appointment_slots", {
    p_public_token: publicToken,
    p_date: date,
  });
  return (data as string[] | null) ?? [];
}

export interface AppointmentCounts {
  upcoming: number;
}

export async function getUpcomingAppointmentCount(businessId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("status", ["scheduled", "confirmed"])
    .gte("scheduled_at", new Date().toISOString());
  return count ?? 0;
}
