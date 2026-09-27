import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StripeProvider } from "@/lib/billing/stripe";

const SECRET = "whsec_test_secret";

async function sign(rawBody: string, timestamp: number, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  );
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${hex}`;
}

describe("StripeProvider.verifyWebhook", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.STRIPE_PRICE_BUSINESS = "price_business";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports itself as configured once all required env vars are set", () => {
    expect(new StripeProvider().isConfigured()).toBe(true);
  });

  it("reports itself as NOT configured when the webhook secret is missing", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(new StripeProvider().isConfigured()).toBe(false);
  });

  it("accepts a request with a valid signature and parses checkout.session.completed", async () => {
    const provider = new StripeProvider();
    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "biz_123",
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    });
    const header = await sign(body, Math.floor(Date.now() / 1000), SECRET);

    const event = await provider.verifyWebhook(body, header);
    expect(event).not.toBeNull();
    expect(event?.type).toBe("checkout_completed");
    expect(event?.businessId).toBe("biz_123");
    expect(event?.customerId).toBe("cus_123");
    expect(event?.subscriptionId).toBe("sub_123");
  });

  it("parses customer.subscription.updated and maps the price ID to a plan", async () => {
    const provider = new StripeProvider();
    const body = JSON.stringify({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          metadata: { business_id: "biz_123" },
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    });
    const header = await sign(body, Math.floor(Date.now() / 1000), SECRET);

    const event = await provider.verifyWebhook(body, header);
    expect(event?.type).toBe("subscription_updated");
    expect(event?.plan).toBe("pro");
    expect(event?.status).toBe("active");
  });

  it("rejects a request with an invalid signature", async () => {
    const provider = new StripeProvider();
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    const badHeader = await sign(body, Math.floor(Date.now() / 1000), "wrong-secret");

    const event = await provider.verifyWebhook(body, badHeader);
    expect(event).toBeNull();
  });

  it("rejects a request whose body was tampered with after signing", async () => {
    const provider = new StripeProvider();
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    const header = await sign(body, Math.floor(Date.now() / 1000), SECRET);

    const tamperedBody = body.replace("checkout.session.completed", "checkout.session.evil");
    const event = await provider.verifyWebhook(tamperedBody, header);
    expect(event).toBeNull();
  });

  it("rejects a stale timestamp outside the replay-protection window", async () => {
    const provider = new StripeProvider();
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const header = await sign(body, staleTimestamp, SECRET);

    const event = await provider.verifyWebhook(body, header);
    expect(event).toBeNull();
  });

  it("returns null when the provider is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const provider = new StripeProvider();
    const event = await provider.verifyWebhook("{}", "t=1,v1=abc");
    expect(event).toBeNull();
  });
});
