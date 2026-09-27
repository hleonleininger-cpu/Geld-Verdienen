# Launch Commands

Jeder Schritt, um von einer frischen Maschine zu einem laufenden
Deployment zu kommen — ohne einen einzigen Schritt zu erraten. Manuelle
Dashboard-Schritte (Supabase, Stripe, Resend, Cloudflare-Domain) lassen
sich nicht per Terminal-Befehl erledigen und sind als **[MANUELL]**
markiert, mit exakter Stelle im jeweiligen Dashboard. Alles andere ist
copy-paste-fähig. Hintergrund zu jedem Schritt: `DEPLOY_CHECKLIST.md`.

## 0. Voraussetzungen prüfen

```bash
node --version   # muss >= 18.17 sein
git --version
```

## 1. [MANUELL] Supabase-Projekt anlegen

1. [supabase.com](https://supabase.com) → New Project.
2. **Settings → API**: `Project URL`, `anon public` Key,
   `service_role` Key notieren.
3. **SQL Editor**: Inhalt von `supabase/schema.sql` einfügen, ausführen.
4. **Authentication → URL Configuration**: Site URL + Redirect URL
   (`http://localhost:3000/auth/callback` fürs Erste) eintragen.

## 2. Repository holen und konfigurieren

```bash
git clone <REPO-URL> anfragepilot
cd anfragepilot
cp .env.example .env
```

Jetzt `.env` in einem Editor öffnen und mindestens diese vier Werte aus
Schritt 1 eintragen:

```bash
# .env
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAILS=<deine-email>
```

## 3. Lokal installieren und verifizieren

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run cf:build
```

Alle fünf Befehle müssen ohne Fehler durchlaufen. Falls einer fehlschlägt:
nicht weiterdeployen, erst den Fehler beheben.

## 4. Lokal smoke-testen

```bash
npm run dev
```

Im Browser: `http://localhost:3000/register` → Konto anlegen → Onboarding
komplett durchlaufen. Danach mit Strg+C beenden.

## 5. [MANUELL] Admin-Zugriff setzen

Im Supabase SQL Editor (Projekt aus Schritt 1):

```sql
update public.users set is_admin = true where email = '<deine-email>';
```

## 6. Cloudflare verbinden und deployen

```bash
npx wrangler login
```

Danach für jeden Wert einmal ausführen (fragt interaktiv nach dem
Geheimnis, tippt nichts sichtbar mit):

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put NEXT_PUBLIC_SITE_URL
npx wrangler secret put ADMIN_EMAILS
```

`NEXT_PUBLIC_SITE_URL` hier ist die ECHTE spätere URL, nicht `localhost`
— z. B. `https://anfragepilot.<dein-account>.workers.dev`, oder schon die
eigene Domain, falls die aus Schritt 9 schon feststeht.

```bash
npm run cf:deploy
```

Die ausgegebene `*.workers.dev`-URL öffnen und smoke-testen (siehe
`DEPLOY_CHECKLIST.md`, Abschnitt 9).

## 7. [MANUELL, optional] Stripe einrichten

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Testmodus.
2. **Product catalog**: 3 Preise anlegen (Starter/Pro/Business),
   Price-IDs notieren.
3. **Developers → Webhooks** → Add endpoint:
   `https://<deine-domain>/api/webhooks/stripe`, Events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.created`, `customer.subscription.deleted`.
   Signing-Secret notieren.
4. **Settings → Billing → Customer portal** aktivieren.

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_STARTER
npx wrangler secret put STRIPE_PRICE_PRO
npx wrangler secret put STRIPE_PRICE_BUSINESS
npm run cf:deploy
```

Test-Checkout mit Kartennummer `4242 4242 4242 4242` (beliebiges
zukünftiges Datum/CVC) durchklicken. Erst danach `sk_test_...`/
Test-Price-IDs durch `sk_live_...`/Live-Price-IDs ersetzen (gleiche
`wrangler secret put`-Befehle erneut, dann erneut `npm run cf:deploy`).

## 8. [MANUELL, optional] Resend einrichten

1. [resend.com](https://resend.com) → Account anlegen.
2. Domain hinzufügen, angezeigte DNS-Einträge beim Domain-Registrar
   setzen, auf "verified" warten.
3. API-Key erzeugen.

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM_ADDRESS
npm run cf:deploy
```

## 9. [MANUELL, optional] Eigene Domain einrichten

1. Cloudflare-Dashboard → Workers & Pages → dein Worker →
   **Settings → Domains & Routes → Add → Custom Domain** → Domain
   eingeben.
2. Falls die Domain nicht schon bei Cloudflare liegt: angezeigte
   DNS-Einträge beim aktuellen Registrar setzen.

```bash
npx wrangler secret put NEXT_PUBLIC_SITE_URL   # neue Domain eintragen
npm run cf:deploy
```

Danach in Supabase (**Authentication → URL Configuration**) und, falls
genutzt, in Stripe (Webhook-Endpunkt-URL) die neue Domain nachziehen.

## 10. Abschluss-Smoke-Test

Komplette Checkliste: `DEPLOY_CHECKLIST.md`, Abschnitt 9. Kurzfassung:

```
/                          → lädt, CTAs funktionieren
/demo                      → alle 5 Tabs bedienbar
/register → Onboarding     → landet in /dashboard
/<dein-slug>                → Anfrage abschicken (Inkognito)
/dashboard                 → Anfrage + Benachrichtigung sichtbar
Angebot erstellen + senden → /q/<token> öffnen (Inkognito) → annehmen
Termin auswählen           → falls Pro-Plan/Trial aktiv
/pricing                   → Checkout öffnet echte Stripe-Seite (falls konfiguriert)
/admin                     → Kennzahlen sichtbar
```

Fertig — live.
