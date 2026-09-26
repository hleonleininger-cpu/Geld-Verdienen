import { createClient } from "@/lib/supabase/server";
import { parseBudget } from "@/lib/format";
import type { LeadRow, QuoteRow } from "@/types/database";

export async function getLeadsForBusiness(businessId: string): Promise<LeadRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getLeadById(leadId: string): Promise<LeadRow | null> {
  const supabase = createClient();
  const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  return data ?? null;
}

export async function getQuotesForLead(leadId: string): Promise<QuoteRow[]> {
  const supabase = createClient();
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
}

export function computeStats(leads: LeadRow[]): DashboardStats {
  const newCount = leads.filter((l) => l.status === "new").length;
  const openCount = leads.filter((l) =>
    ["new", "in_progress", "quote_sent"].includes(l.status)
  ).length;
  const pendingReplyCount = leads.filter((l) =>
    ["new", "in_progress"].includes(l.status)
  ).length;
  const estimatedValue = leads
    .filter((l) => l.status !== "lost")
    .reduce((sum, l) => sum + parseBudget(l.budget), 0);

  return { newCount, openCount, pendingReplyCount, estimatedValue };
}
