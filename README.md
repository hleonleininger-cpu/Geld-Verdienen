# AnfragePilot

AnfragePilot ist ein Mini-SaaS für kleine lokale Dienstleistungsunternehmen
(Autopflege, Reinigung, Gartenservice, Fotografie, Handwerk). Kunden stellen
über eine öffentliche Anfrageseite Anfragen, der Unternehmer sammelt sie in
einem Dashboard, beantwortet sie mit vorgefertigten Textbausteinen und
erstellt daraus Angebote.

Nach dem initialen MVP wurde ein vollständiger **Production-Hardening-Pass**
durchgeführt (Sicherheit, Autorisierung, Datenqualität, Tests, SEO,
Deployment-Architektur). Details dazu in `docs/PROJECT_STATUS.md`. Stellen,
an denen bewusst noch keine echte Integration existiert (Zahlungen, externe
KI), sind im Code und in dieser README klar gekennzeichnet.

**Weiterführende Dokumentation:**

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) – Aufbau der Anwendung
- [`docs/SECURITY.md`](./docs/SECURITY.md) – RLS, Autorisierung, Secrets, Tests
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) – Deployment-Anleitung
- [`docs/DEPLOYMENT_ARCHITECTURE.md`](./docs/DEPLOYMENT_ARCHITECTURE.md) – Entscheidung Cloudflare Workers vs. Pages/vinext
- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) – was zuletzt gemacht wurde, was noch offen ist

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
| Landingpage, Preis-Seite, Shop | ✅ vollständig |
| Registrierung / Login / Logout / Passwort zurücksetzen | ✅ vollständig (Supabase Auth) |
| Öffentliche Anfrageseite `/[businessSlug]` inkl. Datei-Upload | ✅ vollständig, inkl. Rate-Limiting |
| Dashboard mit Kennzahlen, Status-Filter, Paginierung | ✅ vollständig |
| Lead-Detailseite, Status ändern, Erinnerungen | ✅ vollständig |
| Antwortgenerator (Template-basiert, 4 Tonalitäten) | ✅ vollständig, ohne externe KI |
| Angebotsgenerator + PDF-Export | ✅ vollständig (Export über den Browser-Druckdialog "Als PDF speichern") |
| Branchen-Vorlagen (5 Branchen) | ✅ vollständig |
| Admin-Bereich (DB-gestützte Autorisierung) | ✅ Basis-Auswertungen (Anzahl Unternehmen/Leads, letzte Registrierungen, Branchen-Verteilung) |
| Daten-Export, Unternehmens-/Konto-Löschung | ✅ vollständig (`/dashboard/profile` → "Gefahrenzone") |
| Datenschutz-/AGB-Seiten | ⚠️ technisches Gerüst mit Platzhaltern, keine Rechtsberatung |
| Bezahlfunktion (Free/Starter/Pro) | ⚠️ **nur UI**, keine echte Zahlungsintegration |
| Shop-Checkout | ⚠️ **nur Produktdarstellung**, kein echter Kauf |
| Mehrere Teammitglieder pro Unternehmen | ❌ noch nicht implementiert (in der Pro-Preisliste als "bald verfügbar" gekennzeichnet) |

## Projektstruktur

```
app/
  page.tsx                 Landingpage
  pricing/                 Preis-Seite
  shop/                    Shop (Übersicht + Detailseiten)
  [businessSlug]/          Öffentliche Anfrageseite pro Unternehmen
  (auth)/                  Login, Registrierung, Passwort zurücksetzen
  auth/callback/           Supabase-Auth-Callback (E-Mail-Bestätigung, Reset)
  dashboard/               Geschütztes Dashboard (Übersicht, Leads, Profil, Export, Löschung)
  quotes/[quoteId]/        Druckbare Angebotsansicht ("Als PDF speichern")
  admin/                   Interner Admin-Bereich (DB-gestützte Autorisierung)
  datenschutz/, agb/       Rechtliche Seiten (Platzhalter, siehe Hinweis auf den Seiten)
  robots.ts, sitemap.ts    SEO-Dateien
components/                UI-Bausteine, Dashboard- und Marketing-Komponenten
lib/                       Domänenlogik: Supabase-Clients, Validierung, Formatierung, Templates
  data/                    Read-Pfade für Server Components
  supabase/                Client-Factories (browser/server/middleware/admin)
supabase/
  schema.sql               Konsolidiertes DB-Schema für Fresh-Installs
  migrations/               Inkrementelle Schema-Änderungen (Historie)
  seed.sql                 Demo-Unternehmen + Beispiel-Anfragen
  tests/database/           pgTAP-RLS-Tests
tests/unit/                 Vitest-Unit-Tests
types/database.ts          TypeScript-Typen für die Datenbanktabellen
docs/                       Architektur-/Security-/Deployment-Dokumentation
```

## Datenmodell

Siehe [`supabase/schema.sql`](./supabase/schema.sql) für die vollständige,
kommentierte Definition und [`docs/SECURITY.md`](./docs/SECURITY.md) für
die RLS-Policy-Übersicht je Tabelle. Kurzüberblick:

- **users** – Spiegel von `auth.users` (kein eigenes Passwort-Handling),
  plus `is_admin`-Flag für die Admin-Autorisierung
- **businesses** – ein Unternehmen pro `owner_id`, mit öffentlichem `slug`
- **leads** – Kundenanfragen, referenzieren ein `business_id`
- **quotes** – Angebote, referenzieren ein `lead_id`
- **lead_submission_attempts** – interne Tabelle fürs Rate-Limiting (nicht
  über PostgREST erreichbar, nur über eine `SECURITY DEFINER`-Funktion)

Storage-Buckets:

- `logos` – öffentlich lesbar (für die Anfrageseite), nur der Owner darf
  schreiben, Größen-/Typ-Limit auf Bucket-Ebene
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
