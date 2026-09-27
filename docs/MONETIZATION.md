# Monetarisierung: Pläne, Trial, Feature-Gating

## Pläne

Vier Pläne, definiert in [`lib/entitlements.ts`](../lib/entitlements.ts)
(`PLAN_FEATURES`) und in [`lib/pricing.ts`](../lib/pricing.ts) (Marketing-
Darstellung auf `/pricing`):

| Plan | Preis | Leads/Monat | Branding | Erweiterte Auswertungen |
| --- | --- | --- | --- | --- |
| Free | 0 € | 5 | ✕ | ✕ |
| Starter | 9 € | unbegrenzt | ✓ | ✕ |
| Pro | 19 € | unbegrenzt | ✓ | ✓ |
| Business | 39 € | unbegrenzt | ✓ | ✓ |

## Trial

- 14 Tage (`TRIAL_LENGTH_DAYS`), startet automatisch bei der
  Business-Anlage in Onboarding-Schritt 1
  ([`app/onboarding/actions.ts`](../app/onboarding/actions.ts),
  `onboardingStep1`): `trial_started_at`/`trial_ends_at` werden gesetzt,
  `subscription_status = 'trialing'`.
- Während der Testphase gilt der volle **Pro**-Funktionsumfang
  (`TRIAL_PLAN = "pro"`), unabhängig vom später gebuchten Plan.
- **Lazy Evaluation statt Cron**: Es gibt keinen Hintergrundjob, der einen
  abgelaufenen Trial "abräumt". `getEffectivePlanInfo()` berechnet bei
  jedem Lesezugriff live, ob die Testphase noch läuft
  (`trial_ends_at > now()`). Cloudflare Workers/Serverless-Umgebungen
  garantieren keinen Cron – dieses Muster braucht keinen.
- Läuft die Testphase ab, ohne dass ein Abo aktiv wurde, fällt der Plan
  automatisch auf `free` zurück. **Es werden dabei niemals Daten
  gelöscht** – nur der Funktionsumfang ändert sich. Dasselbe gilt für eine
  gekündigte (`canceled`) oder überfällige (`past_due`) Subscription.

## Was tatsächlich durchgesetzt wird (ehrlich, nicht nur definiert)

`PLAN_FEATURES` enthält mehr Flags, als die App heute tatsächlich prüft.
Das ist bewusst so dokumentiert (siehe Kommentar direkt in
`lib/entitlements.ts`), damit niemand annimmt, ein Flag würde bereits
etwas Reales steuern, nur weil es in der Tabelle steht.

**Tatsächlich durchgesetzt:**

- `max_leads_per_month` – harte Grenze im öffentlichen Anfrageformular
  ([`app/actions/leads.ts`](../app/actions/leads.ts), `submitLead`):
  `getLeadQuota()` wird **serverseitig** vor jedem Insert geprüft, neue
  Anfragen werden über dem Limit mit einer Fehlermeldung abgelehnt. Der
  `UsageMeter` im Dashboard zeigt den Verbrauch.
- `custom_branding` – die Akzentfarbe der Mini-Site
  ([`app/dashboard/actions.ts`](../app/dashboard/actions.ts),
  `updateBusinessProfile`) wird nur gespeichert/angewendet, wenn
  `hasFeature(business, "custom_branding")` wahr ist. Eine bereits
  gesetzte Farbe bleibt beim Downgrade in der DB erhalten, wird auf der
  öffentlichen Seite aber nicht mehr gerendert.
- `advanced_analytics` – wird von `hasFeature()` korrekt berechnet und ist
  bereit für ein zukünftiges erweitertes Analytics-Widget im Dashboard.

**Nur vorbereitet, gaten aber (noch) nichts Reales:**

- `max_team_members` – kein Team-/Rollen-Modell existiert.
- `custom_forms` – kein Formular-Builder existiert.
- `calendar` – kein Kalender/Termine existiert (bewusst aus dieser Phase
  ausgeklammert).
- `file_storage_limit_mb` – es gibt noch keine Speicherplatz-Zählung pro
  Business.

## Zentrale Gate-Schicht statt verstreuter Checks

Jeder Plan-Check läuft über `lib/entitlements.ts`
(`getEffectivePlanInfo`, `hasFeature`, `getLeadQuota`) – es gibt bewusst
keine verstreuten `if (business.plan === "pro")`-Abfragen in einzelnen
Komponenten. UI-Bausteine dafür:

- `components/dashboard/TrialBanner.tsx` – Resttage der Testphase /
  Hinweis nach Ablauf
- `components/dashboard/UsageMeter.tsx` – Lead-Kontingent-Anzeige
- `components/dashboard/PlanBadge.tsx` – aktueller Plan im Dashboard-Header
- `components/dashboard/UpgradeBanner.tsx` / `FeatureGate.tsx` –
  generischer Upsell-Hinweis für ein gesperrtes Feature

Siehe [`docs/BILLING.md`](./BILLING.md) für die Stripe-Anbindung, über die
`plan`/`subscription_status` tatsächlich geschrieben werden.
