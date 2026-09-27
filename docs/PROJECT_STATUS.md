# Project Status

Stand: **Production-Readiness-Audit** abgeschlossen (nach
Conversion-Funnel-Phase + Produkt-Phase + Production-Hardening-Pass, siehe
Historie weiter unten). AnfragePilot bildet den vollständigen Kunden-Funnel
ab: BESUCHER → BUSINESS-SEITE → ANFRAGE → LEAD → BENACHRICHTIGUNG →
ANTWORT → ANGEBOT → KUNDE SIEHT ANGEBOT → KUNDE NIMMT AN → TERMIN →
GEWONNEN. Details je Schritt in `docs/PRODUCT_FLOWS.md`.

## Production-Readiness-Audit: was gefunden und behoben wurde

Ziel dieses Passes war NICHT, neue Features zu bauen, sondern zu prüfen,
ob die Conversion-Funnel-Phase tatsächlich so funktioniert wie
dokumentiert, und alles zu schließen, was einen ersten zahlenden Kunden
verhindern würde. Migration `0005_entitlement_hardening.sql`:

- **`custom_forms`-Feature war nicht auf DB-Ebene durchgesetzt** (im
  Gegensatz zu `calendar`, das von Anfang an `business_has_calendar_feature()`
  nutzte): ein Free-Plan-Nutzer hätte per direktem, an der Next.js-App
  vorbeigehendem PostgREST-Request (eigener JWT) ein Formular anlegen und
  veröffentlichen können. Fix: neue Funktion
  `business_has_custom_forms_feature()`, zusätzlich in der `WITH CHECK`-
  Klausel von `request_forms_insert_own` geprüft. Nur das Anlegen ist
  gegated, nicht das Bearbeiten (Downgrade darf bestehende Formulare nicht
  unbrauchbar machen). Siehe `docs/SECURITY.md`, Abschnitt 1b.
- **`businesses.owner_id` hatte keine UNIQUE-Constraint**: ein doppeltes/
  gleichzeitiges Absenden von Onboarding-Schritt 1 hätte zwei Business-
  Zeilen für denselben Nutzer anlegen können, wonach `getCurrentBusiness()`
  (`.maybeSingle()`) mit einem Fehler abbricht und den Nutzer aus dem
  eigenen Dashboard aussperrt. Fix: `unique (owner_id)`. `supabase/seed.sql`
  musste entsprechend auf ein einzelnes Demo-Unternehmen reduziert werden
  (alle 5 Branchen weiterhin unter `/demo` ansehbar).
- **`app/sitemap.ts` listete unveröffentlichte und (potenzielle) Demo-
  Businesses**: kein Datenleck (die Seite selbst gated bereits korrekt auf
  `published`), aber schlecht für SEO (Suchmaschinen bekommen URLs, die
  404 liefern). Fix: `.eq("published", true).eq("is_demo", false)`.
  `/demo` zur Sitemap ergänzt, `/onboarding` und `/api/` zu `robots.ts`s
  Disallow-Liste ergänzt.
- **Mehrere Dokumentationsdateien waren veraltet**: `docs/SECURITY.md`
  behauptete noch, es gäbe keine `appointments`-Tabelle (falsch seit der
  Conversion-Funnel-Phase); `docs/DEPLOYMENT.md` erwähnte weder
  `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` als Wrangler-Secrets noch Migration
  0004/0005 noch die `btree_gist`-Extension. Alle aktualisiert.
- **Neuer pgTAP-Test** `09_entitlement_hardening.test.sql` für die beiden
  DB-Fixes oben (nicht in dieser Sandbox ausgeführt, siehe Abschnitt
  "NICHT verifiziert" unten).
- Ansonsten: kein einziger Bruch im End-to-End-Funnel gefunden (VISITOR →
  ... → WON wurde Schritt für Schritt anhand des tatsächlichen Codes
  nachvollzogen, nicht nur anhand der Doku) – die Kernlogik (Doppelbuchungs-
  Sperre, Webhook-Signatur/Idempotenz, Plan-Gating für Termine,
  Fehlerresilienz bei E-Mail/Analytics) war bereits korrekt aus der
  vorherigen Phase.

## Conversion-Funnel-Phase: was neu hinzukam

- **Custom Request Form Builder** (`app/dashboard/forms/`,
  `lib/forms.ts`, `lib/data/forms.ts`): pro Business beliebig viele
  eigene Anfrageformulare mit 10 Feldtypen (Text/Textarea/E-Mail/Telefon/
  Zahl/Datum/Select/Multiselect/Checkbox/Datei), öffentlich erreichbar
  unter `/request/[businessSlug]/[formSlug]`. Das bestehende Standard-
  formular unter `/[businessSlug]` funktioniert unveraendert weiter.
  Feld-Definitionen werden bei jeder Einreichung frisch server-seitig aus
  der DB geladen und validiert (`validateDynamicSubmission`) – niemals
  vom Client vertraut. "Formular aus Branchen-Vorlage erstellen" nutzt
  dieselben Branchendaten wie unten, statt eigene Komponenten zu
  duplizieren.
