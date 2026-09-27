import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/billing";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Stripe-Webhook (Phase 13): einziger Ort, an dem `plan`/
 * `subscription_status`/`stripe_subscription_id` eines Business auf einen
 * bezahlten Zustand gesetzt werden ("webhooks as source of truth" – niemals
 * der Checkout-Redirect selbst, der laesst sich vom Client faelschen).
 *
 * Nutzt den Service-Role-Client, weil hier kein eingeloggter Nutzer
 * existiert (Server-zu-Server-Aufruf von Stripe) und RLS raus muss, um das
 * betroffene Business ueberhaupt zu finden/aktualisieren.
 */
export async function POST(request: Request): Promise<Response> {
  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    // Kein Fehler: in Umgebungen ohne Stripe-Konfiguration soll dieser
    // Endpunkt einfach nichts tun, statt beim Start zu crashen.
    return NextResponse.json({ received: false, reason: "not_configured" }, { status: 200 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  const event = await provider.verifyWebhook(rawBody, signature);
  if (!event) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "unhandled") {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  try {
    if (event.type === "checkout_completed") {
      if (!event.businessId || !event.subscriptionId) {
        return NextResponse.json({ received: true });
      }
      const snapshot = await provider.getSubscription(event.subscriptionId);
      if (snapshot.ok && snapshot.data) {
        await supabase
          .from("businesses")
          .update({
            stripe_customer_id: event.customerId ?? snapshot.data.customerId,
            stripe_subscription_id: snapshot.data.subscriptionId,
            subscription_status: snapshot.data.status,
            ...(snapshot.data.plan ? { plan: snapshot.data.plan } : {}),
          })
          .eq("id", event.businessId);

        if (snapshot.data.status === "active") {
          await track("subscription_started", {
            businessId: event.businessId,
            metadata: snapshot.data.plan ? { plan: snapshot.data.plan } : undefined,
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (event.type === "subscription_updated" || event.type === "subscription_deleted") {
      const update = {
        subscription_status: event.status ?? "none",
        ...(event.plan ? { plan: event.plan } : {}),
        ...(event.subscriptionId ? { stripe_subscription_id: event.subscriptionId } : {}),
      };

      if (event.businessId) {
        await supabase.from("businesses").update(update).eq("id", event.businessId);
      } else if (event.customerId) {
        // Fallback, falls die Subscription-Metadaten ausnahmsweise kein
        // `business_id` tragen (z. B. manuell in Stripe angelegtes Abo):
        // ueber die gespeicherte `stripe_customer_id` auflösen.
        await supabase
          .from("businesses")
          .update(update)
          .eq("stripe_customer_id", event.customerId);
      }
      return NextResponse.json({ received: true });
    }
  } catch (error) {
    logger.error("billing.webhook", "Verarbeitung fehlgeschlagen", error);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
