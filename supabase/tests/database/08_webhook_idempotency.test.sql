-- =====================================================================
-- pgTAP: Webhook-Idempotenz + Checkout-Sicherheit (Section 14)
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- Erwartetes Verhalten (siehe supabase/schema.sql + app/api/webhooks/stripe/route.ts):
--  - `processed_webhook_events.id` (PRIMARY KEY) ist die harte, DB-seitige
--    Garantie fuer "handle duplicate webhook events idempotently": der
--    Webhook-Handler fuegt die Stripe-Event-ID zuerst hier ein, BEVOR er
--    irgendetwas verarbeitet – ein zweiter Insert derselben ID (erneute
--    Zustellung desselben Events) schlaegt mit einer unique_violation fehl,
--    und der Handler ueberspringt die Verarbeitung dann bewusst.
--  - Auf diese Tabelle gibt es bewusst KEINE RLS-Policy fuer
--    anon/authenticated – nur der Service-Role-Client (die Webhook-Route
--    selbst) darf hier ueberhaupt lesen/schreiben. Damit kann niemand
--    ueber die Anwendung hinweg vorgetaeuschte "bereits verarbeitet"-
--    Eintraege einschleusen oder den Verlauf auslesen.
-- =====================================================================

begin;
select plan(5);

-- --- Harte Idempotenz-Garantie: zweiter Insert derselben Event-ID scheitert ---
select lives_ok(
  $$insert into public.processed_webhook_events (id, provider) values ('evt_test_dup_1', 'stripe')$$,
  'Die erste Zustellung eines Webhook-Events wird erfolgreich vermerkt'
);
select throws_ok(
  $$insert into public.processed_webhook_events (id, provider) values ('evt_test_dup_1', 'stripe')$$,
  '23505',
  null,
  'Eine erneute Zustellung DESSELBEN Events (gleiche ID) wird durch die PRIMARY KEY-Constraint abgelehnt'
);

-- --- Verschiedene Event-IDs kollidieren nicht miteinander ---
select lives_ok(
  $$insert into public.processed_webhook_events (id, provider) values ('evt_test_dup_2', 'stripe')$$,
  'Eine ANDERE Event-ID wird unabhaengig davon problemlos vermerkt'
);

-- --- Kein anon/authenticated-Zugriff auf die Idempotenz-Tabelle ---
select tests.create_supabase_user('webhook_test@test.com');
select tests.authenticate_as('webhook_test@test.com');
select throws_ok(
  $$insert into public.processed_webhook_events (id, provider) values ('evt_test_from_authenticated', 'stripe')$$,
  null,
  null,
  'Ein normal eingeloggter Nutzer kann NICHT in processed_webhook_events schreiben (keine Policy)'
);

select tests.clear_authentication();
select results_eq(
  $$select count(*)::int from public.processed_webhook_events$$,
  ARRAY[0],
  'Ein anonymer Besucher sieht KEINE Zeilen (keine SELECT-Policy fuer anon/authenticated)'
);

select * from finish();
rollback;
