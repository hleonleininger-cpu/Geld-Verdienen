# Produkt-Flows: der Aktivierungs-Funnel

Dieses Dokument beschreibt den Kern-Funnel, den die Produkt-Phase abbildet:

```
VISITOR → SIGNUP → ONBOARDING → FIRST BUSINESS PAGE →
FIRST LEAD → FIRST QUOTE → FIRST WON CUSTOMER → PAID PLAN
```

Jeder Schritt referenziert die konkreten Dateien, damit Änderungen an
diesem Funnel gezielt vorgenommen werden können.

## 1. Visitor → Signup

- Landingpage (`app/page.tsx`) und `/pricing` verlinken auf `/register`.
- Referral-Klicks (`?ref=CODE`) werden im Middleware
  ([`lib/supabase/middleware.ts`](../lib/supabase/middleware.ts)) als
  30-Tage-Cookie (`ap_ref`) gemerkt und als `referral_events`-Zeile
  (`event_type = 'clicked'`) protokolliert.
- `app/(auth)/actions.ts` → `signUp()`: legt den Supabase-Auth-User an,
  trackt `analytics_events.signup`, leitet nach E-Mail-Bestätigung (oder
  sofort, falls deaktiviert) zu `/onboarding` weiter.

## 2. Onboarding (10 Schritte)

- [`app/onboarding/page.tsx`](../app/onboarding/page.tsx) +
  [`components/onboarding/OnboardingWizard.tsx`](../components/onboarding/OnboardingWizard.tsx)
  + [`app/onboarding/actions.ts`](../app/onboarding/actions.ts).
- **Idempotent & resumable**: jeder Schritt sucht das Business serverseitig
  über `owner_id` (nie über eine vom Client mitgeschickte ID), `
  onboarding_step` wird nur per `Math.max` vorwärts bewegt. Ein erneuter
  Besuch von Schritt 1 legt niemals ein zweites Business an.
- Schritt 1 legt das Business an (14-Tage-Trial startet hier, referral
  Cookie wird eingelöst → `referral_events.signed_up`), trackt
  `onboarding_started` + `trial_started`.
- Schritt 8 veröffentlicht die Seite (`published = true`) und trackt
  `business_page_published` – das ist **FIRST BUSINESS PAGE**.
- `onboardingComplete()` setzt `onboarding_completed_at`, trackt
  `onboarding_completed`, leitet zu `/dashboard`.

## 3. First Business Page

- [`app/[businessSlug]/page.tsx`](../app/[businessSlug]/page.tsx) – Hero,
  Leistungen (aus `services`), Galerie (`gallery_urls`), Öffnungszeiten
  (`opening_hours`), FAQ, Anfrageformular. Zeigt sich Besuchern nur, wenn
  `published = true` (der Owner selbst darf seine unveröffentlichte Seite
  als Vorschau sehen).
- Verwaltung: `/dashboard/profile` (Publish/Unpublish-Toggle, Galerie,
  Öffnungszeiten, Branding), `/dashboard/services` (Leistungskatalog).
- Die Aktivierungs-Checkliste im Dashboard
  ([`lib/activation.ts`](../lib/activation.ts) +
  [`components/dashboard/ActivationChecklist.tsx`](../components/dashboard/ActivationChecklist.tsx))
  bildet genau diesen Teil des Funnels als sichtbaren Fortschrittsbalken ab.

## 4. First Lead

- [`app/actions/leads.ts`](../app/actions/leads.ts) → `submitLead()`:
  öffentliches, anonymes Formular, Honeypot + DB-gestütztes
  Rate-Limiting, serverseitige Plan-Quote-Prüfung
  (`getLeadQuota`), trackt `lead_created`.
- Ein DB-Trigger (`log_lead_created_activity`, siehe
  `supabase/schema.sql`) erzeugt automatisch ein `activity_events`- und
  ein `notifications`-Row für den Owner – auch für anonyme Inserts, da der
  Trigger `SECURITY DEFINER` läuft.
