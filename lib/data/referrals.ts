import { createClient } from "@/lib/supabase/server";

export interface ReferralStats {
  clicks: number;
  signups: number;
}

export async function getReferralStats(referralCode: string): Promise<ReferralStats> {
  const supabase = await createClient();
  const [{ count: clicks }, { count: signups }] = await Promise.all([
    supabase
      .from("referral_events")
      .select("id", { count: "exact", head: true })
      .eq("referral_code", referralCode)
      .eq("event_type", "clicked"),
    supabase
      .from("referral_events")
      .select("id", { count: "exact", head: true })
      .eq("referral_code", referralCode)
      .eq("event_type", "signed_up"),
  ]);

  return { clicks: clicks ?? 0, signups: signups ?? 0 };
}
