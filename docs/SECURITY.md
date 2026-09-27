# Security

Dieses Dokument fasst die Sicherheitsmaßnahmen von AnfragePilot nach dem
Production-Hardening-Pass zusammen: was geprüft wurde, was gefunden und
behoben wurde, und was bewusst (noch) nicht umgesetzt ist.

Hinweis zum Datenmodell: Tabellen wie `business_members`, `customers`,
`tasks`, `files`, `products`, `orders` existieren in AnfragePilot weiterhin
**nicht** (bewusst nicht gebaute Features, siehe `docs/PROJECT_STATUS.md`).
Seit der Produkt-Phase bzw. Conversion-Funnel-Phase kamen dagegen echte
neue Tabellen hinzu: `services`, `activity_events`, `notifications`,
`referral_events`, `analytics_events` (siehe Abschnitt 1a) sowie
`request_forms`, `request_form_fields`, `blocked_times`, `appointments`,
`processed_webhook_events` (siehe Abschnitt 1b). Alles unten bezieht sich
auf das tatsächliche Schema in `supabase/schema.sql`.

## 1. Row Level Security (RLS)

Alle vier Tabellen (`users`, `businesses`, `leads`, `quotes`) haben RLS
aktiv. Zusammenfassung je Tabelle:

| Tabelle | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `users` | nur eigene Zeile | – (nur via Trigger `handle_new_auth_user`, `security definer`) | nur eigene Zeile | – |
| `businesses` | eigene Zeile ODER öffentlich (anon+authenticated, `using (true)`) – bewusst öffentlich, da `/[businessSlug]` eine Marketing-/Kontaktseite ist | nur mit `owner_id = auth.uid()` | nur eigene Zeile, **mit** `with check` (verhindert Umbiegen von `owner_id`) | nur eigene Zeile |
| `leads` | nur über eigenes Business | anon+authenticated für JEDE existierende `business_id` (öffentliches Formular) | nur eigenes Business, **mit** `with check` (verhindert Umbiegen von `business_id`) | nur eigenes Business |
| `quotes` | nur über eigenen Lead/Business | nur für eigenen Lead | nur eigener Lead, **mit** `with check` (verhindert Umbiegen von `lead_id`) | nur eigener Lead |

### Gefundene und behobene Probleme

1. **Fehlendes `WITH CHECK` auf UPDATE-Policies** (businesses, leads,
   quotes): Vorher konnte – rein über die Datenbank-API, unabhängig von der
   Next.js-App – ein Owner beim UPDATE einer eigenen Zeile die
   Fremdschlüssel-Spalte (`owner_id`/`business_id`/`lead_id`) auf einen
   fremden Datensatz umbiegen. `USING` prüft nur, welche Zeilen VOR dem
   Update sichtbar/änderbar sind, nicht wie die Zeile NACH dem Update
   aussehen darf. Fix: identische Bedingung zusätzlich als `WITH CHECK`.
2. **`businesses_select_public` nur für `anon`**: Ein eingeloggter Nutzer,
   der die öffentliche Anfrageseite eines ANDEREN Unternehmens besuchte,
   bekam fälschlich eine 404 (funktionaler Bug, kein Datenleck – aber die
   Behebung musste sorgfältig geprüft werden, um kein Datenleck zu
   erzeugen; siehe unten). Fix: Policy gilt jetzt für `anon, authenticated`.
3. **Storage – `attachments_public_insert` ohne Pfad-Validierung**: Jeder
   konnte Dateien unter einem beliebigen, frei erfundenen Ordnernamen in den
   privaten `lead-attachments`-Bucket hochladen. Fix: Das erste Pfadsegment
   muss syntaktisch eine UUID sein UND als `business_id` tatsächlich
   existieren.
