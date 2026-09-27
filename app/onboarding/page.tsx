import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentBusiness } from "@/lib/data/business";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await getCurrentBusiness();
  if (business?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  let serviceCount = 0;
  if (business) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id);
    serviceCount = count ?? 0;
  }

  return <OnboardingWizard initialBusiness={business} initialServiceCount={serviceCount} />;
}
