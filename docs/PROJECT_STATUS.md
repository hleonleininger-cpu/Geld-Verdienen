# Project Status

Stand: **Produkt-Phase** abgeschlossen (nach MVP + Production-Hardening-
Pass, siehe Historie weiter unten). AnfragePilot bildet jetzt den
kompletten Aktivierungs-Funnel ab: Onboarding-Wizard → Aktivierungs-
Checkliste → öffentliche Mini-Site → Lead-Pipeline → Angebots-Workflow
mit Kunden-Portal → Plan-/Trial-Gating → Stripe-Abrechnung → Produkt-
Analytics. Details je Schritt in `docs/PRODUCT_FLOWS.md`.

## Produkt-Phase: was neu hinzukam

- **Onboarding** (`app/onboarding/`): 10-Schritte-Wizard, idempotent und
  resumable (Business wird immer über `owner_id` gesucht, `onboarding_step`
  bewegt sich nur per `Math.max` vorwärts – kein Doppel-Anlegen bei
  erneutem Besuch).
- **Aktivierungs-Checkliste** (`lib/activation.ts` +
  `components/dashboard/ActivationChecklist.tsx`): bildet den Funnel als
  sichtbaren Fortschritt im Dashboard ab.
- **Öffentliche Mini-Site** (`app/[businessSlug]/page.tsx`): Hero,
  Leistungen, Galerie (Storage-Bucket `gallery`), Öffnungszeiten, FAQ,
  Anfrageformular, Publish/Unpublish-Toggle, SEO/OG-Metadaten.
- **Lead-Pipeline** (`app/dashboard/leads/`): Kanban (natives HTML5-DnD,
  server-verifizierter Statuswechsel) + Listenansicht, Filter nach
  Suche/Priorität, Sortierung.
- **Voller Angebots-Workflow** (`app/dashboard/leads/actions.ts`,
  `app/quotes/[quoteId]/`, `app/q/[token]/`): Entwurf → Versendet →
  Angesehen → Angenommen/Abgelehnt/Abgelaufen, Positionen mit Menge/
  Einzelpreis/Rabatt/MwSt., öffentliches Kunden-Portal ausschließlich über
  `public_token` + zwei `SECURITY DEFINER`-RPCs (nie direkte Tabellen-
  Policies).
- **Timeline & Benachrichtigungen** (`activity_events`/`notifications`,
  `components/dashboard/ActivityTimeline.tsx`,
  `app/dashboard/notifications/`).
- **Plan-/Trial-/Feature-Gating** (`lib/entitlements.ts`) – zentrale
  Schicht statt verstreuter Checks; ehrlich dokumentiert, welche Flags
  tatsächlich etwas durchsetzen (siehe `docs/MONETIZATION.md`).
- **Abrechnung** (`lib/billing/`, `app/dashboard/billing/`,
  `app/api/webhooks/stripe/route.ts`): `PaymentProvider`-Abstraktion,
  Stripe per `fetch` (kein SDK, Cloudflare-Workers-kompatibel), Webhook als
  einzige Quelle der Wahrheit für Plan/Abo-Status. Siehe `docs/BILLING.md`.
- **Referrals**: Codes, Klick-/Signup-Tracking, eigene Statistik im Profil.
- **Produkt-Analytics + Admin-Wachstums-Dashboard**: `lib/analytics.ts`
  (`track()`), `admin_funnel_counts`-SQL-Aggregation, Zeitraum-Filter
  (7/30/90/gesamt) in `/admin`.
- **Kommunikations-Vorlagen** (`lib/communication/`): `MessageProvider`-
  Abstraktion, aktuell `ClipboardProvider` (Copy-to-Clipboard einer
  vorformulierten Angebots-Nachricht), swap-bar auf einen echten Versand
  später.
- **Neue Tests**: `tests/unit/quotes.test.ts`,
  `tests/unit/entitlements.test.ts`, `tests/unit/stripeWebhook.test.ts`,
  `tests/unit/communicationTemplates.test.ts`, erweitertes
  `tests/unit/validation.test.ts`; pgTAP
  `05_public_quote_portal.test.sql` + `06_product_phase_rls.test.sql`.