4. **Storage – keine Größen-/Typ-Limits auf Bucket-Ebene**: App-seitige
   Validierung (Dateigröße/MIME-Type) kann umgangen werden, wenn jemand
   direkt mit dem öffentlichen `anon`-Key gegen die Supabase-Storage-API
   postet. Fix: `file_size_limit` und `allowed_mime_types` zusätzlich auf
   `storage.buckets` gesetzt (Defense-in-Depth, siehe "Do not rely on UI
   restrictions as authorization").

### Auswirkung von Fix #2 auf die Sicherheit

Die Öffnung von `businesses_select_public` für `authenticated` wurde
gezielt daraufhin geprüft, ob sie eine neue Cross-Tenant-Lücke aufreißt:

- `leads`/`quotes`-Policies filtern über `owner_id = auth.uid()` in einer
  Unterabfrage auf `businesses` – das bleibt korrekt, weil Postgres die
  explizite `WHERE`-Bedingung der Unterabfrage UND die RLS-Policy der
  Unterabfrage kombiniert (mehr Sichtbarkeit auf `businesses` macht die
  `WHERE owner_id = auth.uid()`-Filterung nicht ungenauer).
- `app/quotes/[quoteId]/page.tsx` fragte VOR dieser Änderung implizit
  `businesses` mit der Annahme ab, dass nur der Owner die Zeile sehen kann.
  Da das jetzt nicht mehr gilt, wurde dort zusätzlich ein expliziter
  `if (business.owner_id !== user.id) notFound()`-Check ergänzt (Defense-
  in-Depth; die Seite war durch die vorgelagerten `quotes`/`leads`-RLS-
  Checks tatsächlich schon abgesichert, da deren SELECT-Policies strikt
  auf den Owner beschränkt bleiben – der zusätzliche Check macht das aber
  explizit und robust gegen künftige Refactorings).

## 1a. RLS für die Produkt-Phase (services, activity_events, notifications, referral_events, analytics_events)

| Tabelle | SELECT | INSERT | UPDATE/DELETE |
| --- | --- | --- | --- |
| `services` | Owner sieht alle eigenen; `anon`+`authenticated` sehen nur `active = true` (für die Mini-Site) | nur eigenes Business | nur Owner |
| `activity_events` | **nur Owner** – bewusst keine anon-Policy, auch kundenausgelöste Events (`quote_viewed` etc.) werden ausschließlich über die RPC `record_public_quote_event` eingefügt (SECURITY DEFINER, umgeht RLS) | nur Owner (für owner-initiierte Events wie `status_changed`) | – |
| `notifications` | nur Owner | Owner-initiiert direkt; kundenausgelöste ebenfalls über `record_public_quote_event` | nur Owner (z. B. "als gelesen markieren") |
| `referral_events` | Owner sieht nur Events zum **eigenen** `referral_code` | `anon`+`authenticated` dürfen ein Klick-/Signup-Event anlegen (`with check (true)`) | – |
| `analytics_events` | **niemand** über PostgREST – bewusst keine SELECT-Policy, nicht einmal für den eigenen Owner (vermeidet unnötige Exposition von Produkt-Telemetrie); lesbar ausschließlich über den Service-Role-Client (`/admin`) | `anon`+`authenticated` dürfen inserten, aber nur mit einem `event_name` aus einer festen Allowlist (`CHECK`-Constraint in der Policy selbst) | – |

**Oeffentlicher Angebots-Zugriff (`quotes`, Phase 4/5):** Ein Kunde liest
und aktualisiert ein Angebot NIE direkt über `quotes`/`leads` (dafür gibt
es keine anon-Policy) – ausschließlich über zwei eng gefasste
`SECURITY DEFINER`-Funktionen, identifiziert über das zufällige
`public_token` (nicht die fortlaufende `id`):

- `get_public_quote(p_public_token)` – liest ein einzelnes Angebot inkl.
  Kunden-/Business-Kontext als `jsonb`.
- `record_public_quote_event(p_public_token, p_event)` – einziger Weg, wie
  ein Kunde `viewed`/`accepted`/`declined` auslösen kann. Setzt
  serverseitig durch: nur `sent`/`viewed` → `accepted`/`declined` (sonst
  `raise exception 'invalid_transition'`), kein Handeln nach Ablauf von
  `valid_until` (`raise exception 'expired'`, lazy statt Cron-basiert –
  siehe `docs/MONETIZATION.md`), unbekanntes `p_event` wird abgelehnt.
  Getestet in `supabase/tests/database/05_public_quote_portal.test.sql`.

**Admin-Aggregation (`admin_funnel_counts`):** Ebenfalls `SECURITY
DEFINER`, aber explizit `revoke ... from public` + `grant ... to
service_role` – nur über den Service-Role-Client aufrufbar, nicht über
`anon`/`authenticated` (anders als die beiden Quote-Funktionen oben, die
bewusst öffentlich nutzbar sein müssen).

**Anfrage-Erstellung als Trigger statt App-Code:** Ein neuer Lead erzeugt
automatisch ein `activity_events`- und ein `notifications`-Row über den
Trigger `log_lead_created_activity` (`SECURITY DEFINER`, an
`public.leads` gehängt) – auch für den anonymen Insert über das
öffentliche Formular, da Trigger-Funktionen mit den Rechten ihres
Definers laufen, nicht des aufrufenden `anon`-Keys.

## 1b. RLS für die Conversion-Funnel-Phase (Formular-Builder, Termine, Webhook-Idempotenz)

| Tabelle | SELECT | INSERT | UPDATE/DELETE |
| --- | --- | --- | --- |
| `request_forms` | Owner sieht alle eigenen; `anon`+`authenticated` sehen nur `active = true` UND zugehöriges Business `published = true` | nur Owner, **und nur mit** `business_has_custom_forms_feature()` (Pro-Plan – siehe unten) | nur Owner (Update bewusst NICHT gegated, damit ein bestehendes Formular nach einem Downgrade weiter nutzbar bleibt) |
| `request_form_fields` | Owner sieht alle eigenen (über `form_id`); `anon`+`authenticated` sehen nur Felder eines aktiven Formulars eines veröffentlichten Business | nur Owner des zugehörigen Formulars | nur Owner |
| `blocked_times` | nur Owner | nur Owner | nur Owner |
| `appointments` | nur Owner | **keine** anon/authenticated-Policy – Buchung ausschließlich über die RPC `book_appointment` | nur Owner (mit `WITH CHECK`) |
| `processed_webhook_events` | **niemand** über PostgREST (keine Policy, auch nicht für den Owner) – nur der Service-Role-Client (Webhook-Route) | wie SELECT: nur Service-Role | wie SELECT: nur Service-Role |

**Gefundenes und behobenes Problem (Audit vor dem ersten zahlenden
Kunden):** `custom_forms` (Formular-Builder, Pro-Plan) wurde zunächst nur
in der Server Action `createForm()` geprüft, nicht in RLS – anders als
`calendar` (Terminbuchung), das von Anfang an über
`business_has_calendar_feature()` auch auf DB-Ebene durchgesetzt wurde. Ein
Free-Plan-Nutzer hätte per direktem PostgREST-Request (eigener JWT, ohne
die Next.js-App) ein `request_forms`-Row anlegen und aktivieren können.
Fix (Migration `0005_entitlement_hardening.sql`): eine neue Funktion
`business_has_custom_forms_feature()` (identische Logik wie
`business_has_calendar_feature()`) wird jetzt zusätzlich in der
`WITH CHECK`-Klausel von `request_forms_insert_own` geprüft. Nur das
Anlegen ist gegated, nicht das Bearbeiten – ein Downgrade darf ein
bestehendes Formular nicht unbrauchbar machen.

**Terminbuchung – Doppelbuchung ist auf DB-Ebene ausgeschlossen:** Die
generierte Spalte `appointments.time_range` (`tstzrange`) trägt eine
`EXCLUDE USING gist (business_id WITH =, time_range WITH &&)`-Constraint
(benötigt die Extension `btree_gist`). Das ist kein Race-Condition-Risiko:
Postgres prüft Exclusion-Constraints wie Unique-Constraints atomar beim
Insert – zwei gleichzeitige Buchungsversuche für denselben Slot serialisieren
sich, der zweite schlägt mit `exclusion_violation` fehl (von
`book_appointment()` als `slot_unavailable` weitergereicht). Die RPC prüft
zusätzlich Geschäftszeiten/blockierte Zeiten serverseitig (nicht nur der
UI-berechnete Slot wird vertraut), bevor sie den Insert versucht.

**Terminbuchung – Feature-Gate:** `business_has_calendar_feature()` (siehe
Abschnitt 5a bzw. `supabase/schema.sql`) spiegelt `lib/entitlements.ts` und
wird sowohl von `get_available_appointment_slots()` als auch von
`book_appointment()` geprüft – beide geben bei fehlendem Feature `[]`
bzw. `raise exception 'feature_not_available'` zurück, unabhängig davon,
was das Frontend anzeigt.

## 2. Autorisierung in Server Actions (nicht nur RLS)

Jede Mutation in `app/dashboard/leads/actions.ts` und
`app/dashboard/actions.ts` scoped ihre Query zusätzlich zu RLS explizit auf
`business_id`/`owner_id` des eingeloggten Nutzers (z. B.
`.eq("business_id", business.id)`), statt einer vom Client übergebenen
`lead_id`/`business_id` blind zu vertrauen. Das ist **zusätzlich** zu RLS,
nicht anstelle davon: Selbst wenn eine Policy versehentlich fehlerhaft
wäre, würde die App-Ebene den Zugriff trotzdem verweigern, und umgekehrt.

Gefundene und behobene Probleme:

- **Open Redirect über `?redirectTo=`** (Login-Flow): `redirectTo` wurde
  ungeprüft an `redirect()` durchgereicht. Ein Link wie
  `/login?redirectTo=https://phishing.example` hätte nach einem ECHTEN,
  erfolgreichen Login auf eine fremde Seite umgeleitet. Fix:
  `lib/safeRedirect.ts::safeRedirectTarget()` lässt nur relative,
  selbst-referenzierende Pfade zu (kein `//`, kein `/\`).
- **Rohe Datenbank-/Auth-Fehler an den Client**: Mehrere Server Actions
  gaben `error.message` aus Postgres direkt an den Client zurück. Fix:
  generische, deutsche Fehlermeldungen an den Nutzer; das Original wird
  über `lib/logger.ts` serverseitig geloggt (siehe Abschnitt Observability
  in `docs/ARCHITECTURE.md`). Ausnahme: Supabase-Auth-Fehlermeldungen
  (`signUp`/`updateUser`) sind bereits kuratierte, nutzersichere Texte von
  Supabase selbst, keine rohen DB-Fehler – die werden unverändert
  angezeigt, aber zusätzlich geloggt.
- **Fehlende MIME-Validierung beim Logo-Upload**: `updateBusinessProfile`
  validierte nur die Dateigröße, nicht den Dateityp (anders als der
  Lead-Anhang-Upload). Fix: gleiche Allowlist wie beim Anhang-Upload.

Es gibt **kein** Rollenmodell (MEMBER/OWNER) – jedes Business hat genau
einen Owner. Der Punkt "MEMBER cannot perform OWNER-only operations" aus
der Aufgabenstellung ist daher für den aktuellen Funktionsumfang nicht
anwendbar; sollte ein Team-Feature ergänzt werden, müsste diese Prüfung neu
aufgebaut werden.

## 3. Admin-Autorisierung

**Vorher:** `/admin` prüfte ausschließlich `ADMIN_EMAILS` (Server-Env-Var).
Funktional bereits sicher (Server-only, nie im Client-Bundle, siehe
`.env.example`), aber nicht "DB-backed" und für einen zweiten Admin nur
über einen Deployment-Redeploy änderbar.

**Jetzt:** `public.users.is_admin` (Boolean-Spalte) ist die produktive
Autorisierungsquelle. Sie kann **ausschließlich** über den
Service-Role-Key oder direkt im SQL-Editor gesetzt werden – es existiert
bewusst **keine** RLS-UPDATE-Policy dafür, über die sich ein Nutzer selbst
zum Admin machen könnte (nur `users_update_own` existiert, und die deckt
per Definition keine neue Spalte mit ab, sofern man keine
UPDATE-Policy dafür anlegt – hier wurde bewusst keine angelegt).
`ADMIN_EMAILS` bleibt als Server-only-Bootstrap-Fallback bestehen (z. B.
für den allerersten Admin-Zugriff auf einer frischen Datenbank, bevor
`is_admin` gesetzt wurde). Beide Quellen werden serverseitig in
`lib/supabase/admin.ts::isCurrentUserAdmin()` geprüft – niemals über
Client-State oder eine Bedingung im UI.

So setzt du dich selbst als Admin (einmalig, im Supabase SQL-Editor):

```sql
update public.users set is_admin = true where email = 'du@deine-domain.de';
```

## 4. Storage

Siehe Abschnitt 1 für die RLS-Policies. Zusammenfassung, wer was darf:

| Bucket | Öffentlich lesbar? | Wer darf schreiben? |
| --- | --- | --- |
| `logos` | Ja (bewusst – wird auf der öffentlichen Anfrageseite angezeigt) | Nur der Owner, nur in den eigenen `uid/`-Ordner |
| `lead-attachments` | Nein | Jeder darf hochladen (öffentliches Formular), aber nur unter einer existierenden `business_id` als Ordnername; lesen darf nur der jeweilige Business-Owner |

Dateigröße/-typ sind sowohl app-seitig (bessere Fehlermeldungen) als auch
auf Bucket-Ebene (harte Grenze, siehe Abschnitt 1) begrenzt.

## 5. Rate-Limiting / Missbrauchsschutz

- **Öffentliches Anfrageformular:** `public.check_and_record_lead_attempt`
  (SECURITY DEFINER, siehe `supabase/schema.sql`) begrenzt auf 5 Anfragen
  pro Business+IP-Hash-Kombination pro Stunde. Die IP wird nur gehasht
  (SHA-256, `lib/rateLimit.ts`) gespeichert, nie im Klartext. Die
  Roh-Tabelle ist über PostgREST nicht erreichbar (RLS an, keine
  Policies), Zugriff ausschließlich über die eine, eng gefasste Funktion.
- **Authentifizierung / Passwort-Reset:** Nutzt die eingebauten Rate-Limits
  von Supabase Auth (projektweit konfigurierbar im Supabase-Dashboard unter
  Authentication → Rate Limits) – hier wurde bewusst nichts dupliziert.
- **Datei-Upload:** Größen-/Typ-Limits (siehe Abschnitt 4) reduzieren das
  Missbrauchspotenzial; ein dediziertes Upload-Rate-Limit gibt es (noch)
  nicht, da Uploads nur im Kontext einer bereits rate-limitierten
  Anfrage-Submission passieren.
- **Zukünftige API-Routen:** Sollte künftig eine echte `/api/*`-Route
  entstehen, sollte sie denselben Rate-Limit-Mechanismus (Tabelle + RPC
  oder eine generalisierte Variante davon) wiederverwenden.

## 5a. Stripe-Webhook-Signaturprüfung

`app/api/webhooks/stripe/route.ts` ist der einzige öffentlich erreichbare
Endpunkt, der Daten von einem Drittanbieter entgegennimmt und daraufhin
`businesses.plan`/`subscription_status` schreibt. Schutzmaßnahmen (siehe
`lib/billing/stripe.ts::verifyWebhook`):

- HMAC-SHA256-Signaturprüfung des exakten Rohbodys gegen
  `STRIPE_WEBHOOK_SECRET` (Web-Crypto-API, `crypto.subtle`), Vergleich in
  konstanter Zeit (`timingSafeEqualHex`) statt `===`.
- Replay-Schutz: ein `Stripe-Signature`-Zeitstempel älter als 5 Minuten
  wird abgelehnt.
- Bei fehlender/ungültiger Signatur antwortet die Route mit `400`, OHNE
  irgendetwas zu verarbeiten – es gibt keinen "vertraue trotzdem"-Pfad.
- Ist Stripe nicht konfiguriert (keine Keys gesetzt), antwortet die Route
  mit `200`/`not_configured` statt zu crashen oder ungeprüfte Daten
  anzunehmen.

Getestet in `tests/unit/stripeWebhook.test.ts` (gültige Signatur,
manipulierter Body, falsches Secret, abgelaufener Zeitstempel, nicht
konfigurierter Provider).

## 6. Secrets

- `SUPABASE_SERVICE_ROLE_KEY` wird ausschließlich in
  `lib/supabase/admin.ts` gelesen, das ausschließlich von
  `app/admin/page.tsx` (Server Component) und dem Stripe-Webhook
  (`app/api/webhooks/stripe/route.ts`, kein Nutzer-Kontext vorhanden)
  importiert wird – kein Client-Bundle-Pfad dorthin (geprüft per `grep`
  über das gesamte Repo).
- `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` sind wie
  `SUPABASE_SERVICE_ROLE_KEY` reine Server-Env-Variablen (kein
  `NEXT_PUBLIC_`-Präfix), gelesen ausschließlich in `lib/billing/stripe.ts`.
  Beide sind optional – ohne sie ist die Bezahlfunktion inaktiv statt
  unsicher (siehe `docs/BILLING.md`).
- Alle `NEXT_PUBLIC_*`-Variablen sind bewusst öffentlich (Supabase-URL und
  `anon`-Key sind laut Supabase-Architektur dafür ausgelegt, öffentlich zu
  sein – RLS ist die eigentliche Grenze, nicht Geheimhaltung des Keys).
- `.env`, `.env*.local`, `.dev.vars`, `.wrangler/`, `.open-next/` sind
  gitignored. `.env.example` enthält ausschließlich Platzhalterwerte.
- Kein Treffer für Muster wie `sk_live`, private PEM-Keys, GitHub-Tokens
  o. Ä. im Repository (Stand dieser Prüfung).

## 7. Eingabevalidierung

Jede Mutation validiert serverseitig mit Zod, bevor irgendetwas an
Supabase geschickt wird (Browser-`required`/`type="email"`-Attribute sind
nur UX):

- `lib/leadSchema.ts` – öffentliches Anfrageformular
- `lib/validation.ts` – Status-Update, Erinnerung, Angebot,
  Unternehmens-Profil/-Anlage

Zusätzlich spiegeln DB-seitige `CHECK`-Constraints (siehe
`supabase/schema.sql`) die wichtigsten Längen-/Format-Regeln – falls
jemand die Next.js-App umgeht und direkt gegen PostgREST postet.

## 8. Tests: RLS mit pgTAP

`supabase/tests/database/*.test.sql` enthält pgTAP-Tests für Allow/Deny-
Verhalten (Cross-Tenant-Isolation, WITH-CHECK-Regressionstests, Storage-
Pfad-Validierung) nach dem von Supabase dokumentierten Muster
(`tests.create_supabase_user`, `tests.authenticate_as`, …). Seit der
Produkt-Phase zusätzlich:

- `05_public_quote_portal.test.sql` – `get_public_quote`/
  `record_public_quote_event` end-to-end: unbekanntes Token, Statuswechsel
  `sent → viewed → accepted`, automatisches `lead.status = 'won'`,
  abgelehnte Transition nach Annahme, abgelaufenes Angebot kann nicht mehr
  angenommen werden, Timeline-/Notification-Erzeugung.
- `06_product_phase_rls.test.sql` – `services` (öffentlich nur `active`),
  `activity_events`/`notifications` (keine anon-Policy, kein
  Fremdzugriff), `referral_events` (anon-Insert, Owner sieht nur eigenen
  Code), `analytics_events` (Allowlist-`CHECK`, kein Fremd-Insert
  akzeptiert).

**Wichtiger Hinweis zur Ausführung:** Diese Tests wurden in der Sandbox,
in der dieser Hardening-Pass entstand, **nicht ausgeführt** – `supabase
start` benötigt einen laufenden Docker-Daemon, der dort nicht verfügbar
war (`docker info` meldete "Cannot connect to the Docker daemon"). Die
Tests folgen exakt der von Supabase dokumentierten Struktur und Syntax,
sollten aber vor dem ersten produktiven Vertrauen darauf lokal verifiziert
werden:

```bash
supabase start
supabase test db
```

## 9. Bekannte Restrisiken / nicht umgesetzt

- Kein automatisierter Penetrationstest.
- `npm audit` meldet Findings ausschließlich in `devDependencies`
  (`vitest`/`vite`/`esbuild`, siehe `docs/PROJECT_STATUS.md`) – betreffen
  nur lokale Test-/Build-Tooling, nicht den ausgelieferten Produktionscode.
- `proxy.ts` läuft im laut `@opennextjs/cloudflare` "experimentellen"
  Node.js-Middleware-Modus (siehe `docs/DEPLOYMENT_ARCHITECTURE.md`) – die
  eigentliche Zugriffskontrolle liegt aber in RLS + expliziten
  Server-Component-Checks, nicht im Proxy.
- Kein Content-Security-Policy-Header konfiguriert (könnte als weitere
  Verteidigungslinie gegen XSS ergänzt werden, ist aber angesichts der
  fehlenden `dangerouslySetInnerHTML`-Nutzung im gesamten Code aktuell
  kein akutes Risiko).
