"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness, getCurrentUser } from "@/lib/data/business";
import { getPaymentProvider } from "@/lib/billing";
import { track } from "@/lib/analytics";
import type { BusinessPlan } from "@/types/database";

export type BillingActionState = { error?: string } | null;

const PAID_PLANS: Exclude<BusinessPlan, "free">[] = ["starter", "pro", "business"];

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function startCheckout(
  _prev: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const planRaw = String(formData.get("plan") ?? "");
  if (!PAID_PLANS.includes(planRaw as Exclude<BusinessPlan, "free">)) {
    return { error: "Ungültiger Plan." };
  }
  const plan = planRaw as Exclude<BusinessPlan, "free">;

  const [business, user] = await Promise.all([getCurrentBusiness(), getCurrentUser()]);
  if (!business || !user?.email) {
    return { error: "Bitte melde dich erneut an." };
  }

  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    return {
      error:
        "Die Bezahlfunktion ist aktuell nicht eingerichtet. Bitte kontaktiere uns, um upzugraden.",
    };
  }

  let customerId = business.stripe_customer_id;
  if (!customerId) {
    const created = await provider.createCustomer({ businessId: business.id, email: user.email });
    if (!created.ok || !created.data) {
      return { error: created.error ?? "Kunde konnte nicht angelegt werden." };
    }
    customerId = created.data.customerId;
    const supabase = await createClient();
    await supabase
      .from("businesses")
      .update({ stripe_customer_id: customerId })
      .eq("id", business.id);
  }

  const result = await provider.createCheckoutSession({
    businessId: business.id,
    plan,
    customerId,
    customerEmail: user.email,
    successUrl: `${siteUrl()}/dashboard/billing?checkout=success`,
    cancelUrl: `${siteUrl()}/dashboard/billing?checkout=cancelled`,
  });

  if (!result.ok || !result.data) {
    return { error: result.error ?? "Checkout konnte nicht gestartet werden." };
  }

  await track("checkout_started", { businessId: business.id, metadata: { plan } });

  redirect(result.data.url);
}

export async function openBillingPortal(
  _prev: BillingActionState,
  _formData: FormData
): Promise<BillingActionState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Bitte melde dich erneut an." };
  if (!business.stripe_customer_id) {
    return { error: "Du hast noch kein Abo. Wähle zunächst einen Plan." };
  }

  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    return { error: "Die Bezahlfunktion ist aktuell nicht eingerichtet." };
  }

  const result = await provider.createPortalSession({
    customerId: business.stripe_customer_id,
    returnUrl: `${siteUrl()}/dashboard/billing`,
  });

  if (!result.ok || !result.data) {
    return { error: result.error ?? "Kundenportal konnte nicht geöffnet werden." };
  }

  redirect(result.data.url);
}
