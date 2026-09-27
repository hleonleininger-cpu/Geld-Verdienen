# Deploy Checklist

Eine einzige, lineare Checkliste für den ersten echten Deploy. Für
Hintergrund/Begründung siehe `docs/DEPLOYMENT.md`, `docs/BILLING.md`,
`docs/EMAIL.md`, `docs/SECURITY.md` — diese Datei hier ist die
Kurzfassung zum Abhaken, in der Reihenfolge, die tatsächlich funktioniert.

Voraussetzungen: Node.js ≥ 18.17, ein Supabase-Account, ein
Cloudflare-Account mit Workers aktiviert. Optional: Stripe-Account
(Zahlungen), Resend-Account (E-Mail-Versand), eine eigene Domain.

Der komplette Ablauf als eine Befehlskette steht am Ende dieser Datei
und in `LAUNCH_COMMANDS.md`.

---

## 1. Supabase-Projekt einrichten

- [ ] Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen.
- [ ] **Settings → API** öffnen, notieren:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon` `public` Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` Key → `SUPABASE_SERVICE_ROLE_KEY` (geheim, nie im Client)
- [ ] **SQL Editor** öffnen, den kompletten Inhalt von `supabase/schema.sql`
      einfügen und ausführen. Dieses eine Skript enthält bereits den
      konsolidierten Stand aller Migrationen (0001–0005): Kernschema,
      RLS, Formular-Builder, Terminbuchung (inkl. `btree_gist`-Extension),
      Webhook-Idempotenz, Entitlement-Härtung.
  - Bei einem bereits bestehenden, älteren Projekt stattdessen die
    Dateien unter `supabase/migrations/` der Reihe nach ausführen
    (`0001_initial_schema.sql` … `0005_entitlement_hardening.sql`), nur
    die, die noch nicht angewendet wurden.
- [ ] **Authentication → URL Configuration**: Site URL und Redirect URLs
      auf `http://localhost:3000` (lokal) **und** die spätere
      Produktions-URL setzen (z. B. `https://anfragepilot.deine-domain.de`
      bzw. `https://<worker-name>.<account>.workers.dev`), jeweils mit
      `/auth/callback` am Ende.
- [ ] Optional: `supabase/seed.sql` im SQL Editor ausführen, um EIN
      Demo-Unternehmen mit Beispieldaten in deinem eigenen Account zu
      sehen (Platzhalter-User-ID im Skript zuerst durch deine eigene
      ersetzen – Account unter `/register` anlegen, User-ID unter
      Authentication → Users kopieren). Nicht nötig, um zu starten: alle
      5 Branchen-Vorlagen sind ohne jeden Account unter `/demo` sichtbar.

## 2. Erstes lokales Setup + Verifikation

- [ ] `cp .env.example .env` und die drei Supabase-Werte aus Schritt 1
      eintragen, plus `NEXT_PUBLIC_SITE_URL=http://localhost:3000` und
      `ADMIN_EMAILS=deine@email.de`.
- [ ] `npm install`
- [ ] Alle fünf Verifikationsbefehle müssen grün sein, bevor irgendetwas
      deployed wird:
  ```bash
  npm run typecheck
  npm run lint
  npm test
  npm run build
  npm run cf:build
  ```
- [ ] `npm run dev` und lokal durchklicken: `/register` → Onboarding →
      `/dashboard` → eigene Anfrageseite unter `/<dein-slug>` im
      Inkognito-Fenster öffnen und eine Test-Anfrage abschicken.

## 3. Admin-Zugriff einrichten

- [ ] Einen Account über `/register` anlegen (falls noch nicht in
      Schritt 2 geschehen).
- [ ] Im Supabase SQL Editor:
  ```sql
  update public.users set is_admin = true where email = 'deine@email.de';
  ```
- [ ] `/admin` aufrufen und bestätigen, dass die Wachstums-Kennzahlen
      erscheinen (nicht auf `ADMIN_EMAILS` allein verlassen – das ist nur
      der Bootstrap-Fallback, bevor `is_admin` gesetzt ist).

## 4. Wrangler / Cloudflare verbinden

