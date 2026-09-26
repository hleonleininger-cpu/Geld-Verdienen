# Deployment-Architektur-Entscheidung

Datum: 2026-09-26
Kontext: Production-Hardening-Pass nach Abschluss des MVP (Tasks 1–17).

## 1. Ausgangslage (vorher)

- **Framework:** Next.js 14.2.35 (App Router), React 18.
- **Cloudflare-Adapter:** `@cloudflare/next-on-pages` (dev-dependency), Ziel
  "Cloudflare Pages" via `wrangler.toml` mit
  `pages_build_output_dir = ".vercel/output/static"`.
- **Build-Weg:** `next build` → `npx @cloudflare/next-on-pages` → Vercel-Build-Output
  wird in Cloudflare-Pages-kompatible Edge-Functions übersetzt.
- **Runtime:** Alle Routen liefen explizit im `edge`-Runtime
  (`export const runtime = "edge"` im Root-Layout), weil next-on-pages nur
  Edge-kompatible Function-Ausgaben in Cloudflare-Pages-Functions übersetzen kann.
- **Datenzugriff:** Supabase über `@supabase/ssr` (Cookie-basierte Server-Clients),
  Server Actions für alle Mutationen, Supabase Storage für Datei-Uploads.

## 2. Probleme mit der bisherigen Architektur

1. **`@cloudflare/next-on-pages` ist von Cloudflare selbst als abgelöst markiert.**
   Die Paket-Warnung beim Install lautet wörtlich: *"Please use the OpenNext
   adapter instead."* Die aktuelle Cloudflare-Dokumentation
   (`developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/`)
   behandelt Next.js primär unter **Cloudflare Workers**, nicht mehr unter
   Cloudflare Pages. Cloudflare Pages' natives Framework-Preset unterstützt
   Next.js im Server-Modus (API-Routen, Server Components, Middleware) nicht
   mehr ohne einen der beiden Adapter.
2. **Peer-Dependency-Deadlock:** `@cloudflare/next-on-pages@1.13.16` verlangt
   `next@">=14.3.0 && <=15.5.2"` – eine Next-Version 14.3 existiert nicht
   (Next sprang direkt von 14.2 auf 15.0), sodass jede Installation nur über
   `--legacy-peer-deps` funktionierte. Das ist ein klares Signal für ein
   unterstütztes, aber nicht mehr gepflegtes Tool.
