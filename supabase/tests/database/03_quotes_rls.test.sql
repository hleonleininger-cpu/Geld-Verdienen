-- =====================================================================
-- pgTAP: RLS-Verhalten fuer public.quotes
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- Erwartetes Verhalten (siehe supabase/schema.sql):
--  - Nur der Owner des zugehoerigen Business (ueber den Lead) darf ein
--    Angebot fuer einen Lead anlegen/lesen/aendern/loeschen.
--  - Ein Owner darf per UPDATE NICHT das `lead_id` eines eigenen Angebots
--    auf einen FREMDEN Lead umhaengen.
--  - Ein fremder Business-Owner (Bob) sieht/aendert Alices Angebote nicht
--    und kann auch kein Angebot fuer Alices Lead anlegen.
-- =====================================================================

begin;
select plan(6);

select tests.create_supabase_user('alice_quotes@test.com');
select tests.create_supabase_user('bob_quotes@test.com');

select tests.authenticate_as('alice_quotes@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  '55555555-5555-5555-5555-555555555555',
  tests.get_supabase_uid('alice_quotes@test.com'),
  'Alice Handwerk',
  'alice-handwerk-rls-test',
  'handwerk'
);
insert into public.leads (id, business_id, customer_name, customer_email, service)
values (
  '66666666-6666-6666-6666-666666666666',
  '55555555-5555-5555-5555-555555555555',
  'Kundin Meier',
  'meier@example.com',
  'Badsanierung'
);

select tests.authenticate_as('bob_quotes@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  '77777777-7777-7777-7777-777777777777',
  tests.get_supabase_uid('bob_quotes@test.com'),
  'Bob Fotografie',
  'bob-fotografie-rls-test',
  'fotografie'
);
insert into public.leads (id, business_id, customer_name, customer_email, service)
values (
  '88888888-8888-8888-8888-888888888888',
  '77777777-7777-7777-7777-777777777777',
  'Kunde Schulz',
  'schulz@example.com',
  'Hochzeitsfotos'
);

-- Bob darf KEIN Angebot fuer Alices Lead anlegen.
select throws_ok(
  $$insert into public.quotes (lead_id, title, price)
    values ('66666666-6666-6666-6666-666666666666', 'Fremdes Angebot', 100)$$,
  '42501',
  null,
  'Fremder Business-Owner (Bob) kann kein Angebot fuer Alices Lead anlegen'
);

-- Alice legt ein Angebot fuer ihren eigenen Lead an.
select tests.authenticate_as('alice_quotes@test.com');
insert into public.quotes (id, lead_id, title, price)
values (
  '99999999-1111-1111-1111-111111111111',
  '66666666-6666-6666-6666-666666666666',
  'Badsanierung Komplett',
  4200
);

select results_eq(
  $$select title from public.quotes where id = '99999999-1111-1111-1111-111111111111'$$,
  ARRAY['Badsanierung Komplett'],
  'Owner (Alice) kann ihr eigenes Angebot lesen'
);

-- Alice darf lead_id ihres Angebots NICHT auf Bobs Lead umhaengen.
select throws_ok(
  format(
    $$update public.quotes set lead_id = %L where id = '99999999-1111-1111-1111-111111111111'$$,
    '88888888-8888-8888-8888-888888888888'
  ),
  '42501',
  null,
  'Owner darf lead_id eines eigenen Angebots nicht auf einen fremden Lead umhaengen'
);

-- Bob sieht Alices Angebot nicht.
select tests.authenticate_as('bob_quotes@test.com');
select results_eq(
  $$select count(*)::int from public.quotes where id = '99999999-1111-1111-1111-111111111111'$$,
  ARRAY[0],
  'Fremder Business-Owner (Bob) sieht Alices Angebot nicht'
);

-- Bob kann Alices Angebot nicht aendern.
select results_eq(
  $$update public.quotes set price = 1 where id = '99999999-1111-1111-1111-111111111111' returning 1$$,
  ARRAY[]::integer[],
  'Fremder Business-Owner (Bob) kann Alices Angebot nicht aendern (0 betroffene Zeilen)'
);

-- Bob kann Alices Angebot nicht loeschen.
select results_eq(
  $$delete from public.quotes where id = '99999999-1111-1111-1111-111111111111' returning 1$$,
  ARRAY[]::integer[],
  'Fremder Business-Owner (Bob) kann Alices Angebot nicht loeschen (0 betroffene Zeilen)'
);

select * from finish();
rollback;
