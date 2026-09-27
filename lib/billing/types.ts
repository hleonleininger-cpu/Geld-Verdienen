import type { BusinessPlan, SubscriptionStatus } from "@/types/database";

/**
 * Provider-Abstraktion (Phase 13): der Rest der App spricht ausschliesslich
 * mit diesem Interface, nie direkt mit einem Stripe-SDK/-Endpunkt. Ein
 * weiterer Anbieter (z. B. Paddle, Lemon Squeezy) müsste nur eine weitere
 * Implementierung dieses Interfaces liefern – keine Aenderung an
 * Dashboard/Actions/Webhook-Routing.
 */
export interface CheckoutSessionParams {
  businessId: string;
  plan: Exclude<BusinessPlan, "free">;
  customerId?: string | null;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export interface ProviderResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  plan: BusinessPlan | null;
  customerId: string;
  subscriptionId: string;
}

/** Ein vom Webhook geparstes, providerunabhaengiges Ereignis. */
export interface BillingWebhookEvent {
  type:
    | "checkout_completed"
    | "subscription_updated"
    | "subscription_deleted"
    | "unhandled";
  businessId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  plan: BusinessPlan | null;
  status: SubscriptionStatus | null;
}

export interface PaymentProvider {
  readonly name: string;
  /** false, solange keine echten Zugangsdaten konfiguriert sind. */
  isConfigured(): boolean;
  createCustomer(params: { businessId: string; email: string }): Promise<ProviderResult<{ customerId: string }>>;
  createCheckoutSession(params: CheckoutSessionParams): Promise<ProviderResult<{ url: string }>>;
  createPortalSession(params: PortalSessionParams): Promise<ProviderResult<{ url: string }>>;
  cancelSubscription(subscriptionId: string): Promise<ProviderResult<{ ok: true }>>;
  getSubscription(subscriptionId: string): Promise<ProviderResult<SubscriptionSnapshot>>;
  /**
   * Prueft die Signatur des Webhook-Requests und gibt ein normalisiertes
   * Event zurueck. Gibt `null` zurueck, wenn die Signatur ungueltig ist –
   * der Aufrufer MUSS das als 400/401 behandeln, niemals stillschweigend
   * verarbeiten ("webhooks as source of truth" nur bei verifizierter
   * Signatur).
   */
  verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<BillingWebhookEvent | null>;
}
