# AnfragePilot

AnfragePilot ist ein Mini-SaaS für kleine lokale Dienstleistungsunternehmen
(Autopflege, Reinigung, Gartenservice, Fotografie, Handwerk). Kunden stellen
über eine öffentliche Mini-Site Anfragen, der Unternehmer sammelt sie in
einer visuellen Pipeline, beantwortet sie mit vorgefertigten Textbausteinen
und erstellt daraus Angebote, die der Kunde online annehmen oder ablehnen
kann – der volle Funnel von **Besucher → Registrierung → Onboarding →
erste Anfrage → erstes Angebot → erster Kunde → bezahlter Plan**.

Nach dem initialen MVP, einem Production-Hardening-Pass, einer
**Produkt-Phase** (Onboarding-Wizard, Aktivierungs-Checkliste,
Lead-Pipeline, Angebots-Workflow mit öffentlichem Kunden-Portal,
Stripe-Abrechnung, Referrals, Produkt-Analytics) und einer
**Conversion-Funnel-Phase** (eigener Formular-Builder, Terminbuchung nach
Angebotsannahme, E-Mail-Versand, Demo-Modus unter `/demo`,
umsatzorientiertes Dashboard) ist AnfragePilot jetzt bereit für den ersten
echten, zahlenden Kunden. Details dazu in `docs/PROJECT_STATUS.md`.
Stellen, an denen bewusst noch keine echte Integration existiert (Team-
Mitglieder, Shop-Checkout), sind im Code und in dieser README klar
gekennzeichnet.

**Bereit zum Launchen?** Diese vier Dateien im Repo-Root führen Schritt
für Schritt durch Deployment und Vertrieb, ohne dass etwas erraten werden
muss:

- [`LAUNCH_COMMANDS.md`](./LAUNCH_COMMANDS.md) – jeder Befehl, frische
  Maschine bis live, in der richtigen Reihenfolge
- [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) – dieselben Schritte als
  Checkliste mit Begründung, plus Smoke-Test nach jedem Deploy
- [`SALES_CHECKLIST.md`](./SALES_CHECKLIST.md) – Produkt zeigen, ersten
  Kunden gewinnen, Feedback einsammeln, auf einen bezahlten Plan bringen
- [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) – 5-Minuten-Skript für ein
  Verkaufsgespräch (Besucher → Anfrage → Angebot → Annahme → Termin)
- [`FIRST_CUSTOMER.md`](./FIRST_CUSTOMER.md) – das erste echte Unternehmen
  Schritt für Schritt onboarden

**Weiterführende Dokumentation:**

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) – Aufbau der Anwendung
- [`docs/SECURITY.md`](./docs/SECURITY.md) – RLS, Autorisierung, Secrets, Tests
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) – ausführliche Deployment-Anleitung
- [`docs/DEPLOYMENT_ARCHITECTURE.md`](./docs/DEPLOYMENT_ARCHITECTURE.md) – Entscheidung Cloudflare Workers vs. Pages/vinext
- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) – was zuletzt gemacht wurde, was noch offen ist
- [`docs/PRODUCT_FLOWS.md`](./docs/PRODUCT_FLOWS.md) – der komplette Funnel Schritt für Schritt, mit Dateiverweisen
- [`docs/MONETIZATION.md`](./docs/MONETIZATION.md) – Pläne, Trial-Logik, was Feature-Gating tatsächlich durchsetzt
- [`docs/BILLING.md`](./docs/BILLING.md) – Stripe-Integration, Webhook-Setup, `PaymentProvider`-Abstraktion
- [`docs/EMAIL.md`](./docs/EMAIL.md) – Resend-Integration, Fallback-Verhalten ohne Konfiguration

