import { createClient } from "@/lib/supabase/server";
import type { ServiceRow } from "@/types/database";

export async function getServicesForBusiness(
  businessId: string,
  options: { activeOnly?: boolean } = {}
): Promise<ServiceRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (options.activeOnly) {
    query = query.eq("active", true);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getServiceById(serviceId: string): Promise<ServiceRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").eq("id", serviceId).maybeSingle();
  return data ?? null;
}
