# Abrechnung (Stripe-Integration)

Diese Datei beschreibt, wie die Bezahlfunktion (Phase 13) aufgebaut ist und
wie sie in einem echten Supabase-/Stripe-Projekt eingerichtet wird.

## Architektur: `PaymentProvider`-Abstraktion

Der komplette Rest der App (Dashboard, Server Actions, Webhook-Route)
spricht ausschließlich mit dem Interface `PaymentProvider` in
[`lib/billing/types.ts`](../lib/billing/types.ts):

```ts
interface PaymentProvider {
  isConfigured(): boolean;
  createCustomer(...): Promise<ProviderResult<{ customerId: string }>>;
  createCheckoutSession(...): Promise<ProviderResult<{ url: string }>>;
  createPortalSession(...): Promise<ProviderResult<{ url: string }>>;
  cancelSubscription(...): Promise<ProviderResult<{ ok: true }>>;
  getSubscription(...): Promise<ProviderResult<SubscriptionSnapshot>>;
  verifyWebhook(rawBody, signatureHeader): Promise<BillingWebhookEvent | null>;
}
```

[`lib/billing/stripe.ts`](../lib/billing/stripe.ts) ist die einzige
Implementierung. [`lib/billing/index.ts`](../lib/billing/index.ts)
(`getPaymentProvider()`) ist die einzige Stelle, die eine konkrete
Implementierung instanziiert – ein zweiter Anbieter (Paddle, Lemon Squeezy,
…) würde nur diese eine Datei ändern, nie das Dashboard oder die
Webhook-Route.

**Warum kein `stripe`-npm-Paket?** Die Implementierung spricht Stripes
REST-API direkt per `fetch` an (Formular-kodierter Body, Bearer-Token) und
verifiziert Webhook-Signaturen manuell über die Web-Crypto-API
(`crypto.subtle`). Das funktioniert nativ in der Cloudflare-Workers-Runtime
(über `@opennextjs/cloudflare`), ohne Node-Kompatibilitätsschicht und ohne
zusätzliche Abhängigkeit. Getestet in
[`tests/unit/stripeWebhook.test.ts`](../tests/unit/stripeWebhook.test.ts)
(gültige/ungültige Signatur, manipulierter Body, abgelaufener Zeitstempel).

## "Webhooks as source of truth"

`businesses.plan`, `businesses.subscription_status` und
`businesses.stripe_subscription_id` werden **ausschließlich** von
[`app/api/webhooks/stripe/route.ts`](../app/api/webhooks/stripe/route.ts)
geschrieben – niemals vom Checkout-Redirect selbst (der ließe sich vom
Client fälschen). Die Route:

1. Verifiziert die Stripe-Signatur (`Stripe-Signature`-Header,
   HMAC-SHA256, 5-Minuten-Replay-Schutz).
2. Verarbeitet `checkout.session.completed` (laedt die frische
   Subscription nach und setzt Plan + Status),
   `customer.subscription.updated`/`.created` (aktualisiert Status/Plan
   aus der Subscription selbst) und `customer.subscription.deleted`
   (Status → `canceled`, Daten bleiben erhalten – siehe
   `docs/MONETIZATION.md`, "Nie Daten löschen").
3. Nutzt den Service-Role-Client (`lib/supabase/admin.ts`), weil hier kein
   eingeloggter Nutzer existiert.

Die Zuordnung Business ↔ Stripe-Event läuft primär über
`client_reference_id`/`subscription_data.metadata.business_id` (beim
Checkout gesetzt), mit Fallback auf `stripe_customer_id`, falls eine
Subscription ausnahmsweise ohne Metadaten ankommt (z. B. manuell in
Stripe angelegt).

## Webhook-Idempotenz