- [ ] `npx wrangler login` (öffnet den Browser, Cloudflare-Account
      autorisieren).
- [ ] Alle benötigten Secrets setzen (fragt interaktiv nach dem Wert):
  ```bash
  npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
  npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  npx wrangler secret put NEXT_PUBLIC_SITE_URL
  npx wrangler secret put ADMIN_EMAILS
  ```
  **Wichtig:** `NEXT_PUBLIC_SITE_URL` hier ist die ECHTE Produktions-URL
  (Worker-URL oder eigene Domain), nicht `localhost`.

## 5. Erstes Deployment (ohne Stripe/Resend)

- [ ] `npm run cf:deploy` (baut und deployed in einem Schritt).
- [ ] Die ausgegebene `*.workers.dev`-URL öffnen, `/register` →
      Onboarding komplett durchlaufen, öffentliche Seite ansehen.
- [ ] Falls Login/Registrierung mit einem Redirect-Fehler abbricht: die
      Worker-URL in Supabase (Schritt 1, URL Configuration) noch
      eintragen — das ist der häufigste erste Stolperstein.

## 6. Stripe einrichten (optional – ohne diese Schritte läuft die App normal, `/dashboard/billing` zeigt nur "nicht eingerichtet")

Details/Hintergrund: `docs/BILLING.md`.

- [ ] Stripe-Account anlegen/öffnen, im **Testmodus** bleiben für den
      ersten Durchlauf.
- [ ] **Product catalog**: drei wiederkehrende Preise anlegen (Starter,
      Pro, Business), jeweils die Price-ID notieren.
- [ ] **Developers → Webhooks**: Endpunkt anlegen auf
      `https://DEINE-DOMAIN/api/webhooks/stripe`, Events abonnieren:
      `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.created`, `customer.subscription.deleted`.
      Signing-Secret (`whsec_...`) notieren.
- [ ] **Settings → Billing → Customer portal** aktivieren (wird für
      "Abo verwalten" gebraucht).
- [ ] Secrets setzen:
  ```bash
  npx wrangler secret put STRIPE_SECRET_KEY
  npx wrangler secret put STRIPE_WEBHOOK_SECRET
  npx wrangler secret put STRIPE_PRICE_STARTER
  npx wrangler secret put STRIPE_PRICE_PRO
  npx wrangler secret put STRIPE_PRICE_BUSINESS
  ```
- [ ] `npm run cf:deploy` erneut (Secrets werden erst nach einem neuen
      Deploy wirksam).