## Tech-Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + TypeScript
- React 19
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) für Auth, Postgres-Datenbank und Storage
- Deployment auf **Cloudflare Workers** via
  [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (siehe
  `docs/DEPLOYMENT_ARCHITECTURE.md` für die Begründung)
- [Vitest](https://vitest.dev/) für Unit-Tests, [pgTAP](https://pgtap.org/)
  für RLS-Tests

Es werden **keine kostenpflichtigen APIs** verwendet. Der Antwortgenerator
basiert auf einem selbst gebauten Template-System (siehe
`lib/responseGenerator.ts`), nicht auf einer externen KI.

## Was ist enthalten – und was (noch) nicht

| Funktion | Status |
| --- | --- |
| Landingpage, Preis-Seite (4 Pläne), Shop | ✅ vollständig |
| Registrierung / Login / Logout / Passwort zurücksetzen | ✅ vollständig (Supabase Auth) |
| Onboarding-Wizard (10 Schritte, resumable, idempotent) | ✅ vollständig |
| Aktivierungs-Checkliste im Dashboard | ✅ vollständig |
| Öffentliche Mini-Site `/[businessSlug]` (Hero, Leistungen, Galerie, Öffnungszeiten, FAQ, Anfrageformular) | ✅ vollständig, inkl. Rate-Limiting, Publish/Unpublish |
| Lead-Pipeline (Kanban + Liste, Drag & Drop, Filter/Suche/Priorität) | ✅ vollständig |
| Lead-Detailseite, Status ändern, Erinnerungen, Timeline | ✅ vollständig |
| Antwortgenerator (Template-basiert, 4 Tonalitäten) | ✅ vollständig, ohne externe KI |
| Angebots-Workflow (Entwurf/Versendet/Angesehen/Angenommen/Abgelehnt/Abgelaufen) | ✅ vollständig, inkl. öffentlichem Kunden-Portal `/q/[token]` |
| Angebotsgenerator + PDF-Export | ✅ vollständig (Export über den Browser-Druckdialog "Als PDF speichern") |
| Kommunikations-Vorlagen (Angebots-Nachricht zum Kopieren) | ✅ vollständig; echter Versand (E-Mail/SMS/WhatsApp) ist als `MessageProvider`-Interface vorbereitet, aber noch nicht angeschlossen |
| Benachrichtigungs-Center | ✅ vollständig |
| Branchen-Vorlagen (5 Branchen) | ✅ vollständig |
| Plan-/Trial-/Feature-Gating (zentrale Entitlement-Schicht) | ✅ Kernlogik (Lead-Limit, Branding, erweiterte Auswertungen) durchgesetzt – siehe `docs/MONETIZATION.md` für was ehrlich (noch) nicht gated wird |
| Bezahlfunktion (Free/Starter/Pro/Business) | ✅ Stripe-Checkout + Customer Portal + Webhooks, **nur aktiv wenn Stripe-Keys konfiguriert sind** – siehe `docs/BILLING.md` |
| Referral-Tracking | ✅ Codes, Klicks/Registrierungen, eigene Statistik im Profil |
| Produkt-Analytics + Admin-Wachstums-Dashboard | ✅ Funnel-Metriken mit Zeitraum-Filter (7/30/90/gesamt) |
| Admin-Bereich (DB-gestützte Autorisierung) | ✅ Wachstums-Funnel, Kennzahlen, letzte Registrierungen, Branchen-Verteilung |
| Daten-Export, Unternehmens-/Konto-Löschung | ✅ vollständig (`/dashboard/profile` → "Gefahrenzone") |
| Datenschutz-/AGB-Seiten | ⚠️ technisches Gerüst mit Platzhaltern, keine Rechtsberatung |
| Shop-Checkout | ⚠️ **nur Produktdarstellung**, kein echter Kauf (bewusst nicht Teil dieser Phase) |
| Kalender/Termine, mehrere Teammitglieder, individueller Formular-Builder | ❌ noch nicht implementiert – Entitlement-Flags dafür existieren bereits (siehe `lib/entitlements.ts`), gaten aber aktuell nichts Reales |
| Demo-Modus (isolierter Sandbox-Klon) | ❌ nicht gebaut (bewusst nicht Teil dieser Phase) |

## Projektstruktur

```
app/
  page.tsx                 Landingpage
  pricing/                 Preis-Seite (4 Pläne)
  shop/                    Shop (Übersicht + Detailseiten)
  [businessSlug]/          Öffentliche Mini-Site pro Unternehmen (Hero/Leistungen/Galerie/FAQ/Formular)
  q/[token]/               Öffentliches Kunden-Portal für ein Angebot (annehmen/ablehnen)
  (auth)/                  Login, Registrierung, Passwort zurücksetzen
  auth/callback/           Supabase-Auth-Callback (E-Mail-Bestätigung, Reset)
  onboarding/              10-Schritte-Wizard nach der Registrierung
  dashboard/               Geschütztes Dashboard
    leads/                 Pipeline (Kanban + Liste) + Lead-Detailseite
    quotes/                Zentrale Angebotsübersicht
    services/              Leistungskatalog (CRUD)
    notifications/         Benachrichtigungs-Center
    billing/               Plan-Übersicht + Stripe-Checkout/-Portal
    profile/               Profil, Öffnungszeiten, Galerie, Empfehlungen, Gefahrenzone
  quotes/[quoteId]/        Druckbare Angebotsansicht ("Als PDF speichern")
  api/webhooks/stripe/     Stripe-Webhook (einzige Quelle der Wahrheit für Plan/Abo-Status)
  admin/                   Interner Admin-Bereich (Wachstums-Funnel, DB-gestützte Autorisierung)
  datenschutz/, agb/       Rechtliche Seiten (Platzhalter, siehe Hinweis auf den Seiten)
  robots.ts, sitemap.ts    SEO-Dateien
components/                UI-Bausteine, Dashboard- und Marketing-Komponenten
lib/                       Domänenlogik: Supabase-Clients, Validierung, Formatierung, Templates
  data/                    Read-Pfade für Server Components
  supabase/                Client-Factories (browser/server/middleware/admin)
  billing/                 `PaymentProvider`-Abstraktion + Stripe-Implementierung
  communication/           `MessageProvider`-Abstraktion + Vorlagen (Copy-to-Clipboard)
  entitlements.ts          Zentrale Plan-/Trial-/Feature-Gating-Logik
  analytics.ts             Produkt-Funnel-Tracking (`track()`)
supabase/
  schema.sql               Konsolidiertes DB-Schema für Fresh-Installs
  migrations/               Inkrementelle Schema-Änderungen (Historie)
  seed.sql                 Demo-Unternehmen + Beispiel-Anfragen
  tests/database/           pgTAP-RLS-Tests
tests/unit/                 Vitest-Unit-Tests
types/database.ts          TypeScript-Typen für die Datenbanktabellen
docs/                       Architektur-/Security-/Deployment-/Produkt-Dokumentation
```

## Datenmodell

Siehe [`supabase/schema.sql`](./supabase/schema.sql) für die vollständige,
kommentierte Definition und [`docs/SECURITY.md`](./docs/SECURITY.md) für
die RLS-Policy-Übersicht je Tabelle. Kurzüberblick:

- **users** – Spiegel von `auth.users` (kein eigenes Passwort-Handling),
  plus `is_admin`-Flag für die Admin-Autorisierung
- **businesses** – ein Unternehmen pro `owner_id`, mit öffentlichem `slug`,
  Plan-/Trial-/Stripe-Feldern, `opening_hours`/`gallery_urls`, `published`
- **services** – Leistungskatalog eines Unternehmens (öffentlich lesbar,
  nur aktive)
- **leads** – Kundenanfragen, referenzieren ein `business_id`, mit
  `status`/`priority` für die Pipeline
- **quotes** – Angebote mit Positionen (`line_items`), Statuswechsel
  (Entwurf → Versendet → Angesehen → Angenommen/Abgelehnt/Abgelaufen) und
  einem separaten `public_token` für den Kunden-Zugriff
- **activity_events** / **notifications** – Timeline und
  Owner-Benachrichtigungen
- **referral_events** / **analytics_events** – Wachstums-Tracking, nur über
  den Service-Role-Client (Admin) lesbar
- **lead_submission_attempts** – interne Tabelle fürs Rate-Limiting (nicht
  über PostgREST erreichbar, nur über eine `SECURITY DEFINER`-Funktion)

Storage-Buckets:

- `logos` – öffentlich lesbar (für die Mini-Site), nur der Owner darf
  schreiben, Größen-/Typ-Limit auf Bucket-Ebene
- `gallery` – öffentlich lesbar (bis zu 8 Bilder pro Business für die
  Mini-Site), nur der Owner darf schreiben/löschen
- `lead-attachments` – privat, nur der jeweilige Unternehmer darf lesen,
  Upload nur unter einer existierenden `business_id`, Größen-/Typ-Limit auf
  Bucket-Ebene

## Sicherheit

Vollständige Details in [`docs/SECURITY.md`](./docs/SECURITY.md). Kurz:

- **Row Level Security** ist für alle Tabellen aktiv, inklusive
  `WITH CHECK`-Klauseln auf allen UPDATE-Policies (verhindert Cross-Tenant-
  Injection über das Umbiegen von Fremdschlüsseln).
- Passwörter werden ausschließlich von Supabase Auth verwaltet.
- Alle Formulare werden serverseitig mit Zod validiert.
- Öffentliches Anfrageformular: Honeypot-Feld **und** DB-gestütztes
  Rate-Limiting (5 Anfragen / Business+IP / Stunde).
- Admin-Zugriff ist DB-gestützt (`public.users.is_admin`), `ADMIN_EMAILS`
  ist nur ein Server-only-Bootstrap-Fallback.
- Der Supabase **Service-Role-Key** wird ausschließlich serverseitig
  genutzt (nie im Client-Bundle).

## Lokale Einrichtung

### 1. Voraussetzungen

- Node.js ≥ 18.17 (getestet mit Node 22)
- Ein kostenloses [Supabase](https://supabase.com/)-Projekt
- Optional (für pgTAP-Tests): Docker + [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### 2. Supabase-Projekt vorbereiten

1. Neues Projekt auf [supabase.com](https://supabase.com/) anlegen.
2. Unter **SQL Editor** das Skript [`supabase/schema.sql`](./supabase/schema.sql)
   ausführen (legt Tabellen, RLS-Policies, Storage-Buckets, Indizes und die
   Rate-Limiting-Funktion an).
3. Optional: eigenes Konto über `/register` anlegen, dann in
   [`supabase/seed.sql`](./supabase/seed.sql) die Platzhalter-User-ID durch
   deine echte User-ID ersetzen (Dashboard → Authentication → Users) und das
   Skript ausführen, um Demo-Unternehmen mit Beispiel-Anfragen zu erhalten.
4. Optional: dich selbst als Admin markieren (siehe
   `docs/SECURITY.md`, Abschnitt 3):
   ```sql
   update public.users set is_admin = true where email = 'du@deine-domain.de';
   ```
5. Unter **Authentication → URL Configuration** die Redirect-URLs
   `http://localhost:3000/auth/callback` (lokal) sowie deine spätere
   Produktions-URL eintragen.

### 3. Umgebungsvariablen

```bash
cp .env.example .env
```

Trage in `.env` deine Werte aus **Supabase → Settings → API** ein
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) sowie optional deine eigene E-Mail-Adresse in
`ADMIN_EMAILS` als Bootstrap-Fallback für `/admin`.

Die `STRIPE_*`-Variablen sind **optional**: ohne sie läuft die App normal,
`/dashboard/billing` zeigt dann lediglich einen "nicht eingerichtet"-Hinweis
statt eines funktionierenden Checkouts. Siehe
[`docs/BILLING.md`](./docs/BILLING.md) für die Einrichtung.

`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` sind ebenfalls **optional**: ohne sie
läuft der `ConsoleEmailProvider` (loggt E-Mails nur, versendet nichts
Echtes) – praktisch für lokale Entwicklung. Mit gesetzten Werten übernimmt
automatisch der `ResendEmailProvider` (HTTP-API, kein SDK) den Versand von
Lead-Benachrichtigungen, Angebots-E-Mails und Annahme-Benachrichtigungen.

### 4. Installieren & starten

```bash
npm install
npm run dev
```

Die App läuft danach unter `http://localhost:3000`. Die Demo-Anfrageseite
(nach dem Seed-Skript) ist z. B. unter `http://localhost:3000/glanzwerk-autopflege`
erreichbar.

### 5. Nützliche Skripte

```bash
npm run dev          # lokaler Entwicklungsserver
npm run lint         # ESLint (Flat Config)
npm run typecheck    # TypeScript ohne Build
npm test             # Vitest Unit-Tests
npm run build        # regulärer Next.js-Produktions-Build
npm run cf:build     # Build für Cloudflare Workers (@opennextjs/cloudflare)
npm run cf:preview   # cf:build + lokale Vorschau in der Workers-Runtime
npm run cf:deploy    # cf:build + Deploy nach Cloudflare
```

Für die pgTAP-RLS-Tests (`supabase/tests/database/`) wird ein lokaler
Supabase-Stack benötigt:

```bash
supabase start   # benötigt einen laufenden Docker-Daemon
supabase test db
```

## Deployment

Siehe [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) für die vollständige
Anleitung (Cloudflare-Setup, Secrets, Migrationen, Produktions-Checkliste)
und [`docs/DEPLOYMENT_ARCHITECTURE.md`](./docs/DEPLOYMENT_ARCHITECTURE.md)
für die Begründung der Architekturentscheidung.

## Bekannte Einschränkungen

Siehe [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md), Abschnitt
"Bekannte Grenzen" für die vollständige, aktuelle Liste sowie den genauen
`npm audit`-Befund.
