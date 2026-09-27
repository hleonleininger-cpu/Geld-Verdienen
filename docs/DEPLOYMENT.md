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
   Optional, nur falls die Bezahlfunktion aktiv sein soll (siehe
   `docs/BILLING.md`):
   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put STRIPE_PRICE_STARTER
   npx wrangler secret put STRIPE_PRICE_PRO
   npx wrangler secret put STRIPE_PRICE_BUSINESS
   ```
   Optional, nur falls echter E-Mail-Versand aktiv sein soll (siehe
   `docs/EMAIL.md` – ohne diese Werte läuft `ConsoleEmailProvider`, der nur
   loggt statt zu versenden):
   ```bash
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put EMAIL_FROM_ADDRESS
   ```
   Für lokale Entwicklung gegen die Workers-Runtime (`npm run cf:preview`)
   können dieselben Variablen in einer nicht committeten `.dev.vars`-Datei
   stehen (siehe `.gitignore` – `.dev.vars` ist bereits ausgeschlossen).

   **Wichtig zu `NEXT_PUBLIC_*`-Variablen:** Next.js ersetzt
   `process.env.NEXT_PUBLIC_*` beim `next build` durch den zu diesem
   Zeitpunkt gesetzten Wert – in JEDEM Code, der in ein Client-Bundle
   gebündelt wird. Aktuell liest kein Client-Component-Code diese
   Variablen (nur Server Components/Actions/Middleware, wo `process.env`
   zur Laufzeit aus den Wrangler-Secrets kommt), daher funktioniert das
   Setzen als reines Runtime-Secret bislang problemlos. Sollte künftig
   client-seitiger Supabase-Zugriff (`lib/supabase/client.ts`, aktuell
   ungenutzt) hinzukommen, MÜSSEN `NEXT_PUBLIC_SUPABASE_URL`/
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`NEXT_PUBLIC_SITE_URL` zusätzlich in der
   Shell/CI-Umgebung gesetzt sein, in der `npm run cf:build`/`cf:deploy`
   läuft – ein reines Wrangler-Secret reicht dann nicht mehr, weil der Wert
   sonst als `undefined` in den Browser-Bundle einkompiliert wird.
3. **Deployen:**
   ```bash
   npm run cf:deploy
   ```
   Das baut (`next build` → OpenNext-Bundling) und deployed in einem
   Schritt (`wrangler deploy` intern).
4. **Supabase-Redirect-URLs ergänzen:** Unter Authentication → URL
   Configuration die Produktions-URL (`https://<dein-worker>.workers.dev/auth/callback`
   bzw. deine Custom Domain) als erlaubte Redirect-URL eintragen.
5. **Falls Stripe konfiguriert wurde:** im Stripe-Dashboard unter
   Developers → Webhooks einen Endpunkt auf
   `https://<deine-domain>/api/webhooks/stripe` anlegen (siehe
   `docs/BILLING.md` für die genauen Events und das Signing-Secret).

## Datenbank-Migrationen

- **Neues Supabase-Projekt:** `supabase/schema.sql` einmalig im
  SQL-Editor ausführen (konsolidierter, aktueller Stand – enthält bereits
  alle Migrationen 0001-0005, inkl. Formular-Builder, Terminbuchung,
  Webhook-Idempotenz und Entitlement-Härtung).
- **Bereits bestehendes Projekt** (z. B. vom MVP-Stand vor diesem
  Hardening-Pass): die Dateien unter `supabase/migrations/` der Reihe nach
  ausführen (`0001_initial_schema.sql` … bis `0005_entitlement_hardening.sql`,
  jeweils nur falls noch nicht geschehen).
- **Migration 0004** aktiviert die Postgres-Extension `btree_gist` selbst
  (`create extension if not exists btree_gist;`) – auf Supabase-Standard-
  Projekten ist das Anlegen von Extensions über den SQL-Editor mit dem
  Projekt-eigenen Rechten normalerweise erlaubt; bei einer selbstgehosteten
  Postgres-Instanz ggf. Superuser-Rechte für diesen einen Befehl nötig.
- **Migration 0005** fügt `unique (owner_id)` auf `businesses` hinzu. Falls
  ein bestehendes Projekt (z. B. über `supabase/seed.sql` vor diesem Fix)
  bereits mehrere Businesses unter demselben `owner_id` hat, schlägt diese
  Migration fehl – vorher bereinigen (doppelte Zeilen zusammenführen oder
  löschen).
- **Künftige Änderungen:** immer als neue Datei
  `supabase/migrations/000N_beschreibung.sql` ergänzen UND die
  konsolidierte Fassung in `supabase/schema.sql` nachziehen, damit ein
  Fresh Install weiterhin mit einem einzigen Skript funktioniert.
- Optional: `supabase/seed.sql` für EIN Demo-Unternehmen mit Beispieldaten
  in deinem eigenen Account (Platzhalter-User-ID ersetzen, siehe Kommentar
  im Skript). Alle 5 Branchen-Vorlagen ansehen kannst du ohne eigenen
  Account unter `/demo`.

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
- [ ] Falls Stripe genutzt wird: Webhook-Endpunkt in Stripe angelegt,
      `STRIPE_WEBHOOK_SECRET` gesetzt, Customer Portal im Stripe-Dashboard
      aktiviert (siehe `docs/BILLING.md`)
- [ ] Falls echter E-Mail-Versand gewünscht ist: `RESEND_API_KEY`/
      `EMAIL_FROM_ADDRESS` gesetzt, Absender-Domain in Resend verifiziert
      (siehe `docs/EMAIL.md`) – sonst läuft der Console-Fallback (kein
      Versand, nur Logging)
