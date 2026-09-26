# Architektur

Stand: nach dem Production-Hardening-Pass (siehe `docs/PROJECT_STATUS.md`
für den genauen Änderungsumfang und `docs/DEPLOYMENT_ARCHITECTURE.md` für
die Deployment-Entscheidung im Detail).

## Tech-Stack

| Ebene | Wahl | Begründung |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | Server Components + Server Actions decken UI und Mutationen ohne separate REST/GraphQL-API-Schicht ab. |
| UI | React 19, Tailwind CSS 3 | Server-first, minimaler Client-JS-Anteil (siehe unten). |
| Daten | Supabase (Postgres + Auth + Storage) | RLS als harte Mandanten-Grenze, kein eigenes Auth-System nötig. |
| Deployment | Cloudflare Workers via `@opennextjs/cloudflare` | Siehe `docs/DEPLOYMENT_ARCHITECTURE.md`. |
| Validierung | Zod | Einheitliche serverseitige Validierung für alle Formulare. |
| Tests | Vitest (Unit) + pgTAP (RLS) | Siehe `docs/PROJECT_STATUS.md`, Abschnitt Tests. |

## Grundprinzip: Server Components + Server Actions

Es gibt bewusst **keine** separate `/api/*`-REST-Schicht für die
Kern-Domäne (Leads, Quotes, Businesses). Stattdessen:

- **Lesen:** Server Components (`app/**/page.tsx`) fragen Supabase direkt
  über `lib/data/*.ts` ab und rendern serverseitig.
- **Schreiben:** Server Actions (`"use server"`-Dateien wie
  `app/dashboard/leads/actions.ts`) nehmen `FormData` entgegen, validieren
  mit Zod (`lib/validation.ts`) und mutieren über den Supabase-Client.
- Die einzigen echten Route Handler (`route.ts`) sind:
  - `app/auth/callback/route.ts` – Supabase-Auth-Redirect-Ziel (Code-Exchange).
  - `app/dashboard/export/route.ts` – Datei-Download (JSON-Export, Server
    Actions können keine Downloads mit `Content-Disposition` ausliefern).

Das hält die Angriffsfläche klein: Es gibt keinen zusätzlichen, separat zu
pflegenden API-Vertrag, der aus dem Tritt geraten könnte.

## Mandantentrennung (Multi-Tenancy)

Jede `business`-Zeile gehört genau einem `owner_id` (`auth.users.id`). Es
gibt **kein** Team-/Rollen-Modell (kein `business_members`) – das ist eine
bewusste MVP-Einschränkung, kein Versehen (siehe
`docs/PROJECT_STATUS.md`, "Bekannte Grenzen"). Die Trennung zwischen
Mandanten erfolgt ausschließlich über:

1. **Row Level Security** (siehe `docs/SECURITY.md`) als harte, DB-seitige
   Grenze – funktioniert unabhängig davon, ob der Zugriff über die
   Next.js-App oder direkt über die Supabase-REST-API (PostgREST) erfolgt.
2. **Explizite Ownership-Checks in Server Actions** zusätzlich zu RLS (z. B.
   `.eq("business_id", business.id)` in `app/dashboard/leads/actions.ts`),
   damit ein Zugriffsversuch auf fremde Daten eine ehrliche Fehlermeldung
   statt eines stillen No-ops durch RLS erzeugt.

## Auth-Fluss

- `@supabase/ssr` verwaltet die Session über Cookies (`getAll`/`setAll`-API,
  siehe `lib/supabase/server.ts`).
- `proxy.ts` (vormals `middleware.ts`, siehe Next-16-Umbenennung in
  `docs/DEPLOYMENT_ARCHITECTURE.md`) refresht die Session bei jedem Request
  und leitet nicht eingeloggte Nutzer von `/dashboard`/`/admin` nach
  `/login` um.
- **Wichtig:** `proxy.ts` ist laut `@opennextjs/cloudflare` "experimentell"
  unter Cloudflare Workers (siehe Risiko-Tabelle in
  `docs/DEPLOYMENT_ARCHITECTURE.md`). Die eigentliche Autorisierungs-Grenze
  ist deshalb NICHT der Proxy, sondern:
  - RLS in der Datenbank, und
  - explizite `getCurrentUser()`/`getCurrentBusiness()`-Checks in jeder
    Server-Component, die private Daten rendert.
  Ein Ausfall des Proxys würde also höchstens zu einem fehlenden Redirect
  führen, nicht zu offenliegenden Daten.

## Admin-Bereich

Siehe `docs/SECURITY.md`, Abschnitt "Admin-Autorisierung". Kurzfassung:
DB-Flag `public.users.is_admin` ist die produktive Quelle der Wahrheit,
`ADMIN_EMAILS` (Server-Env-Var) nur ein Bootstrap-Fallback. Auswertungen
laufen über einen Service-Role-Client, der ausschließlich serverseitig in
`app/admin/page.tsx` verwendet wird.

## Rate-Limiting

Das öffentliche Anfrageformular ist über eine Postgres-Tabelle +
`SECURITY DEFINER`-Funktion (`public.check_and_record_lead_attempt`)
begrenzt (Standard: 5 Anfragen pro Business+IP-Hash pro Stunde) – kein
externer, kostenpflichtiger Dienst nötig. Details in `docs/SECURITY.md`.

## Verzeichnisstruktur

```
app/                  Next.js App Router (Pages, Layouts, Server Actions, Route Handler)
components/           UI-Bausteine, gruppiert nach Kontext (ui/, dashboard/, marketing/, public/, auth/)
lib/                   Domänenlogik ohne UI: Supabase-Clients, Validierung, Formatierung, Templates
  data/                Read-Pfade (Server Components rufen diese Funktionen)
  supabase/            Client-Factories (browser/server/middleware/admin)
types/database.ts      Handgeschriebene Supabase-Datenbanktypen (siehe Kommentar darin zu `type` vs. `interface`)
supabase/
  schema.sql           Konsolidiertes Schema für Fresh-Installs
  migrations/           Inkrementelle Änderungen (Historie, siehe oben)
  seed.sql             Demo-Daten
  tests/database/       pgTAP-RLS-Tests (siehe docs/SECURITY.md, "Tests")
tests/unit/            Vitest-Unit-Tests für reine Logik (kein DB-Zugriff)
docs/                   Diese Dokumentation
```

## Bekannte architektonische Grenzen

- Kein Mehrbenutzer-/Rollenmodell pro Business (nur 1 Owner).
- Keine echte Zahlungsintegration (Preis-/Shop-Seiten sind UI-Vorschauen).
- `proxy.ts` läuft unter Cloudflare im als "experimentell" markierten
  Node.js-Middleware-Modus von `@opennextjs/cloudflare` (siehe oben).
- Admin-Auswertungen (`/admin`) tallyen Branchen clientseitig aus einer
  ungefilterten `select("industry")`-Abfrage – für die aktuelle,
  MVP-typische Datenmenge unkritisch, bei sehr vielen Businesses
  (>> 10.000) wäre eine SQL-seitige `GROUP BY`-Auswertung (View oder RPC)
  performanter.
