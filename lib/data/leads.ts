import { createClient } from "@/lib/supabase/server";
import { parseBudget } from "@/lib/format";
import type { LeadRow, LeadStatus, QuoteRow } from "@/types/database";

export const LEADS_PAGE_SIZE = 20;

export interface LeadsPage {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getLeadsPage(
  businessId: string,
  options: { status?: LeadStatus; page?: number } = {}
): Promise<LeadsPage> {
  const supabase = await createClient();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = LEADS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, count } = await query;
  return { leads: data ?? [], total: count ?? 0, page, pageSize };
}

export type UpcomingReminder = Pick<
  LeadRow,
  "id" | "customer_name" | "service" | "reminder_at"
>;

/**
 * Nutzt den partiellen Index `leads_reminder_at_idx` (nur Zeilen mit
 * gesetzter Erinnerung) und liest nur die Spalten, die die Dashboard-
 * Erinnerungsliste tatsaechlich anzeigt.
 */
export async function getUpcomingReminders(
  businessId: string,
  limit = 10
): Promise<UpcomingReminder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, customer_name, service, reminder_at")
    .eq("business_id", businessId)
    .not("reminder_at", "is", null)
    .order("reminder_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getLeadById(leadId: string): Promise<LeadRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  return data ?? null;
}

export async function getQuotesForLead(leadId: string): Promise<QuoteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface DashboardStats {
  newCount: number;
  openCount: number;
  pendingReplyCount: number;
  estimatedValue: number;
  totalCount: number;
  statusCounts: Record<LeadStatus, number>;
}

type StatsRow = { status: LeadStatus; budget: string | null };

/**
 * Laedt fuer die Kennzahlen-Kacheln nur die Spalten, die tatsaechlich
 * gebraucht werden (`status`, `budget`), statt aller Leads-Spalten
 * (inkl. Freitext-Beschreibung, Kundendaten etc.) – deutlich kleinerer
 * Payload, sobald ein Business viele Leads hat.
 */
export async function getDashboardStats(businessId: string): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("status, budget")
    .eq("business_id", businessId);

  return computeStats(data ?? []);
}

export function computeStats(leads: StatsRow[]): DashboardStats {
  const statusCounts: Record<LeadStatus, number> = {
    new: 0,
    in_progress: 0,
    quote_sent: 0,
    won: 0,
    lost: 0,
  };
  for (const lead of leads) {
    statusCounts[lead.status] += 1;
  }

  const openCount = statusCounts.new + statusCounts.in_progress + statusCounts.quote_sent;
  const pendingReplyCount = statusCounts.new + statusCounts.in_progress;
  const estimatedValue = leads
    .filter((l) => l.status !== "lost")
    .reduce((sum, l) => sum + parseBudget(l.budget), 0);

  return {
    newCount: statusCounts.new,
    openCount,
    pendingReplyCount,
    estimatedValue,
    totalCount: leads.length,
    statusCounts,
  };
}