Bewusst **nicht** bzw. nur reduziert umgesetzt (siehe FINAL-RULE-Abwägung
in `docs/MONETIZATION.md`/`docs/ARCHITECTURE.md`): Kalender/Termine,
individueller Formular-Builder, mehrere Teammitglieder, Shop-Checkout-
Überarbeitung, ein separater Demo-Modus. Diese hätten keinen der sechs
Leitkriterien (erster Wert, Zeitersparnis, Kundengewinnung, Kunden-
verwaltung, leichteres Bezahlen, leichtere Bindung) stark genug bedient,
um den Umfang in dieser Phase zu rechtfertigen.

## Historie: Production-Hardening-Pass (vorherige Phase)

Stand damals: Production-Hardening-Pass abgeschlossen (nach MVP-Tasks 1–17).

### Was in diesem Pass gemacht wurde

1. **Architektur-Audit & Entscheidung** – siehe
   `docs/DEPLOYMENT_ARCHITECTURE.md`. Wechsel von Cloudflare Pages +
   `@cloudflare/next-on-pages` (vom Anbieter selbst als abgelöst markiert)
   zu Cloudflare Workers + `@opennextjs/cloudflare` (offizieller
   Nachfolger, stabil, kein Beta). `vinext` (Cloudflares neuester,
   Vite-basierter Weg) wurde geprüft und bewusst **nicht** gewählt: Beta-
   Status, erfordert Next 16 ohnehin, ersetzt den kompletten Next.js-Build
   durch eine Reimplementierung – zu hohes Risiko für eine produktive
   SaaS-Codebase mit Kundendaten.
2. **Next.js-Upgrade:** 14.2.35 → 16.3.6, React 18 → 19. Async-Request-APIs
   (`cookies()`, `params`, `searchParams`) überall auf `await` umgestellt,
   `useFormState` → `useActionState`, `middleware.ts` → `proxy.ts`
   (Next-16-Umbenennung), `next lint` (entfernt in Next 16) → direktes
   ESLint mit Flat Config.
3. **Supabase-Client-Upgrade:** `@supabase/ssr` 0.5.2 → 0.12.7,
   `@supabase/supabase-js` 2.45.4 → 2.117.2 (behebt gemeldete
   Sicherheitslücken der alten Versionen). Umstellung der Cookie-Handhabung
   auf die aktuell empfohlene `getAll`/`setAll`-API. Die handgeschriebenen
   DB-Typen in `types/database.ts` mussten von `interface` auf `type`
   umgestellt werden (TypeScript-Detail, siehe Kommentar in der Datei) –
   sonst typisiert die neue Client-Generik jede Query fälschlich als
   `never`.
4. **Vollständiger RLS-Sicherheitsaudit** – siehe `docs/SECURITY.md` für
   alle Details. Kernfunde: fehlendes `WITH CHECK` auf UPDATE-Policies
   (Cross-Tenant-Injection über Umbiegen von Fremdschlüsseln möglich),
   `businesses_select_public` unvollständig (Bugfix), Storage-Policy ohne
   Pfad-/Größen-/Typ-Validierung.
5. **Autorisierungs-Audit** der Server Actions: Open-Redirect im
   Login-Flow gefunden und behoben, explizite Ownership-Checks zusätzlich
   zu RLS ergänzt, rohe DB-Fehlermeldungen nicht mehr an den Client
   durchgereicht.
6. **Rate-Limiting** fürs öffentliche Anfrageformular (DB-Tabelle +
   `SECURITY DEFINER`-Funktion, keine externe/kostenpflichtige API).
7. **Admin-Autorisierung** von reinem `ADMIN_EMAILS`-Env-Var auf
   DB-gestütztes `public.users.is_admin`-Flag umgestellt (Env-Var bleibt
   als Server-only-Bootstrap-Fallback).
8. **Datenbank-Qualität:** `updated_at`-Spalten + Trigger, `CHECK`-
   Constraints für Textlängen/-formate, ein Composite-Index für den
   häufigsten Dashboard-Query, ein partieller Index für die
   Erinnerungs-Anzeige. Migrationshistorie unter `supabase/migrations/`
   nachgezogen (`0001_initial_schema.sql`, `0002_production_hardening.sql`).
9. **pgTAP-RLS-Tests** unter `supabase/tests/database/` (Allow/Deny für
   Cross-Tenant-Zugriffe, WITH-CHECK-Regressionstests, Storage-Pfade) –
   **nicht in dieser Sandbox ausgeführt**, da kein laufender Docker-Daemon
   verfügbar war (`supabase start` benötigt Docker). Vor produktivem
   Vertrauen bitte lokal mit `supabase test db` verifizieren.