Stripe liefert Events "at least once" – dieselbe Event-ID kann mehrfach
(auch gleichzeitig) zugestellt werden. Bevor die Route irgendetwas
verarbeitet, reserviert sie die Event-ID per Insert in
`processed_webhook_events` (PRIMARY KEY). Schlägt der Insert wegen eines
Duplikats fehl (`23505`/unique_violation), wird die Zustellung
übersprungen (`{ received: true, duplicate: true }`), bevor z. B.
`track("subscription_started")` ein zweites Mal ausgelöst wird. Getestet
in [`supabase/tests/database/08_webhook_idempotency.test.sql`](../supabase/tests/database/08_webhook_idempotency.test.sql)
(erneuter Insert derselben ID schlägt fehl; kein anon-/authenticated-Zugriff
auf diese Tabelle).

## Abo kündigen

`/dashboard/billing` zeigt neben "Abo verwalten" (Stripe Customer Portal)
auch eine explizite "Abo kündigen"-Aktion mit Bestätigungsschritt
([`components/dashboard/billing/CancelSubscriptionButton.tsx`](../components/dashboard/billing/CancelSubscriptionButton.tsx)
→ `cancelSubscription()` in
[`app/dashboard/billing/actions.ts`](../app/dashboard/billing/actions.ts)).
Die Aktion ruft nur `DELETE /v1/subscriptions/{id}` bei Stripe auf (**sofortige**
Kündigung, keine Kulanz bis zum Periodenende) – der eigentliche
`subscription_status`-Wechsel in der DB passiert weiterhin ausschließlich
über den Webhook, nie direkt durch diese Server Action.

## Environment-Variablen

Alle optional – ohne sie läuft die App normal, `isConfigured()` liefert
`false`, `/dashboard/billing` zeigt einen "nicht eingerichtet"-Hinweis statt
funktionierender Checkout-Buttons, und die Webhook-Route beantwortet jeden
Request mit `{ received: false, reason: "not_configured" }` statt zu
crashen.

| Variable | Zweck |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` (Testmodus) oder `sk_live_...` (Produktion) |
| `STRIPE_WEBHOOK_SECRET` | Signing-Secret des Webhook-Endpunkts |
| `STRIPE_PRICE_STARTER` | Price-ID des Starter-Plans |
| `STRIPE_PRICE_PRO` | Price-ID des Pro-Plans |
| `STRIPE_PRICE_BUSINESS` | Price-ID des Business-Plans |

## Einrichtung in Stripe

1. Im Stripe-Dashboard drei wiederkehrende Preise anlegen (Starter/Pro/
   Business) und deren Price-IDs in die drei `STRIPE_PRICE_*`-Variablen
   eintragen.
2. Unter **Developers → Webhooks** einen Endpunkt auf
   `https://DEINE-DOMAIN/api/webhooks/stripe` anlegen und mindestens diese
   Events abonnieren: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.created`,
   `customer.subscription.deleted`. Das dabei angezeigte Signing-Secret
   (`whsec_...`) in `STRIPE_WEBHOOK_SECRET` eintragen.
3. **Customer Portal** aktivieren (Stripe Dashboard → Settings → Billing →
   Customer portal), da `/dashboard/billing` darüber Kündigung/
   Zahlungsmethode/Rechnungen verwaltet.

## Testmodus

Ein `sk_test_...`-Key verhält sich identisch zu einem Live-Key, nur gegen
Stripes Test-Umgebung – kein separater Code-Pfad nötig. Zum lokalen Testen
von Webhooks eignet sich die Stripe CLI (`stripe listen --forward-to
localhost:3000/api/webhooks/stripe`).

## Nie vergessen

- Es werden **niemals** Kartendaten in dieser App gespeichert – der
  gesamte Zahlungsvorgang läuft über Stripe Checkout/Customer Portal
  (gehostete Stripe-Seiten).
- Produktions-Zahlungen werden **niemals** allein dadurch aktiv, dass der
  Code existiert – ohne echte `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`
  passiert schlicht nichts.
- Der Server vertraut **nie** dem Client für bezahlte Features – jeder
  Gate-Check läuft über `lib/entitlements.ts` gegen den in der DB
  gespeicherten (webhook-geschriebenen) Zustand.
