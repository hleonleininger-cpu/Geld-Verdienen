import { createClient } from "@/lib/supabase/server";
import type { BusinessRow } from "@/types/database";

export async function getCurrentUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentBusiness(): Promise<BusinessRow | null> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  return data ?? null;
}
