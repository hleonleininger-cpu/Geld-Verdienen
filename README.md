# AnfragePilot

AnfragePilot ist ein Mini-SaaS-MVP für kleine lokale Dienstleistungsunternehmen
(Autopflege, Reinigung, Gartenservice, Fotografie, Handwerk). Kunden stellen
über eine öffentliche Anfrageseite Anfragen, der Unternehmer sammelt sie in
einem Dashboard, beantwortet sie mit vorgefertigten Textbausteinen und
erstellt daraus Angebote.

Dies ist ein **funktionierendes MVP**, kein fertiges Enterprise-Produkt.
Stellen, an denen bewusst noch keine echte Integration existiert (Zahlungen,
externe KI), sind im Code und in dieser README klar gekennzeichnet.

## Tech-Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) für Auth, Postgres-Datenbank und Storage
- Deployment vorbereitet für [Cloudflare Pages](https://pages.cloudflare.com/)
  via [`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages)

Es werden **keine kostenpflichtigen APIs** verwendet. Der Antwortgenerator
basiert auf einem selbst gebauten Template-System (siehe
`lib/responseGenerator.ts`), nicht auf einer externen KI.

## Was ist im MVP enthalten – und was (noch) nicht

| Funktion | Status |
| --- | --- |
| Landingpage, Preis-Seite, Shop | ✅ vollständig |
| Registrierung / Login / Logout / Passwort zurücksetzen | ✅ vollständig (Supabase Auth) |
| Öffentliche Anfrageseite `/[businessSlug]` inkl. Datei-Upload | ✅ vollständig |
| Dashboard mit Kennzahlen, Status-Filter | ✅ vollständig |
| Lead-Detailseite, Status ändern, Erinnerungen | ✅ vollständig |
| Antwortgenerator (Template-basiert, 4 Tonalitäten) | ✅ vollständig, ohne externe KI |
| Angebotsgenerator + PDF-Export | ✅ vollständig (Export über den Browser-Druckdialog "Als PDF speichern") |
| Branchen-Vorlagen (5 Branchen) | ✅ vollständig |
| Admin-Bereich | ✅ Basis-Auswertungen (Anzahl Unternehmen/Leads, letzte Registrierungen, Branchen-Verteilung) |
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
  dashboard/               Geschütztes Dashboard (Übersicht, Leads, Profil)
  quotes/[quoteId]/        Druckbare Angebotsansicht ("Als PDF speichern")
  admin/                   Interner Admin-Bereich (per ADMIN_EMAILS geschützt)
components/                UI-Bausteine, Dashboard- und Marketing-Komponenten
lib/                       Supabase-Clients, Branchen-/Preisdaten, Template-Engine
supabase/
  schema.sql               Vollständiges DB-Schema inkl. RLS-Policies
  seed.sql                 Demo-Unternehmen + Beispiel-Anfragen
types/database.ts          TypeScript-Typen für die Datenbanktabellen
```

## Datenmodell

Siehe [`supabase/schema.sql`](./supabase/schema.sql) für die vollständige,
kommentierte Definition. Kurzüberblick:

- **users** – Spiegel von `auth.users` (kein eigenes Passwort-Handling)
- **businesses** – ein Unternehmen pro `owner_id`, mit öffentlichem `slug`
- **leads** – Kundenanfragen, referenzieren ein `business_id`
- **quotes** – Angebote, referenzieren ein `lead_id`

Storage-Buckets:

- `logos` – öffentlich lesbar (für die Anfrageseite), nur der Owner darf schreiben
- `lead-attachments` – privat, nur der jeweilige Unternehmer darf lesen

## Sicherheit

- **Row Level Security** ist für alle Tabellen aktiv: Ein Unternehmer sieht
  ausschließlich seine eigenen `businesses`, `leads` und `quotes`.
- Passwörter werden ausschließlich von Supabase Auth verwaltet – die App
  speichert keine Klartext-Passwörter.
- Alle Formulare werden serverseitig validiert (Zod bzw. manuelle Prüfungen
  in den Server Actions), nicht nur im Browser.
- Das öffentliche Anfrageformular enthält ein **Honeypot-Feld** zur
  Spam-Reduktion.
- Der Admin-Bereich nutzt den Supabase **Service-Role-Key** ausschließlich
  serverseitig (nie im Client-Bundle) und ist zusätzlich über `ADMIN_EMAILS`
  abgesichert.

## Lokale Einrichtung

### 1. Voraussetzungen

- Node.js ≥ 18.17
- Ein kostenloses [Supabase](https://supabase.com/)-Projekt

### 2. Supabase-Projekt vorbereiten

1. Neues Projekt auf [supabase.com](https://supabase.com/) anlegen.
2. Unter **SQL Editor** das Skript [`supabase/schema.sql`](./supabase/schema.sql)
   ausführen (legt Tabellen, RLS-Policies und Storage-Buckets an).
3. Optional: eigenes Konto über `/register` anlegen, dann in
   [`supabase/seed.sql`](./supabase/seed.sql) die Platzhalter-User-ID durch
   deine echte User-ID ersetzen (Dashboard → Authentication → Users) und das
   Skript ausführen, um Demo-Unternehmen mit Beispiel-Anfragen zu erhalten.
4. Unter **Authentication → URL Configuration** die Redirect-URLs
   `http://localhost:3000/auth/callback` (lokal) sowie deine spätere
   Produktions-URL eintragen.

### 3. Umgebungsvariablen

```bash
cp .env.example .env
```

Trage in `.env` deine Werte aus **Supabase → Settings → API** ein
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) sowie deine eigene E-Mail-Adresse in
`ADMIN_EMAILS`, um Zugriff auf `/admin` zu bekommen.

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
npm run lint        # ESLint
npm run typecheck   # TypeScript ohne Build
npm run build       # Produktions-Build (Node)
npm run pages:build # Build für Cloudflare Pages (@cloudflare/next-on-pages)
```

## Deployment auf Cloudflare Pages

1. Repository mit deinem Cloudflare-Account verbinden (Cloudflare Dashboard
   → Workers & Pages → Create → Pages → "Connect to Git").
2. Build-Einstellungen:
   - **Build command:** `npm run pages:build`
   - **Build output directory:** `.vercel/output/static`
   - **Framework preset:** Next.js
3. Umgebungsvariablen im Cloudflare-Projekt hinterlegen (identisch zu `.env`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (deine Cloudflare-Pages-URL),
   `ADMIN_EMAILS`.
4. In Supabase unter **Authentication → URL Configuration** die
   Produktions-URL (`https://dein-projekt.pages.dev/auth/callback`) als
   Redirect-URL freigeben.
5. Deployen. Cloudflare baut die App über `@cloudflare/next-on-pages`, alle
   Routen laufen dafür im Edge-Runtime (siehe `export const runtime = "edge"`
   in `app/layout.tsx`).

`wrangler.toml` ist bereits für den Cloudflare-Build vorkonfiguriert
(`nodejs_compat`-Flag, Ausgabeverzeichnis).

## Hinweis zu `npm audit`

`npm audit` meldet Findings, die ausschließlich von `@cloudflare/next-on-pages`
(Build-Tooling, nur `devDependency`) sowie von der verwendeten Next.js-Version
stammen. Für dieses MVP relevant eingeordnet:

- Next.js wird auf dem neuesten `14.x`-Patch (`14.2.35`) gehalten.
- Die Image-Optimierungs-API ist deaktiviert (`images.unoptimized`), damit
  entfallen die dazugehörigen CVEs.
- Es wird kein Custom-Server und kein Pages-Router-i18n verwendet, wodurch
  mehrere gemeldete Angriffsszenarien nicht greifen.
- `@cloudflare/next-on-pages` ist von Cloudflare selbst als Übergangslösung
  gekennzeichnet (empfohlener Nachfolger: [OpenNext für Cloudflare](https://opennext.js.org/cloudflare)).
  Vor einem produktiven Rollout lohnt sich ein Blick auf den aktuellen Stand
  dieses Adapters.

## Bekannte Einschränkungen des MVP

- Zahlungen (Preis-Seite, Shop) sind reine UI-Vorschauen ohne echten Checkout.
- Der Admin-Bereich zeigt einfache Auswertungen, aber kein vollständiges
  Rollen-/Rechtesystem.
- E-Mail-Versand (Bestätigung, Passwort-Reset) läuft über die
  Standard-E-Mails von Supabase Auth; für den produktiven Einsatz empfiehlt
  sich ein eigener SMTP-Provider (in Supabase konfigurierbar).
