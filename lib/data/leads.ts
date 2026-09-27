import { createClient } from "@/lib/supabase/server";
import { parseBudget } from "@/lib/format";
import type { LeadRow, LeadStatus, LeadPriority, QuoteRow } from "@/types/database";

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

export interface PipelineFilters {
  search?: string;
  priority?: LeadPriority;
  sort?: "newest" | "oldest";
}

/**
 * Alle Leads eines Business fuer die Pipeline-Ansicht (Kanban + Liste,
 * Phase 7) – im Gegensatz zu `getLeadsPage` NICHT nach Status gefiltert
 * (die Kanban-Spalten zeigen alle Status gleichzeitig) und nicht seitenweise
 * paginiert, dafuer mit einer harten Obergrenze, damit ein Business mit
 * sehr vielen Leads die Seite nicht unbegrenzt aufblaeht.
 */
const PIPELINE_MAX_LEADS = 500;

export async function getLeadsForPipeline(
  businessId: string,
  filters: PipelineFilters = {}
): Promise<LeadRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: filters.sort === "oldest" })
    .limit(PIPELINE_MAX_LEADS);

  if (filters.search) {
    const term = filters.search.replace(/[%,]/g, "").trim();
    if (term) {
      query = query.or(`customer_name.ilike.%${term}%,service.ilike.%${term}%`);
    }
  }
  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  const { data } = await query;
  return data ?? [];
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

export type QuoteWithCustomer = QuoteRow & { customer_name: string };

/**
 * Liste aller Angebote eines Business fuer die zentrale Angebotsuebersicht
 * (`/dashboard/quotes`). Quotes haben keine eigene `business_id`-Spalte,
 * daher zuerst die Lead-IDs des Business laden und darueber filtern –
 * RLS (`quotes_select_own_business`) ist ohnehin die harte Grenze, das
 * hier ist nur fuer eine sinnvolle Query-Reihenfolge.
 */
export async function getQuotesForBusiness(businessId: string): Promise<QuoteWithCustomer[]> {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, customer_name")
    .eq("business_id", businessId);
  if (!leads || leads.length === 0) return [];

  const leadNameById = new Map(leads.map((l) => [l.id, l.customer_name]));
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .in("lead_id", leads.map((l) => l.id))
    .order("created_at", { ascending: false });

  return (quotes ?? []).map((q) => ({
    ...q,
    customer_name: leadNameById.get(q.lead_id) ?? "-",
  }));
}

export interface RevenueStats {
  openQuotesCount: number;
  acceptedQuotesCount: number;
  totalQuotesCount: number;
  /** Summe aus `price` aller ANGENOMMENEN Angebote – die tatsaechlich realisierte Umsatzschaetzung. */
  estimatedRevenueEUR: number;
}

/**
 * Kennzahlen fuer das umsatzorientierte Dashboard (Section 12): wie viele
 * Angebote sind offen (gesendet/angesehen), wie viele wurden angenommen,
 * und wie viel Umsatz steckt in den angenommenen Angeboten. Quotes haben
 * keine eigene `business_id` (siehe getQuotesForBusiness), daher derselbe
 * Zwei-Schritt-Ansatz ueber die Lead-IDs des Business.
 */
export async function getRevenueStats(businessId: string): Promise<RevenueStats> {
  const supabase = await createClient();
  const { data: leads } = await supabase.from("leads").select("id").eq("business_id", businessId);
  const leadIds = (leads ?? []).map((l) => l.id);
  if (leadIds.length === 0) {
    return { openQuotesCount: 0, acceptedQuotesCount: 0, totalQuotesCount: 0, estimatedRevenueEUR: 0 };
  }

  const { data: quotes } = await supabase
    .from("quotes")
    .select("status, price")
    .in("lead_id", leadIds);
  const rows = quotes ?? [];

  const openQuotesCount = rows.filter((q) => q.status === "sent" || q.status === "viewed").length;
  const acceptedQuotes = rows.filter((q) => q.status === "accepted");

  return {
    openQuotesCount,
    acceptedQuotesCount: acceptedQuotes.length,
    totalQuotesCount: rows.length,
    estimatedRevenueEUR: acceptedQuotes.reduce((sum, q) => sum + q.price, 0),
  };
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
    contacted: 0,
    qualified: 0,
    quote_sent: 0,
    negotiating: 0,
    won: 0,
    lost: 0,
  };
  for (const lead of leads) {
    statusCounts[lead.status] += 1;
  }

  const openCount =
    statusCounts.new + statusCounts.contacted + statusCounts.qualified +
    statusCounts.quote_sent + statusCounts.negotiating;
  const pendingReplyCount = statusCounts.new + statusCounts.contacted;
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