- **Branchen-Vorlagen, jetzt vollstaendig** (`lib/industries.ts`): alle
  5 Branchen (Autopflege, Reinigung, Gartenservice, Fotografie, Handwerk)
  haben jetzt neben den Antwort-Textbausteinen auch Profil-Vorschlaege
  (Tagline/Beschreibung), vollstaendige Standard-Leistungen (Name, Preis,
  Dauer), Formularfeld-Vorlagen, FAQ-Eintraege und eine Beispiel-
  Angebotsstruktur (mehrere Positionen) – daten-getrieben, eine einzige
  Quelle fuer Onboarding, Formular-Builder, Angebotsgenerator und
  oeffentliche Seite.
- **E-Mail-Provider-Abstraktion** (`lib/email/`): `EmailProvider`-
  Interface analog zu `PaymentProvider`, `ConsoleEmailProvider` (Dev,
  loggt nur) und `ResendEmailProvider` (HTTP/fetch, kein SDK, Workers-
  kompatibel, mit Timeout). Lead-Benachrichtigung, Angebots-E-Mail,
  Annahme-Benachrichtigung – alle "best effort": ein fehlgeschlagener
  Versand darf niemals den Lead/das Angebot selbst zum Scheitern bringen.
- **Terminbuchung** (`supabase/migrations/0004_conversion_funnel.sql`,
  `app/dashboard/appointments/`, `components/public/AppointmentBooking.tsx`):
  Owner konfiguriert Termindauer/Puffer/blockierte Zeiten (Oeffnungszeiten
  kommen aus dem bestehenden Profil), Kunde waehlt nach Angebots-Annahme
  einen freien Slot. Doppelbuchung ist durch eine echte DB-Exclusion-
  Constraint (`btree_gist`) ausgeschlossen, nicht nur durch eine App-
  Pruefung. Die SECURITY-DEFINER-RPC `book_appointment` prueft zusaetzlich
  serverseitig Oeffnungszeiten/blockierte Zeiten, bevor sie einen Slot
  akzeptiert – ein Client kann keinen beliebigen Zeitpunkt erzwingen.
  Terminbuchung ist ein Pro-Plan-Feature, serverseitig ueber
  `business_has_calendar_feature()` (SQL) UND `lib/entitlements.ts` (TS)
  geprueft – niemals allein anhand von Browser-/Checkout-Zustand.
- **Explizite State Machines** (`lib/stateMachine.ts`): Lead-/Quote-/
  Appointment-Status als reine, getestete Transition-Funktionen statt
  verstreuter Ad-hoc-Checks; in `updateLeadStatus`/`sendQuote`/
  `updateAppointmentStatus` verdrahtet.
- **Demo-Modus** (`/demo`, `lib/demo/data.ts`,
  `components/demo/DemoExperience.tsx`): rein clientseitig gerenderte,
  statische Demo ("Shine Garage", Autopflege) – oeffentliche Seite,
  Anfrageformular (nur lokaler State, kein Server-Call), Anfragen-Liste,
  Beispiel-Angebot, Terminbuchungs-Vorschau, Kennzahlen. Es gibt **keinen**
  Demo-Tenant in der Datenbank – "niemals Demo- mit echten Mandantendaten
  vermischen" ist damit strukturell garantiert statt nur per Flag.
- **Umsatzorientiertes Dashboard** (`app/dashboard/page.tsx`,
  `lib/data/leads.ts::getRevenueStats`,
  `components/dashboard/FunnelWidget.tsx`): Neue Anfragen, Offene
  Angebote, Anstehende Termine, Gewonnene Auftraege, Geschaetzter Umsatz
  (Summe angenommener Angebote) + ein einfacher Anfragen→Angebote→
  Angenommen→Gewonnen-Funnel-Balken.
- **Abrechnungs-UX vervollstaendigt** (`app/dashboard/billing/`):
  Nutzungsanzeige (Lead-Kontingent) jetzt auch auf der Abrechnungsseite,
  und ein bisher implementiertes, aber nie verdrahtetes
  `cancelSubscription()` der `PaymentProvider`-Abstraktion ist jetzt
  ueber eine explizite "Abo kuendigen"-Aktion mit Bestaetigungsschritt
  erreichbar. Der DB-Status wird weiterhin ausschliesslich per Webhook
  aktualisiert, nie direkt von dieser Aktion.
- **Webhook-Idempotenz** (`processed_webhook_events`,
  `app/api/webhooks/stripe/route.ts`): die Tabelle existierte bereits,
  wurde aber nie benutzt – der Webhook-Handler verarbeitete jedes Stripe-
  Event bei jeder (auch doppelten) Zustellung erneut. Jetzt wird die
  Event-ID zuerst per PRIMARY-KEY-Insert reserviert; eine Doppelzustellung
  schlaegt dort fehl und wird uebersprungen, bevor irgendein Seiteneffekt
  (z. B. `track("subscription_started")`) ein zweites Mal ausgeloest wird.