10. **Fehler-/Lade-/Leerzustände:** `app/error.tsx`, `app/global-error.tsx`,
    `app/dashboard/error.tsx`, mehrere `loading.tsx`-Skeletons.
    **Wichtiger Fund dabei:** ein dokumentierter Next.js-Framework-Bug
    (`notFound()` liefert 200 statt 404, wenn ein `loading.tsx`-Geschwister
    existiert) wurde entdeckt und durch gezieltes Entfernen der
    betroffenen zwei `loading.tsx`-Dateien behoben (siehe unten,
    "Verifiziert").
11. **Logging-Strategie:** `lib/logger.ts` (server-only, loggt nie
    Passwörter/Tokens/Service-Keys, keine unnötigen Kundendaten).
12. **Performance:** Paginierung der Lead-Liste (`getLeadsPage`,
    Range-Query statt "alles laden"), schlanke Projektion für
    Dashboard-Kennzahlen (`status, budget` statt `*`), parallele statt
    sequenzielle Datenbank-Abfragen wo möglich.
13. **SEO:** `robots.ts`, `sitemap.ts` (inkl. aller öffentlichen
    Business-Seiten), Open-Graph-Metadaten, `noindex` für
    Dashboard/Admin/Auth/Quotes.
14. **Legal/Privacy-Grundlage:** `/datenschutz`- und `/agb`-Seiten mit
    klar gekennzeichneten Platzhaltern (keine Rechtsberatung – siehe
    Hinweis auf den Seiten selbst), Daten-Export
    (`/dashboard/export`), Unternehmens- und Konto-Löschung
    (`app/dashboard/danger-actions.ts`, UI in "Profil" →
    "Gefahrenzone").
15. **Tests:** Vitest-Setup mit 50 Unit-Tests für reine Logik
    (Validierung, Formatierung, Antwortgenerator, Open-Redirect-Schutz,
    Branchen-Empfehlungen).

## Verifiziert (Produkt-Phase, in dieser Sandbox erfolgreich ausgeführt)

Nach **jedem** der oben genannten Arbeitsschritte, nicht nur am Ende:

- `npm run typecheck` – grün
- `npm run lint` – grün
- `npm test` (Vitest, 82 Tests) – grün
- `npm run build` (regulärer Next.js-Build) – grün
- `npm run cf:build` (`@opennextjs/cloudflare`) – grün, erzeugt
  `.open-next/worker.js` (bestätigt insbesondere, dass die Stripe-
  Integration ohne Node-SDK/Node-Kompatibilitätsschicht in der
  Workers-Runtime bündelt)

## Verifiziert (Production-Hardening-Pass, historisch)

- `npm run typecheck` – grün
- `npm run lint` – grün
- `npm test` (Vitest, 50 Tests) – grün
- `npm run build` (regulärer Next.js-Build) – grün
- `npm run cf:build` (`@opennextjs/cloudflare`) – grün, erzeugt
  `.open-next/worker.js`
- Smoke-Test gegen `next start` (Produktions-Modus): Landing-Page, Preise,
  Shop, Login/Register/Reset, Datenschutz/AGB, `robots.txt`,
  `sitemap.xml`, geschützte Redirects (`/dashboard`, `/admin` →
  `/login?redirectTo=...`), korrekter 404-Status für unbekannte
  Business-Slugs

## NICHT in dieser Sandbox verifiziert

- **pgTAP-RLS-Tests** (`supabase/tests/database/`, inkl. der beiden neuen
  Dateien `05_public_quote_portal.test.sql`/
  `06_product_phase_rls.test.sql`): kein Docker/`supabase`-CLI in dieser
  Sandbox verfügbar (`supabase: command not found`).
- **Live-Supabase-Integrationstests** (echter Login-Flow, echtes
  Datei-/Galerie-Upload, echte E-Mail-Zustellung): keine echten Supabase-
  Zugangsdaten in dieser Sandbox vorhanden.
- **Echte Stripe-Integration** (echter Checkout, echter Webhook-Empfang):
  keine echten Stripe-Zugangsdaten in dieser Sandbox; die
  Signaturprüfung/Event-Verarbeitung selbst ist über
  `tests/unit/stripeWebhook.test.ts` mit synthetisch signierten Payloads
  abgedeckt, ein Ende-zu-Ende-Test gegen die echte Stripe-API jedoch nicht.
