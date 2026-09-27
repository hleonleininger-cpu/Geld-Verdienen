import { logger } from "@/lib/logger";
import type {
  BillingWebhookEvent,
  CheckoutSessionParams,
  PaymentProvider,
  PortalSessionParams,
  ProviderResult,
  SubscriptionSnapshot,
} from "@/lib/billing/types";
import type { BusinessPlan, SubscriptionStatus } from "@/types/database";

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Stripe-Implementierung von `PaymentProvider` (Phase 13). Bewusst per
 * `fetch` gegen die REST-API statt ueber das `stripe`-Node-SDK, damit sie
 * ohne Node-Kompatibilitaetsschicht auf Cloudflare Workers (OpenNext)
 * laeuft – keine zusaetzliche Laufzeitabhaengigkeit, kein Risiko durch
 * SDK-Interna, die auf `net`/`tls` setzen.
 *
 * Test-Modus: ein `sk_test_...`-Key verhaelt sich identisch zu
 * `sk_live_...`, nur gegen Stripes Test-Umgebung – "support test mode"
 * ist damit automatisch erfuellt, ohne eigene Fallunterscheidung.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";

  private get secretKey(): string | undefined {
    return process.env.STRIPE_SECRET_KEY;
  }

  private get webhookSecret(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }

  private get priceIds(): Partial<Record<Exclude<BusinessPlan, "free">, string>> {
    return {
      starter: process.env.STRIPE_PRICE_STARTER,
      pro: process.env.STRIPE_PRICE_PRO,
      business: process.env.STRIPE_PRICE_BUSINESS,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey && this.webhookSecret);
  }

  private planForPriceId(priceId: string | null | undefined): BusinessPlan | null {
    if (!priceId) return null;
    const entries = Object.entries(this.priceIds) as [Exclude<BusinessPlan, "free">, string | undefined][];
    for (const [plan, id] of entries) {
      if (id && id === priceId) return plan;
    }
    return null;
  }

  private async request(
    path: string,
    body: Record<string, string>,
    method: "POST" | "GET" | "DELETE" = "POST"
  ): Promise<{ ok: boolean; json: Record<string, unknown> }> {
    const secretKey = this.secretKey;
    if (!secretKey) {
      return { ok: false, json: { error: { message: "Stripe ist nicht konfiguriert." } } };
    }

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };
    if (method !== "GET" && Object.keys(body).length > 0) {
      init.body = new URLSearchParams(body).toString();
    }

    const query = method === "GET" && Object.keys(body).length > 0
      ? `?${new URLSearchParams(body).toString()}`
      : "";

    const response = await fetch(`${STRIPE_API}${path}${query}`, init);
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, json };
  }

  async createCustomer(params: { businessId: string; email: string }): Promise<ProviderResult<{ customerId: string }>> {
    const { ok, json } = await this.request("/customers", {
      email: params.email,
      "metadata[business_id]": params.businessId,
    });
    if (!ok || typeof json.id !== "string") {
      logger.error("billing.stripe", "createCustomer fehlgeschlagen", json.error);
      return { ok: false, error: "Kunde konnte nicht angelegt werden." };
    }
    return { ok: true, data: { customerId: json.id } };
  }

  async createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<ProviderResult<{ url: string }>> {
    const priceId = this.priceIds[params.plan];
    if (!priceId) {
      return { ok: false, error: `Kein Stripe-Preis für Plan "${params.plan}" konfiguriert.` };
    }

    const body: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.businessId,
      "subscription_data[metadata][business_id]": params.businessId,
      "metadata[business_id]": params.businessId,
    };
    if (params.customerId) {
      body.customer = params.customerId;
    } else {
      body.customer_email = params.customerEmail;
    }

    const { ok, json } = await this.request("/checkout/sessions", body);
    if (!ok || typeof json.url !== "string") {
      logger.error("billing.stripe", "createCheckoutSession fehlgeschlagen", json.error);
      return { ok: false, error: "Checkout konnte nicht gestartet werden." };
    }
    return { ok: true, data: { url: json.url } };
  }

  async createPortalSession(params: PortalSessionParams): Promise<ProviderResult<{ url: string }>> {
    const { ok, json } = await this.request("/billing_portal/sessions", {
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    if (!ok || typeof json.url !== "string") {
      logger.error("billing.stripe", "createPortalSession fehlgeschlagen", json.error);
      return { ok: false, error: "Kundenportal konnte nicht geöffnet werden." };
    }
    return { ok: true, data: { url: json.url } };
  }

  async cancelSubscription(subscriptionId: string): Promise<ProviderResult<{ ok: true }>> {
    const { ok, json } = await this.request(`/subscriptions/${subscriptionId}`, {}, "DELETE");
    if (!ok) {
      logger.error("billing.stripe", "cancelSubscription fehlgeschlagen", json.error);
      return { ok: false, error: "Kündigung fehlgeschlagen." };
    }
    return { ok: true, data: { ok: true } };
  }

  async getSubscription(subscriptionId: string): Promise<ProviderResult<SubscriptionSnapshot>> {
    const { ok, json } = await this.request(`/subscriptions/${subscriptionId}`, {}, "GET");
    if (!ok) {
      return { ok: false, error: "Abo konnte nicht geladen werden." };
    }
    return { ok: true, data: this.snapshotFromSubscription(json) };
  }

  private snapshotFromSubscription(subscription: Record<string, unknown>): SubscriptionSnapshot {
    const items = subscription.items as { data?: { price?: { id?: string } }[] } | undefined;
    const priceId = items?.data?.[0]?.price?.id ?? null;
    return {
      status: mapStripeStatus(String(subscription.status ?? "")),
      plan: this.planForPriceId(priceId),
      customerId: String(subscription.customer ?? ""),
      subscriptionId: String(subscription.id ?? ""),
    };
  }

  async verifyWebhook(
    rawBody: string,
    signatureHeader: string | null
  ): Promise<BillingWebhookEvent | null> {
    const secret = this.webhookSecret;
    if (!secret || !signatureHeader) return null;

    const isValid = await verifyStripeSignature(rawBody, signatureHeader, secret);
    if (!isValid) {
      logger.warn("billing.stripe", "Webhook-Signatur ungültig");
      return null;
    }

    let payload: { type?: string; data?: { object?: Record<string, unknown> } };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const type = payload.type ?? "";
    const object = payload.data?.object ?? {};

    if (type === "checkout.session.completed") {
      const businessId =
        typeof object.client_reference_id === "string"
          ? object.client_reference_id
          : (object.metadata as Record<string, string> | undefined)?.business_id ?? null;
      return {
        type: "checkout_completed",
        businessId,
        customerId: typeof object.customer === "string" ? object.customer : null,
        subscriptionId: typeof object.subscription === "string" ? object.subscription : null,
        plan: null,
        status: null,
      };
    }

    if (type === "customer.subscription.updated" || type === "customer.subscription.created") {
      const snapshot = this.snapshotFromSubscription(object);
      const metadata = object.metadata as Record<string, string> | undefined;
      return {
        type: "subscription_updated",
        businessId: metadata?.business_id ?? null,
        customerId: snapshot.customerId || null,
        subscriptionId: snapshot.subscriptionId || null,
        plan: snapshot.plan,
        status: snapshot.status,
      };
    }

    if (type === "customer.subscription.deleted") {
      const metadata = object.metadata as Record<string, string> | undefined;
      return {
        type: "subscription_deleted",
        businessId: metadata?.business_id ?? null,
        customerId: typeof object.customer === "string" ? object.customer : null,
        subscriptionId: typeof object.id === "string" ? object.id : null,
        plan: null,
        status: "canceled",
      };
    }

    return {
      type: "unhandled",
      businessId: null,
      customerId: null,
      subscriptionId: null,
      plan: null,
      status: null,
    };
  }
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  // Replay-Schutz: Events aelter als 5 Minuten werden abgelehnt (Stripe-
  // Empfehlung).
  const timestampSeconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqualHex(computedHex, expectedSig);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
