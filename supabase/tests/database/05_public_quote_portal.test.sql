-- =====================================================================
-- pgTAP: Oeffentliches Angebots-Portal (Phase 4/5) ueber
-- `get_public_quote` / `record_public_quote_event`
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- Erwartetes Verhalten (siehe supabase/schema.sql):
--  - Ein anonymer Besucher findet ein Angebot ausschliesslich ueber sein
--    zufaelliges `public_token`, niemals ueber die fortlaufende `id`.
--  - "viewed" ist idempotent und setzt `status`/`viewed_at` nur beim
--    uebergang von 'sent'.
--  - "accepted"/"declined" sind nur aus 'sent'/'viewed' heraus erlaubt.
--  - Ein Angebot mit abgelaufenem `valid_until` kann nicht mehr
--    angenommen/abgelehnt werden (lazy expiry).
--  - Jede Kunden-Aktion erzeugt ein `activity_events`- und ein
--    `notifications`-Row fuer den Business-Owner.
-- =====================================================================

begin;
select plan(11);

select tests.create_supabase_user('alice_portal@test.com');
select tests.authenticate_as('alice_portal@test.com');

insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  'a0000000-0000-0000-0000-000000000001',
  tests.get_supabase_uid('alice_portal@test.com'),
  'Alice Handwerk',
  'alice-handwerk-portal-test',
  'handwerk'
);
insert into public.leads (id, business_id, customer_name, customer_email, service)
values (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Kundin Meier',
  'meier@example.com',
  'Badsanierung'
);

-- Aktives Angebot, gueltig bis morgen.
insert into public.quotes
  (id, lead_id, public_token, title, price, status, sent_at, valid_until)
values (
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-00000000000a',
  'Badsanierung Komplett',
  4200,
  'sent',
  now(),
  (current_date + 1)
);

-- Bereits abgelaufenes Angebot (valid_until gestern), noch im Status 'sent'.
insert into public.quotes
  (id, lead_id, public_token, title, price, status, sent_at, valid_until)
values (
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-00000000000b',
  'Abgelaufenes Angebot',
  1000,
  'sent',
  now(),
  (current_date - 1)
);

select tests.clear_authentication();

-- Falsches Token liefert nichts.
select is(
  (select public.get_public_quote('00000000-0000-0000-0000-000000000000')),
  null,
  'get_public_quote liefert null fuer ein unbekanntes Token'
);

-- Richtiges Token liefert die erwarteten Felder.
select results_eq(
  $$select (public.get_public_quote('a0000000-0000-0000-0000-00000000000a')->>'title')$$,
  ARRAY['Badsanierung Komplett'],
  'get_public_quote liefert das Angebot per public_token'
);

-- "viewed" markiert das Angebot als angesehen.
select public.record_public_quote_event('a0000000-0000-0000-0000-00000000000a', 'viewed');
select results_eq(
  $$select status from public.quotes where id = 'a0000000-0000-0000-0000-000000000003'$$,
  ARRAY['viewed'],
  'record_public_quote_event(viewed) setzt status auf viewed'
);
select isnt(
  (select viewed_at from public.quotes where id = 'a0000000-0000-0000-0000-000000000003'),
  null,
  'record_public_quote_event(viewed) setzt viewed_at'
);

-- Ein zweiter "viewed"-Aufruf ist idempotent (kein Fehler, Status bleibt).
select lives_ok(
  $$select public.record_public_quote_event('a0000000-0000-0000-0000-00000000000a', 'viewed')$$,
  'Ein zweiter "viewed"-Aufruf ist idempotent und wirft keinen Fehler'
);

-- "accepted" ist aus 'viewed' heraus erlaubt.
select public.record_public_quote_event('a0000000-0000-0000-0000-00000000000a', 'accepted');
select results_eq(
  $$select status from public.quotes where id = 'a0000000-0000-0000-0000-000000000003'$$,
  ARRAY['accepted'],
  'record_public_quote_event(accepted) setzt status auf accepted'
);

-- Der zugehoerige Lead wird automatisch auf "won" gesetzt.
select results_eq(
  $$select status from public.leads where id = 'a0000000-0000-0000-0000-000000000002'$$,
  ARRAY['won'],
  'Annahme eines Angebots setzt den zugehoerigen Lead auf "won"'
);

-- Ein weiteres "accepted"/"declined" auf ein bereits final beantwortetes
-- Angebot schlaegt fehl (invalid_transition).
select throws_ok(
  $$select public.record_public_quote_event('a0000000-0000-0000-0000-00000000000a', 'declined')$$,
  'P0001',
  null,
  'Ein bereits angenommenes Angebot kann nicht nachtraeglich abgelehnt werden'
);

-- Ein abgelaufenes Angebot kann nicht mehr angenommen werden.
select throws_ok(
  $$select public.record_public_quote_event('a0000000-0000-0000-0000-00000000000b', 'accepted')$$,
  'P0001',
  null,
  'Ein abgelaufenes Angebot kann nicht mehr angenommen werden'
);

-- Fuer den Owner wurden Timeline-Events protokolliert.
select tests.authenticate_as('alice_portal@test.com');
select ok(
  (select count(*) from public.activity_events
    where quote_id = 'a0000000-0000-0000-0000-000000000003' and type = 'quote_accepted') = 1,
  'Die Annahme des Angebots wurde als activity_event protokolliert'
);
select ok(
  (select count(*) from public.notifications where type = 'quote_accepted') = 1,
  'Die Annahme des Angebots hat eine Benachrichtigung fuer den Owner erzeugt'
);

select * from finish();
rollback;
