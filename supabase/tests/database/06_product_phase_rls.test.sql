-- =====================================================================
-- pgTAP: RLS fuer die in Phase 4-21 neu hinzugekommenen Tabellen
-- (services, activity_events, notifications, referral_events,
-- analytics_events).
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
-- =====================================================================

begin;
select plan(15);

select tests.create_supabase_user('alice_phase@test.com');
select tests.create_supabase_user('bob_phase@test.com');

select tests.authenticate_as('alice_phase@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  'b0000000-0000-0000-0000-000000000001',
  tests.get_supabase_uid('alice_phase@test.com'),
  'Alice Handwerk',
  'alice-handwerk-phase-test',
  'handwerk'
);
insert into public.services (id, business_id, name, active)
values
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Aktive Leistung', true),
  ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Inaktive Leistung', false);
insert into public.activity_events (id, business_id, type, actor)
values ('b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'lead_created', 'system');
insert into public.notifications (id, business_id, type, title)
values ('b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'lead_created', 'Neue Anfrage');

select tests.authenticate_as('bob_phase@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  'b0000000-0000-0000-0000-000000000006',
  tests.get_supabase_uid('bob_phase@test.com'),
  'Bob Fotografie',
  'bob-fotografie-phase-test',
  'fotografie'
);

-- --- services -----------------------------------------------------

select tests.clear_authentication();
select results_eq(
  $$select name from public.services where id = 'b0000000-0000-0000-0000-000000000002'$$,
  ARRAY['Aktive Leistung'],
  'Anonymer Besucher sieht eine AKTIVE Leistung'
);
select results_eq(
  $$select count(*)::int from public.services where id = 'b0000000-0000-0000-0000-000000000003'$$,
  ARRAY[0],
  'Anonymer Besucher sieht KEINE inaktive Leistung'
);

select tests.authenticate_as('alice_phase@test.com');
select results_eq(
  $$select count(*)::int from public.services where business_id = 'b0000000-0000-0000-0000-000000000001'$$,
  ARRAY[2],
  'Owner (Alice) sieht auch ihre eigene inaktive Leistung'
);

select tests.authenticate_as('bob_phase@test.com');
select throws_ok(
  $$update public.services set active = false where id = 'b0000000-0000-0000-0000-000000000002'$$,
  null,
  null,
  'Fremder Owner (Bob) kann Alices Leistung nicht aendern'
);
select results_eq(
  $$select count(*)::int from public.services where business_id = 'b0000000-0000-0000-0000-000000000001' and business_id in (select id from public.businesses where owner_id = auth.uid())$$,
  ARRAY[0],
  'Fremder Owner (Bob) hat keinen Owner-Zugriff auf Alices Leistungen'
);

-- --- activity_events / notifications -------------------------------

select tests.clear_authentication();
select results_eq(
  $$select count(*)::int from public.activity_events where id = 'b0000000-0000-0000-0000-000000000004'$$,
  ARRAY[0],
  'Anonymer Besucher sieht KEINE activity_events (keine anon-SELECT-Policy)'
);
select results_eq(
  $$select count(*)::int from public.notifications where id = 'b0000000-0000-0000-0000-000000000005'$$,
  ARRAY[0],
  'Anonymer Besucher sieht KEINE notifications (keine anon-SELECT-Policy)'
);

select tests.authenticate_as('bob_phase@test.com');
select results_eq(
  $$select count(*)::int from public.activity_events where id = 'b0000000-0000-0000-0000-000000000004'$$,
  ARRAY[0],
  'Fremder Owner (Bob) sieht Alices activity_events nicht'
);
select results_eq(
  $$select count(*)::int from public.notifications where id = 'b0000000-0000-0000-0000-000000000005'$$,
  ARRAY[0],
  'Fremder Owner (Bob) sieht Alices notifications nicht'
);

select tests.authenticate_as('alice_phase@test.com');
select lives_ok(
  $$update public.notifications set read_at = now() where id = 'b0000000-0000-0000-0000-000000000005'$$,
  'Owner (Alice) kann ihre eigene Benachrichtigung als gelesen markieren'
);

-- --- referral_events -------------------------------------------------

select tests.clear_authentication();
select lives_ok(
  $$insert into public.referral_events (referral_code, event_type)
    values ('testcode123', 'clicked')$$,
  'Anonymer Besucher kann ein Referral-Klick-Event anlegen'
);

update public.businesses set referral_code = 'testcode123'
  where id = 'b0000000-0000-0000-0000-000000000001';

select tests.authenticate_as('bob_phase@test.com');
select results_eq(
  $$select count(*)::int from public.referral_events where referral_code = 'testcode123'$$,
  ARRAY[0],
  'Fremder Owner (Bob) sieht Alices Referral-Events nicht (falscher Code)'
);

select tests.authenticate_as('alice_phase@test.com');
select ok(
  (select count(*) from public.referral_events where referral_code = 'testcode123') >= 1,
  'Owner (Alice) sieht Referral-Events zu ihrem eigenen Code'
);

-- --- analytics_events -------------------------------------------------

select tests.clear_authentication();
select lives_ok(
  $$insert into public.analytics_events (event_name) values ('signup')$$,
  'Anonymer Besucher kann ein erlaubtes Analytics-Event anlegen'
);
select throws_ok(
  $$insert into public.analytics_events (event_name) values ('some_made_up_event')$$,
  null,
  null,
  'Ein nicht erlaubter event_name wird von der CHECK-Policy abgelehnt'
);

select * from finish();
rollback;
