-- =====================================================================
-- pgTAP: RLS-Verhalten fuer public.leads
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- Erwartetes Verhalten (siehe supabase/schema.sql):
--  - Jeder (auch anonym) darf ueber das oeffentliche Formular einen Lead
--    fuer ein EXISTIERENDES Business anlegen.
--  - Ein Insert fuer eine nicht existierende business_id schlaegt fehl.
--  - Nur der Business-Owner sieht/aendert/loescht seine eigenen Leads.
--  - Ein Owner darf per UPDATE NICHT die `business_id` eines eigenen
--    Leads auf ein FREMDES Business umbiegen (Cross-Tenant-Injection).
--  - Ein fremder Business-Owner (Bob) sieht/aendert/loescht Alices Leads
--    nicht.
-- =====================================================================

begin;
select plan(8);

select tests.create_supabase_user('alice_leads@test.com');
select tests.create_supabase_user('bob_leads@test.com');

select tests.authenticate_as('alice_leads@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  '22222222-2222-2222-2222-222222222222',
  tests.get_supabase_uid('alice_leads@test.com'),
  'Alice Reinigung',
  'alice-reinigung-rls-test',
  'reinigung'
);

select tests.authenticate_as('bob_leads@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  '33333333-3333-3333-3333-333333333333',
  tests.get_supabase_uid('bob_leads@test.com'),
  'Bob Garten',
  'bob-garten-rls-test',
  'gartenservice'
);

-- Anonymer Besucher darf fuer Alices Business einen Lead anlegen.
select tests.clear_authentication();

select lives_ok(
  $$insert into public.leads (id, business_id, customer_name, customer_email, service)
    values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Max Mustermann', 'max@example.com', 'Innenreinigung')$$,
  'Anonymer Besucher kann einen Lead fuer ein existierendes Business anlegen'
);

-- Anonymer Besucher darf keinen Lead fuer eine nicht existierende
-- business_id anlegen.
select throws_ok(
  $$insert into public.leads (business_id, customer_name, customer_email, service)
    values ('99999999-9999-9999-9999-999999999999', 'Fake Kunde', 'fake@example.com', 'Nichts')$$,
  null,
  null,
  'Anonymer Besucher kann keinen Lead fuer eine nicht existierende business_id anlegen'
);

-- Alice sieht ihren eigenen Lead.
select tests.authenticate_as('alice_leads@test.com');
select results_eq(
  $$select customer_name from public.leads where id = '44444444-4444-4444-4444-444444444444'$$,
  ARRAY['Max Mustermann'],
  'Owner (Alice) kann ihren eigenen Lead lesen'
);

-- Alice darf business_id ihres Leads NICHT auf Bobs Business umbiegen.
select throws_ok(
  $$update public.leads set business_id = '33333333-3333-3333-3333-333333333333' where id = '44444444-4444-4444-4444-444444444444'$$,
  '42501',
  null,
  'Owner darf business_id eines eigenen Leads nicht auf ein fremdes Business umbiegen'
);

-- Alice darf den Status ihres eigenen Leads aendern.
select lives_ok(
  $$update public.leads set status = 'in_progress' where id = '44444444-4444-4444-4444-444444444444'$$,
  'Owner kann den Status des eigenen Leads aendern'
);

-- Bob (fremder Business-Owner) sieht Alices Lead NICHT.
select tests.authenticate_as('bob_leads@test.com');
select results_eq(
  $$select count(*)::int from public.leads where id = '44444444-4444-4444-4444-444444444444'$$,
  ARRAY[0],
  'Fremder Business-Owner (Bob) sieht Alices Lead nicht'
);

-- Bob kann Alices Lead nicht aendern.
select results_eq(
  $$update public.leads set status = 'won' where id = '44444444-4444-4444-4444-444444444444' returning 1$$,
  ARRAY[]::integer[],
  'Fremder Business-Owner (Bob) kann Alices Lead nicht aendern (0 betroffene Zeilen)'
);

-- Bob kann Alices Lead nicht loeschen.
select results_eq(
  $$delete from public.leads where id = '44444444-4444-4444-4444-444444444444' returning 1$$,
  ARRAY[]::integer[],
  'Fremder Business-Owner (Bob) kann Alices Lead nicht loeschen (0 betroffene Zeilen)'
);

select * from finish();
rollback;
