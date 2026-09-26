-- =====================================================================
-- pgTAP: RLS-Verhalten fuer public.businesses
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- Erwartetes Verhalten (siehe supabase/schema.sql):
--  - JEDER (auch anonym) darf ein Business per SELECT lesen – das ist
--    gewollt, weil /[businessSlug] eine oeffentliche Marketing-/
--    Anfrage-Seite ist, keine private Kundendaten-Ansicht.
--  - Nur der Owner darf sein eigenes Business per UPDATE/DELETE aendern.
--  - Ein Owner darf per UPDATE NICHT die `owner_id` auf einen fremden
--    Nutzer umbiegen (WITH CHECK-Regressionstest).
--  - Ein fremder, eingeloggter Nutzer darf ein Business weder aendern
--    noch loeschen (Cross-Tenant-Schreibzugriff bleibt verboten, obwohl
--    Lesen erlaubt ist).
-- =====================================================================

begin;
select plan(7);

select tests.create_supabase_user('alice_biz@test.com');
select tests.create_supabase_user('bob_biz@test.com');

select tests.authenticate_as('alice_biz@test.com');

insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  '11111111-1111-1111-1111-111111111111',
  tests.get_supabase_uid('alice_biz@test.com'),
  'Alice Autopflege',
  'alice-autopflege-rls-test',
  'autopflege'
);

-- Alice sieht ihr eigenes Business.
select results_eq(
  $$select business_name from public.businesses where id = '11111111-1111-1111-1111-111111111111'$$,
  ARRAY['Alice Autopflege'],
  'Owner (Alice) kann ihr eigenes Business lesen'
);

-- Alice darf owner_id NICHT auf einen fremden Nutzer umbiegen.
select throws_ok(
  format(
    $$update public.businesses set owner_id = %L where id = '11111111-1111-1111-1111-111111111111'$$,
    tests.get_supabase_uid('bob_biz@test.com')
  ),
  '42501',
  null,
  'Owner darf owner_id nicht per UPDATE auf einen fremden Nutzer umbiegen (WITH CHECK greift)'
);

-- Wechsel zu Bob (fremder, eingeloggter Nutzer).
select tests.authenticate_as('bob_biz@test.com');

-- Bob DARF Alices Business lesen (oeffentliche Anfrageseite).
select results_eq(
  $$select business_name from public.businesses where id = '11111111-1111-1111-1111-111111111111'$$,
  ARRAY['Alice Autopflege'],
  'Fremder, eingeloggter Nutzer (Bob) kann das oeffentliche Business-Profil lesen'
);

-- Bob darf Alices Business NICHT aendern.
select results_eq(
  $$update public.businesses set business_name = 'Hacked' where id = '11111111-1111-1111-1111-111111111111' returning 1$$,
  ARRAY[]::integer[],
  'Fremder Nutzer (Bob) kann Alices Business nicht per UPDATE aendern (0 betroffene Zeilen)'
);

-- Bob darf Alices Business NICHT loeschen.
select results_eq(
  $$delete from public.businesses where id = '11111111-1111-1111-1111-111111111111' returning 1$$,
  ARRAY[]::integer[],
  'Fremder Nutzer (Bob) kann Alices Business nicht loeschen (0 betroffene Zeilen)'
);

-- Anonymer Besucher (kein Login) darf das Business ebenfalls lesen.
select tests.clear_authentication();

select results_eq(
  $$select business_name from public.businesses where id = '11111111-1111-1111-1111-111111111111'$$,
  ARRAY['Alice Autopflege'],
  'Anonymer Besucher kann das oeffentliche Business-Profil lesen'
);

-- Anonymer Besucher darf keine Businesses anlegen (kein owner_id moeglich).
select throws_ok(
  $$insert into public.businesses (owner_id, business_name, slug, industry)
    values ('00000000-0000-0000-0000-000000000000', 'Anon Fake', 'anon-fake-rls-test', 'handwerk')$$,
  '42501',
  null,
  'Anonymer Besucher kann kein Business anlegen'
);

select * from finish();
rollback;
