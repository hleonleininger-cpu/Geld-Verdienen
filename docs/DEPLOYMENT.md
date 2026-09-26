# Deployment

Diese Seite ist die praktische Anleitung. Für die Begründung, warum
Cloudflare Workers + `@opennextjs/cloudflare` statt Cloudflare Pages +
`@cloudflare/next-on-pages` gewählt wurden, siehe
`docs/DEPLOYMENT_ARCHITECTURE.md`.

## Voraussetzungen

- Node.js ≥ 18.17 (entwickelt/getestet mit Node 22)
- Ein Supabase-Projekt (siehe README.md, Abschnitt "Supabase-Projekt
  vorbereiten")
- Ein Cloudflare-Account mit Workers aktiviert

## Lokale Verifikation vor jedem Deploy

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build        # regulärer Next.js-Build – lokal 1:1 nachvollziehbar
npm run cf:build      # übersetzt den Next.js-Build in einen Cloudflare Worker
```

`npm run cf:build` erzeugt `.open-next/worker.js`. Vor einem echten Deploy
lohnt sich ein lokaler Probelauf im echten Workers-Runtime:

```bash
npm run cf:preview   # baut + startet lokal via wrangler (Workers-Runtime, nicht Node)
```

## Cloudflare-Konfiguration

- `wrangler.jsonc` enthält `compatibility_date`, `compatibility_flags`
  (`nodejs_compat`) sowie die Pfade zu `.open-next/worker.js` und
  `.open-next/assets`.
- `open-next.config.ts` ist bewusst minimal (`defineCloudflareConfig()`
  ohne Overrides) – die App ist praktisch vollständig dynamisch (SSR ohne
  ISR/SSG mit Revalidierung), daher ist laut OpenNext-Doku keine
  zusätzliche Incremental-Cache-Konfiguration (z. B. R2) nötig. Falls
  künftig `revalidate`/ISR eingeführt wird, muss hier ein
  `incrementalCache`-Override (R2 oder KV) ergänzt werden.

## Erstes Deployment

1. **Cloudflare-Account verbinden:**
   ```bash
   npx wrangler login
   ```
2. **Umgebungsvariablen als Worker-Secrets hinterlegen** (niemals in
   `wrangler.jsonc` committen):
   ```bash
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put NEXT_PUBLIC_SITE_URL
   npx wrangler secret put ADMIN_EMAILS
   ```
   Für lokale Entwicklung gegen die Workers-Runtime (`npm run cf:preview`)
   können dieselben Variablen in einer nicht committeten `.dev.vars`-Datei
   stehen (siehe `.gitignore` – `.dev.vars` ist bereits ausgeschlossen).
3. **Deployen:**
   ```bash
   npm run cf:deploy
   ```
   Das baut (`next build` → OpenNext-Bundling) und deployed in einem
   Schritt (`wrangler deploy` intern).
4. **Supabase-Redirect-URLs ergänzen:** Unter Authentication → URL
   Configuration die Produktions-URL (`https://<dein-worker>.workers.dev/auth/callback`
   bzw. deine Custom Domain) als erlaubte Redirect-URL eintragen.

## Datenbank-Migrationen

- **Neues Supabase-Projekt:** `supabase/schema.sql` einmalig im
  SQL-Editor ausführen (konsolidierter, aktueller Stand).
- **Bereits bestehendes Projekt** (z. B. vom MVP-Stand vor diesem
  Hardening-Pass): die Dateien unter `supabase/migrations/` der Reihe nach
  ausführen (`0001_initial_schema.sql` nur falls noch nicht geschehen,
  danach `0002_production_hardening.sql`).
- **Künftige Änderungen:** immer als neue Datei
  `supabase/migrations/000N_beschreibung.sql` ergänzen UND die
  konsolidierte Fassung in `supabase/schema.sql` nachziehen, damit ein
  Fresh Install weiterhin mit einem einzigen Skript funktioniert.
- Optional: `supabase/seed.sql` für Demo-Daten (siehe README.md für die
  nötigen Anpassungen – Platzhalter-User-ID ersetzen).

## Preview-Deployments

`wrangler versions upload` erzeugt eine Preview-Version mit eigener URL,
ohne den Produktions-Traffic umzustellen – empfohlen vor jedem größeren
Release, insbesondere nach Next.js- oder Adapter-Updates.

## Rollback

Siehe `docs/DEPLOYMENT_ARCHITECTURE.md`, Abschnitt "Rollback-Strategie" für
die vollständige Übersicht (Cloudflare-Dashboard-Rollback,
`git revert`, partieller Rollback).

## Produktions-Checkliste

- [ ] `npm run typecheck && npm run lint && npm test && npm run build && npm run cf:build` sind grün
- [ ] `supabase/schema.sql` (oder die passenden Migrationen) im
      Ziel-Projekt ausgeführt
- [ ] Mindestens ein Nutzer über `is_admin = true` als Admin markiert
      (siehe `docs/SECURITY.md`, Abschnitt 3)
- [ ] Alle Secrets als Wrangler-Secrets gesetzt, keine davon in einer
      committeten Datei
- [ ] Supabase-Redirect-URLs auf die Produktions-Domain zeigen
- [ ] `robots.txt`/`sitemap.xml` unter der echten Domain geprüft
      (`NEXT_PUBLIC_SITE_URL` korrekt gesetzt)
- [ ] Datenschutz-/AGB-Seiten (`/datenschutz`, `/agb`) von einer
      Rechtsberatung geprüft und ausgefüllt (siehe Platzhalter-Hinweise auf
      den Seiten selbst)
- [ ] Supabase Auth Rate Limits (Dashboard → Authentication → Rate
      Limits) für Produktionslast überprüft