- **Fehlerresilienz-Audit**: beide externen HTTP-Integrationen (Stripe,
  Resend) liefen zuvor ohne Timeout und ohne Absicherung gegen einen
  werfenden `fetch()` – ein Netzwerkfehler haette als unbehandelte
  Exception bis in die Server Action durchschlagen koennen. Beide laufen
  jetzt ueber `lib/fetchWithTimeout.ts` (hartes Timeout via
  `AbortSignal.timeout`) und geben bei jedem Fehler `{ok:false}` zurueck,
  statt zu werfen.
- **Tenant-Isolation nachgeschaerft**: die anon-Policies fuer
  `request_forms`/`request_form_fields` pruef­ten bislang nur `active`,
  nicht ob das zugehoerige Business ueberhaupt veroeffentlicht ist – ueber
  den anon-Key waeren dadurch Formulare noch unveroeffentlichter
  Businesses auflistbar gewesen. Gefixt (Policy + Regressionstest).
- **Neue pgTAP-Tests**: `07_conversion_funnel_token_isolation.test.sql`
  (Token-Isolation im Kunden-Portal, Terminbuchungs-RPCs, die o. g.
  RLS-Regression) und `08_webhook_idempotency.test.sql`
  (PRIMARY-KEY-Doppelbuchungs-Sperre, RLS-Ausschluss fuer
  `processed_webhook_events`).
- **Neue Vitest-Suiten/-Faelle**: `tests/unit/forms.test.ts` (16),
  `tests/unit/stateMachine.test.ts` (14), `tests/unit/email.test.ts`
  (12), erweiterte `tests/unit/industries.test.ts` (Branchen-Vorlagen-
  Vollstaendigkeit) und `tests/unit/stripeWebhook.test.ts` (Checkout-
  Sicherheit, Netzwerkfehler-Handling, Kuendigung/unbekanntes Event).

## Produkt-Phase: was neu hinzukam (historisch)

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

Bewusst **nicht** umgesetzt (siehe FINAL-RULE-Abwägung in
`docs/MONETIZATION.md`/`docs/ARCHITECTURE.md`): mehrere Teammitglieder,
Shop-Checkout-Überarbeitung. Kalender/Termine, individueller Formular-
Builder und ein Demo-Modus wurden zwischenzeitlich in der
Conversion-Funnel-Phase (siehe oben) nachgeliefert.

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

## Verifiziert (Conversion-Funnel-Phase, in dieser Sandbox erfolgreich ausgeführt)

Nach **jedem** der oben genannten Arbeitsschritte, nicht nur am Ende:

- `npm run typecheck` – grün
- `npm run lint` – grün
- `npm test` (Vitest, 137 Tests) – grün
- `npm run build` (regulärer Next.js-Build) – grün
- `npm run cf:build` (`@opennextjs/cloudflare`) – grün, erzeugt
  `.open-next/worker.js`

## Verifiziert (Produkt-Phase, historisch)

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

- **pgTAP-RLS-Tests** (`supabase/tests/database/`, inkl. der fünf neuen
  Dateien `05_public_quote_portal.test.sql`, `06_product_phase_rls.test.sql`,
  `07_conversion_funnel_token_isolation.test.sql`,
  `08_webhook_idempotency.test.sql`, `09_entitlement_hardening.test.sql`):
  kein Docker/`supabase`-CLI in dieser Sandbox verfügbar (`supabase:
  command not found`). Alle fünf Dateien sind statisch geprüfter,
  wohlgeformter SQL-Code nach demselben Muster
  wie die bereits etablierten Dateien, aber **nicht** in dieser Sandbox
  ausgeführt.
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
- Team-Mitglieder: Plan-Feature-Flag dafür existiert in
  `lib/entitlements.ts`, gatet aber nichts Reales (siehe
  `docs/MONETIZATION.md`). Kalender/Termine und individueller
  Formular-Builder sind seit der Conversion-Funnel-Phase real
  durchgesetzt (SQL + TS, siehe oben).
- Kein echter SMS/WhatsApp-Versand – nur Copy-to-Clipboard-Vorlagen
  (`lib/communication/`). E-Mail-Versand ist über `lib/email/`
  (Resend, HTTP-basiert) real, sofern `RESEND_API_KEY`/
  `EMAIL_FROM_ADDRESS` gesetzt sind – sonst loggt `ConsoleEmailProvider`
  nur (Dev-Fallback).
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
   verifizieren (inkl. der vier neuen Testdateien), bevor produktiv
   "scharf" geschaltet wird.
1b. `supabase/migrations/0004_conversion_funnel.sql` gegen ein echtes
    Supabase-Projekt anwenden (Formular-Builder, Termine,
    Webhook-Idempotenz, erweiterte `get_public_quote`-RPC). Erfordert die
    `btree_gist`-Extension (wird von der Migration selbst aktiviert).
1c. `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` setzen, sobald echter
    E-Mail-Versand gewünscht ist (siehe `.env.example`) – ohne diese
    Variablen läuft `ConsoleEmailProvider` als Dev-Fallback (nur Logging,
    kein tatsächlicher Versand).
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