3. **Next.js 14.2.35 hatte zum Zeitpunkt des MVP bereits eine offizielle
   Sicherheitswarnung** (`npm install` meldete: *"This version has a security
   vulnerability"*), ohne dass innerhalb der 14.x-Linie ein Fix existierte.
4. Kein automatisiertes Test-Setup, keine RLS-Tests, keine strukturierte
   Dokumentation der Sicherheitsannahmen.

## 3. Geprüfte Alternativen

Basierend auf einer Live-Recherche der aktuellen Cloudflare-Dokumentation
(Stand 2026-09-26, siehe Quellen unten) kommen zwei moderne Wege in Frage:

### Option A — `vinext` (Cloudflares neuester, nativer Weg)

- Cloudflare bewirbt `vinext` aktuell als *"the recommended path for Next.js
  applications on Cloudflare Workers"*.
- `vinext` ist **kein Adapter**, sondern ein Vite-Plugin, das die Next.js-API
  **neu implementiert** ("reimplements the Next.js API surface") und den
  gesamten Build-Prozess durch Vite ersetzt.
- Voraussetzung: **Next.js 16**, offiziell als **Beta** gekennzeichnet.
- Es gibt keine dokumentierte Migrationsanleitung speziell von
  `@cloudflare/next-on-pages` weg.

**Bewertung:** Für eine echte SaaS-Codebase in Produktion ist ein Beta-Tool,
das den kompletten Build-/Runtime-Stack durch eine Reimplementierung
ersetzt, ein zu hohes Risiko – Verhalten von Server Actions, Middleware,
Cookies-Handling und Streaming ist nicht auf die gleiche Weise battle-tested
wie der offizielle Next.js-Build. Ein Fehlverhalten würde erst in Produktion
auffallen (z. B. bei Supabase-Cookie-Handling in Server Actions).

### Option B — OpenNext-Adapter für Cloudflare (`@opennextjs/cloudflare`)

- Von Cloudflare **co-maintained**, expliziter Nachfolger von
  `@cloudflare/next-on-pages` ("The old adapter is superseded — remove it").
- Nutzt den **normalen, offiziellen Next.js-Build** (`next build`) und
  übersetzt dessen Output in einen Cloudflare-Worker-Entry-Point – kein
  Reimplementieren der Next.js-Runtime.
- Unterstützt laut package-Metadaten `next: ">=15.5.24 <16 || >=16.3.3"` –
  also aktuelle 15.x- **und** 16.x-Linien, nicht als Beta gekennzeichnet.
- Deployt auf **Cloudflare Workers** (nicht mehr "Pages"), was dem aktuellen
  Stand der Cloudflare-Doku entspricht.
- Etablierter Migrationspfad von next-on-pages, aktive Weiterentwicklung
  (Version 1.20.6 zum Zeitpunkt dieser Entscheidung).

**Bewertung:** Stabiler, offiziell unterstützter Weg, der den normalen
Next.js-Build unangetastet lässt. Server Actions, Cookies, Middleware und
Route Handler verhalten sich exakt wie in jeder anderen Next.js-Umgebung,
weil OpenNext nur die Auslieferung (Routing/Assets/Functions) übersetzt,
nicht die Next.js-Runtime selbst ersetzt.

## 4. Entscheidung

**Gewählt: Option B — `@opennextjs/cloudflare` auf Cloudflare Workers.**

Begründung in Kurzform:

- Kein Beta-Risiko für eine produktive SaaS-Anwendung mit Kundendaten.
- Offiziell von Cloudflare als Nachfolger von next-on-pages benannt – wir
  wechseln also *innerhalb* des vom selben Anbieter vorgezeichneten
  Migrationspfads, nicht auf ein experimentelles Parallelprodukt.
- Der reguläre Next.js-Build bleibt die Quelle der Wahrheit; Verhalten lässt
  sich lokal mit `next build && next start` 1:1 nachvollziehen, bevor es auf
  Cloudflare läuft.
- Unterstützt sowohl die aktuelle Next.js-16-Linie als auch 15.x, gibt also
  Spielraum, falls sich während des Hardening-Passes Next-16-spezifische
  Probleme zeigen sollten.
- `vinext` bleibt als **Fast-Follow-Kandidat** vermerkt, sobald es den
  Beta-Status verlässt und ein dokumentierter Migrationsweg von OpenNext aus
  existiert (siehe `docs/PROJECT_STATUS.md`, Abschnitt "Nicht jetzt, aber
  beobachten").

Cloudflare **Pages** (im Sinne des ursprünglichen Produkts) wird als Zielplattform
aufgegeben zugunsten von Cloudflare **Workers**, weil das der aktuellen
Produktausrichtung von Cloudflare für Next.js im Server-Modus entspricht.
Die Domain/Custom-Domain-Anbindung, Preview-Deployments und Git-Integration
funktionieren unter Workers äquivalent zu Pages.

## 5. Was sich dadurch konkret ändert

| Aspekt | Vorher | Nachher |
| --- | --- | --- |
| Next.js | 14.2.35 | 16.3.6 |
| React | 18.3.1 | 19.x |
| Cloudflare-Adapter | `@cloudflare/next-on-pages` | `@opennextjs/cloudflare` |
| Deploy-Ziel | Cloudflare Pages | Cloudflare Workers |
| Konfigurationsdatei | `wrangler.toml` (`pages_build_output_dir`) | `wrangler.jsonc`/`wrangler.toml` (Worker-Format) + `open-next.config.ts` |
| Build-Skript | `next-on-pages` | `opennextjs-cloudflare build` |
| Runtime pro Route | überall explizit `edge` erzwungen | Node-kompatible Worker-Runtime (kein erzwungenes `edge` mehr nötig) |
| `next lint` | vorhanden | in Next 16 entfernt → direktes ESLint (Flat Config) |
| `useFormState` | `react-dom` | `useActionState` aus `react` (Next 16 verlangt async Request-APIs, siehe unten) |

Zusätzliche Next-16-Pflichtänderungen (siehe `docs/ARCHITECTURE.md` für Details):

- `cookies()`, `headers()`, `params`, `searchParams` sind vollständig
  asynchron (`Promise`) – synchroner Zugriff ist in Next 16 komplett entfernt
  (nicht mehr nur deprecated wie in 15).
- `next/image`-Standardwerte haben sich geändert (irrelevant hier, da
  `images.unoptimized = true` gesetzt ist).

## 6. Migrationsrisiken

| Risiko | Einschätzung | Gegenmaßnahme |
| --- | --- | --- |
| Async-API-Umstellung (`cookies()`/`params`) wird an einer Stelle vergessen | Mittel | Vollständiger `tsc --noEmit`-Lauf deckt das zuverlässig auf (Next 16 typisiert `params`/`searchParams` als `Promise<...>`); jede vergessene Stelle ist ein Typfehler, kein stiller Bug. |
| `@opennextjs/cloudflare` hat andere Laufzeit-Eigenheiten als next-on-pages (z. B. Streaming, `fetch`-Caching) | Mittel | Lokaler Cloudflare-Build (`opennextjs-cloudflare build` + `wrangler dev`) wird vor jedem Deploy verifiziert; Rollback-Pfad siehe unten. |
| React 19 verhält sich bei Hydration strenger (ungültiges HTML-Nesting bricht jetzt hart) | Niedrig–Mittel | Manuelle Durchsicht aller Layouts auf ungültiges Nesting (z. B. Button-in-Button, das im MVP nicht vorkommt); Build/Smoke-Test deckt Rendering-Fehler auf. |
| Dritt-Pakete (`lucide-react`, `@supabase/ssr`) haben React-19-Kompatibilitätslücken | Niedrig | Beide Pakete sind reine Funktionskomponenten/Utility-Libraries ohne React-Version-Locking; nach Upgrade erneut typecheck/build laufen lassen. |
| Team kennt `@opennextjs/cloudflare`-Konfiguration noch nicht | Niedrig | Ausführliche Doku in `docs/DEPLOYMENT.md` inkl. lokalem Test-Workflow. |
| `npm run cf:build` meldet explizit: *"Node.js middleware support is experimental in cloudflare, and not officially maintained by OpenNext maintainers."* – betrifft unseren `proxy.ts` (vormals `middleware.ts`), der Supabase-Session-Refresh und Auth-Redirects übernimmt | Mittel | Vor dem produktiven Rollout gezielt `wrangler dev`/`opennextjs-cloudflare preview` gegen echte Login-/Logout-/Redirect-Flows testen (siehe Smoke-Test in `docs/PROJECT_STATUS.md`); Fallback: Session-Check zusätzlich serverseitig in geschützten Layouts/Pages (bereits vorhanden, siehe `getCurrentUser()`), sodass ein Proxy-Ausfall nicht zu ungeschütztem Datenzugriff führt, sondern höchstens zu einem fehlenden Redirect. |

## 7. Rollback-Strategie

Der gesamte Wechsel ist **in einem einzigen, klar abgegrenzten Commit**
enthalten (siehe Git-Historie dieses Hardening-Passes). Rollback-Optionen,
von leichtgewichtig zu vollständig:

1. **Sofort-Rollback (Deployment-Ebene):** Cloudflare behält vorherige
   Worker-/Pages-Deployments vor; über das Cloudflare-Dashboard kann jederzeit
   auf das vorherige funktionierende Deployment zurückgeschaltet werden,
   unabhängig vom Code-Stand.
2. **Code-Rollback (Git-Ebene):** `git revert <hardening-commit-sha>` stellt
   exakt den vorherigen Stand (Next 14.2.35 + next-on-pages + Cloudflare
   Pages) wieder her, weil die Änderung nicht über mehrere Commits verteilt,
   sondern gebündelt ist.
3. **Partieller Rollback:** Da `wrangler.toml`/`open-next.config.ts` und
   `package.json` die einzigen deploy-spezifischen Dateien sind, kann bei
   Bedarf nur der Adapter zurückgewechselt werden, ohne die
   Sicherheits-/Validierungs-Änderungen dieses Passes zu verlieren (diese
   sind Next-Versions-unabhängig).
4. **Präventiv:** Vor dem produktiven Umschalten wird empfohlen, einen
   Cloudflare-Workers-Preview-Deploy (`wrangler versions upload`) zu nutzen,
   der eine eigene Preview-URL erhält, bevor Produktions-Traffic umgestellt
   wird (siehe `docs/DEPLOYMENT.md`).

## 8. Quellen (Live-Recherche 2026-09-26)

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://opennext.js.org/cloudflare
- https://github.com/opennextjs/opennextjs-cloudflare
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/blog/next-16
- npm-Metadaten: `@opennextjs/cloudflare@1.20.6` (`peerDependencies`), `next@16.3.6`, `wrangler@4.141.0`