- Sichtbar für den Owner in der Pipeline
  ([`app/dashboard/leads/page.tsx`](../app/dashboard/leads/page.tsx),
  Kanban + Liste) und im Benachrichtigungs-Center
  ([`app/dashboard/notifications/page.tsx`](../app/dashboard/notifications/page.tsx)).

## 5. First Quote

- Owner erstellt ein Angebot aus der Lead-Detailseite
  ([`components/dashboard/leads/QuoteForm.tsx`](../components/dashboard/leads/QuoteForm.tsx)
  → `createQuote()` in
  [`app/dashboard/leads/actions.ts`](../app/dashboard/leads/actions.ts)):
  Positionen, Rabatt, MwSt., wird als **Entwurf** gespeichert, trackt
  `quote_created`.
- `sendQuote()` versendet es (`status: sent`), schiebt den Lead in der
  Pipeline weiter, trackt `quote_sent`. Der Owner kopiert Link oder
  vorformulierte Nachricht
  ([`components/CopyLinkButton.tsx`](../components/CopyLinkButton.tsx),
  [`components/CopyMessageButton.tsx`](../components/CopyMessageButton.tsx)
  + [`lib/communication/templates.ts`](../lib/communication/templates.ts))
  von der druckbaren Ansicht `app/quotes/[quoteId]/page.tsx`.
- Der Kunde öffnet den öffentlichen, tokenbasierten Link
  ([`app/q/[token]/page.tsx`](../app/q/[token]/page.tsx) – Zugriff
  **ausschließlich** über die SECURITY-DEFINER-RPCs `get_public_quote` /
  `record_public_quote_event`, niemals über die fortlaufende `id`), sieht
  Positionen/Summe/Gültigkeit und kann annehmen oder ablehnen
  ([`components/public/QuoteActions.tsx`](../components/public/QuoteActions.tsx)
  → `app/q/[token]/actions.ts`).
- Jede Kundenaktion (angesehen/angenommen/abgelehnt) erzeugt automatisch
  ein `activity_events`- und `notifications`-Row und trackt
  `quote_viewed`/`quote_accepted`.

## 6. First Won Customer

- Ein angenommenes Angebot setzt den zugehörigen Lead automatisch auf
  `won` (innerhalb derselben RPC-Transaktion) und trackt `lead_won`.
- Ein Owner kann einen Lead auch manuell als gewonnen markieren
  ([`components/dashboard/leads/StatusActions.tsx`](../components/dashboard/leads/StatusActions.tsx)
  → `updateLeadStatus()`), trackt ebenfalls `lead_won`.
- Sichtbar in der Pipeline (Spalte "Gewonnen"), im Timeline-Verlauf
  ([`components/dashboard/ActivityTimeline.tsx`](../components/dashboard/ActivityTimeline.tsx))
  und als Teil der Aktivierungs-Checkliste.

## 7. Paid Plan

- `/dashboard/billing` ([`app/dashboard/billing/page.tsx`](../app/dashboard/billing/page.tsx))
  zeigt Trial-Status, aktuellen Plan und die drei bezahlten Pläne.
  `startCheckout()` trackt `checkout_started` und leitet zu Stripe
  Checkout weiter.
- Der Stripe-Webhook
  ([`app/api/webhooks/stripe/route.ts`](../app/api/webhooks/stripe/route.ts))
  ist die einzige Stelle, die `plan`/`subscription_status` tatsächlich auf
  bezahlt setzt, und trackt `subscription_started`. Details in
  [`docs/BILLING.md`](./BILLING.md).

## Admin-Sicht auf den gesamten Funnel

[`app/admin/page.tsx`](../app/admin/page.tsx) aggregiert alle oben
genannten `analytics_events` über die SQL-Funktion
`admin_funnel_counts` (eine Query, nach `event_name` gruppiert) und zeigt
sie mit einem Zeitraum-Filter (7/30/90 Tage/gesamt) als Balken-Funnel an –
so lässt sich pro Zeitraum sehen, wo Nutzer im Funnel abspringen.
