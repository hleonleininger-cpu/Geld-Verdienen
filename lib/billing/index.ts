import { StripeProvider } from "@/lib/billing/stripe";
import type { PaymentProvider } from "@/lib/billing/types";

export type { PaymentProvider } from "@/lib/billing/types";
export type {
  BillingWebhookEvent,
  CheckoutSessionParams,
  PortalSessionParams,
  ProviderResult,
  SubscriptionSnapshot,
} from "@/lib/billing/types";

/**
 * Stripe wird nur als aktiver Provider zurückgegeben, wenn tatsächlich
 * Zugangsdaten konfiguriert sind ("never activate production payments
 * merely because code exists"). Ohne konfigurierte Keys liefert
 * `isConfigured()` `false` und jede Methode einen ehrlichen Fehler statt
 * eines Crashes – das Dashboard zeigt dann einen "Abrechnung noch nicht
 * eingerichtet"-Hinweis statt eines kaputten Buttons.
 */
export function getPaymentProvider(): PaymentProvider {
  return new StripeProvider();
}