- [ ] Test-Checkout mit einer [Stripe-Testkarte](https://docs.stripe.com/testing)
      (`4242 4242 4242 4242`, beliebiges zukünftiges Datum/CVC)
      durchklicken, danach in Supabase prüfen, dass
      `businesses.subscription_status` auf `active` steht.
- [ ] Erst wenn der Test-Checkout funktioniert: `sk_test_...`/Test-Preise
      durch `sk_live_...`/Live-Preise ersetzen (neue
      `wrangler secret put`-Aufrufe, dann erneut deployen).

## 7. Resend einrichten (optional – ohne diese Schritte läuft die App normal, E-Mails werden nur geloggt statt versendet)

Details/Hintergrund: `docs/EMAIL.md`.

- [ ] Account auf [resend.com](https://resend.com) anlegen.
- [ ] Absender-Domain hinzufügen und die angezeigten DNS-Einträge (SPF/
      DKIM) bei deinem Domain-Registrar setzen; warten, bis Resend die
      Domain als "verified" anzeigt.
- [ ] API-Key erzeugen.
- [ ] Secrets setzen:
  ```bash
  npx wrangler secret put RESEND_API_KEY
  npx wrangler secret put EMAIL_FROM_ADDRESS
  ```
  (`EMAIL_FROM_ADDRESS` z. B. `AnfragePilot <no-reply@deine-domain.de>` —
  die Domain muss zur gerade verifizierten Resend-Domain passen.)
- [ ] `npm run cf:deploy` erneut.
- [ ] Eine echte Test-Anfrage über die eigene Anfrageseite abschicken und
      prüfen, dass die Lead-Benachrichtigung tatsächlich im Postfach
      ankommt (nicht nur im Server-Log).

## 8. Eigene Domain einrichten (optional)

- [ ] Cloudflare-Dashboard → Workers & Pages → dein Worker →
      **Settings → Domains & Routes → Add → Custom Domain**.
- [ ] Domain eingeben; falls die Domain-DNS bereits bei Cloudflare liegt,
      wird der Eintrag automatisch angelegt. Sonst die angezeigten
      DNS-Einträge beim aktuellen Registrar setzen.
- [ ] `NEXT_PUBLIC_SITE_URL` per `wrangler secret put` auf die neue Domain
      aktualisieren, danach `npm run cf:deploy`.
- [ ] Supabase **Authentication → URL Configuration** auf die neue Domain
      aktualisieren (Site URL + Redirect URL mit `/auth/callback`).
- [ ] Falls Stripe genutzt wird: Webhook-Endpunkt in Stripe auf die neue
      Domain umstellen.

## 9. Smoke-Test-Checkliste (nach jedem Deploy)

Einmal komplett durchklicken, auf der echten (Produktions-)URL:

- [ ] `/` lädt, "Kostenlos starten" und "Demo ansehen" funktionieren.
- [ ] `/demo` lädt und alle 5 Tabs sind bedienbar (rein clientseitig,
      kein Login nötig).
- [ ] `/register` → Konto anlegen → komplettes Onboarding (10 Schritte)
      → landet in `/dashboard`.
- [ ] Öffentliche Anfrageseite (`/<dein-slug>`) im Inkognito-Fenster:
      Anfrage abschicken.
- [ ] Anfrage erscheint im Dashboard unter "Anfragen"; Benachrichtigung
      im Glocken-Icon erscheint.
- [ ] Angebot aus der Anfrage erstellen, versenden.
- [ ] Den Angebots-Link (`/q/<token>`) im Inkognito-Fenster öffnen,
      annehmen.
- [ ] Falls Pro-Plan/Trial aktiv: Termin auswählen und bestätigen lassen.
- [ ] `/pricing` zeigt alle vier Pläne korrekt; falls Stripe konfiguriert:
      Checkout-Button öffnet eine echte Stripe-Checkout-Seite.
- [ ] `/dashboard/billing`: "Abo verwalten" öffnet das Stripe Customer
      Portal (falls konfiguriert).
- [ ] `/admin` zeigt Kennzahlen (mit dem in Schritt 3 markierten Account).
- [ ] `/robots.txt` und `/sitemap.xml` laden und zeigen die echte Domain.
- [ ] `/datenschutz` und `/agb` laden (Platzhalter-Hinweis ist erwartet,
      siehe unten "Bekannte Lücken").

## Bekannte Lücken (bewusst nicht Teil dieses Deploys)

- `/datenschutz`/`/agb` sind technische Gerüste mit Platzhaltern — vor
  echtem Kundenverkehr von einer Rechtsberatung prüfen lassen.
- Die pgTAP-Tests unter `supabase/tests/database/` wurden nie gegen ein
  echtes Supabase-Projekt ausgeführt (kein Docker in der Build-Sandbox).
  Empfohlen, aber nicht blockierend: `supabase test db` einmal lokal
  laufen lassen, bevor echte Kundendaten reinkommen.

---

## Alles als eine Befehlskette (frische Maschine → live)

Siehe `LAUNCH_COMMANDS.md` für die vollständige, kommentierte Version.
Kurzfassung (Platzhalter in `<...>` ersetzen; Supabase-Projekt + SQL-Editor-
Schritt 1 müssen vorher manuell erledigt sein, das lässt sich nicht per
Terminal-Befehl erledigen):

```bash
git clone <repo-url> && cd Geld-Verdienen
cp .env.example .env   # dann die Supabase-Werte eintragen
npm install
npm run typecheck && npm run lint && npm test && npm run build && npm run cf:build

npx wrangler login
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put NEXT_PUBLIC_SITE_URL
npx wrangler secret put ADMIN_EMAILS

npm run cf:deploy
```