- **Echtes Cloudflare-Deployment** (`wrangler deploy`): erfordert einen
  echten Cloudflare-Account; nur der lokale Build (`cf:build`) wurde
  verifiziert.
- **Browser-Smoke-Test mit echtem DOM/Konsole** (Playwright/Chrome): keine
  Display-/Browser-Umgebung in dieser Sandbox; die Verifikation lief über
  die Build-/Typecheck-/Test-Garantien oben.

## Bekannte Grenzen (bewusste Einschränkungen)

- Kein Mehrbenutzer-/Rollenmodell (nur 1 Owner pro Business) – betrifft
  auch die neuen Tabellen (`services`, `activity_events`, …).
- Shop-Checkout bleibt eine reine Produktdarstellung ohne echten Kauf.
- `/datenschutz` und `/agb` sind technische Gerüste mit Platzhaltern, keine
  fertigen Rechtstexte.
- Kalender/Termine, individueller Formular-Builder, Team-Mitglieder:
  Plan-Feature-Flags dafür existieren in `lib/entitlements.ts`, gaten aber
  nichts Reales (siehe `docs/MONETIZATION.md`).
- Kein echter Nachrichtenversand (E-Mail/SMS/WhatsApp) – nur
  Copy-to-Clipboard-Vorlagen (`lib/communication/`).
- Admin-Branchen-Auswertung tallyt weiterhin clientseitig aus einer
  ungefilterten Query – für die aktuelle Datenmenge unkritisch (siehe
  `docs/ARCHITECTURE.md`); der Aktivierungs-Funnel selbst nutzt bereits
  eine SQL-Aggregat-Funktion.
- Es gibt bislang keine dedizierte Race-Condition-Absicherung für
  gleichzeitiges Annehmen/Ablehnen desselben Angebots aus zwei Tabs –
  die RPC prüft den Status atomar innerhalb einer einzigen Transaktion,
  ein doppelter Klick führt also bestenfalls zu einem abgelehnten zweiten
  Versuch (`invalid_transition`), nicht zu inkonsistenten Daten.

## `npm audit`-Befund (Stand dieses Passes)

Alle verbleibenden Findings betreffen ausschließlich `devDependencies`
(Vitest 2.x zieht ältere `vite`/`esbuild`-Versionen mit bekannten
CVEs). Diese sind:

- Nur beim lokalen Testlauf (`vitest run`) relevant, niemals im
  ausgelieferten Produktionscode enthalten.
- Betreffen Dev-Server-spezifische Angriffsszenarien (z. B. ein exponierter
  Vite-Dev-Server), die in unserem Nutzungsmuster (`vitest run` in
  CI/lokal, kein exponierter Dev-Server) nicht greifen.
- Ein Fix würde einen Sprung auf Vitest 5.x erfordern (deutlich neuere
  Major-Version) – das wurde bewusst zurückgestellt, um in diesem bereits
  umfangreichen Upgrade-Pass nicht zusätzliches, unnötiges Versionsrisiko
  in einem für die Produktion irrelevanten Tooling-Pfad einzugehen (siehe
  Anweisung "Avoid unnecessary major-library changes that provide no
  benefit").

Next.js selbst läuft auf der aktuellen stabilen 16.3.x-Linie ohne offene
`npm audit`-Findings.

## Empfohlene nächste Schritte

1. `supabase test db` lokal (mit Docker) laufen lassen und pgTAP-Ergebnisse
   verifizieren (inkl. der beiden neuen Testdateien), bevor produktiv
   "scharf" geschaltet wird.
2. Echtes Supabase-Projekt aufsetzen, `supabase/schema.sql` ausführen,
   Onboarding-/Angebots-/Portal-Flows manuell in einem echten Browser
   testen (insbesondere den öffentlichen `/q/[token]`-Annahme-Flow).
3. Falls Bezahlung genutzt werden soll: Stripe-Testmodus-Keys eintragen,
   Webhook-Endpunkt anlegen, einen kompletten Test-Checkout durchspielen
   (siehe `docs/BILLING.md`), erst danach auf Live-Keys wechseln.
4. `/datenschutz` und `/agb` von einer Rechtsberatung ausfüllen lassen.
5. Ersten Admin-Account über `is_admin = true` markieren (siehe
   `docs/SECURITY.md`).
6. `vinext` in einigen Monaten erneut evaluieren, falls es den
   Beta-Status verlässt und ein dokumentierter Migrationsweg von
   `@opennextjs/cloudflare` existiert.
