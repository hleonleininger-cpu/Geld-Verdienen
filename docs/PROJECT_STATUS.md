# Project Status

Stand: Production-Hardening-Pass abgeschlossen (nach MVP-Tasks 1–17).

## Was in diesem Pass gemacht wurde

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

## Verifiziert (in dieser Sandbox erfolgreich ausgeführt)

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

- **pgTAP-RLS-Tests** (`supabase/tests/database/`): kein Docker verfügbar.
- **Live-Supabase-Integrationstests** (echter Login-Flow, echtes
  Datei-Upload, echte E-Mail-Zustellung): keine echten Supabase-Zugangs-
  daten in dieser Sandbox vorhanden.
- **Echtes Cloudflare-Deployment** (`wrangler deploy`): erfordert einen
  echten Cloudflare-Account; nur der lokale Build (`cf:build`) wurde
  verifiziert.
- **Browser-Smoke-Test mit echtem DOM/Konsole** (Playwright/Chrome): keine
  Display-/Browser-Umgebung in dieser Sandbox; die Verifikation lief über
  `curl` gegen den Produktions-Server plus die vorherigen Build-/Typecheck-
  Garantien.

## Bekannte Grenzen (bewusste MVP-Einschränkungen)

- Kein Mehrbenutzer-/Rollenmodell (nur 1 Owner pro Business).
- Keine echte Zahlungsintegration (Preis-/Shop-Seiten sind UI-Vorschauen).
- `/datenschutz` und `/agb` sind technische Gerüste mit Platzhaltern, keine
  fertigen Rechtstexte.
- Admin-Branchen-Auswertung tallyt clientseitig aus einer ungefilterten
  Query – für die aktuelle Datenmenge unkritisch (siehe
  `docs/ARCHITECTURE.md`).

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
   verifizieren, bevor produktiv "scharf" geschaltet wird.
2. Echtes Supabase-Projekt aufsetzen, `supabase/schema.sql` ausführen,
   Login-/Upload-/Angebots-Flows manuell in einem echten Browser testen.
3. `/datenschutz` und `/agb` von einer Rechtsberatung ausfüllen lassen.
4. Ersten Admin-Account über `is_admin = true` markieren (siehe
   `docs/SECURITY.md`).
5. `vinext` in einigen Monaten erneut evaluieren, falls es den
   Beta-Status verlässt und ein dokumentierter Migrationsweg von
   `@opennextjs/cloudflare` existiert.
