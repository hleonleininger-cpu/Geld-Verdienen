-- =====================================================================
-- pgTAP: Entitlement-Haertung (Audit vor dem ersten zahlenden Kunden)
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- Erwartetes Verhalten (siehe supabase/migrations/0005_entitlement_hardening.sql):
--  - Ein Free-Plan-Business kann KEIN request_forms-Row anlegen, selbst
--    per direktem Insert mit der eigenen (authenticated) Rolle – nicht nur
--    ueber die Next.js Server Action `createForm()` blockiert, sondern
--    bereits durch die WITH-CHECK-Klausel der RLS-Policy selbst.
--  - Ein Pro-Plan-Business KANN ein Formular anlegen.
--  - Nach einem Downgrade auf Free bleibt ein BEREITS BESTEHENDES
--    Formular weiterhin bearbeitbar (kein Datenverlust bei Downgrade) –
--    nur das Anlegen ist gegated, nicht das Aendern.
--  - `businesses.owner_id` ist jetzt UNIQUE: ein zweites Business fuer
--    denselben Owner kann nicht mehr angelegt werden.
-- =====================================================================

begin;
select plan(6);

select tests.create_supabase_user('alice_entitle@test.com');
select tests.create_supabase_user('finn_entitle@test.com');

-- --- Business A: Free-Plan ----------------------------------------------
select tests.authenticate_as('alice_entitle@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry, plan, subscription_status)
values (
  'e0000000-0000-0000-0000-000000000001',
  tests.get_supabase_uid('alice_entitle@test.com'),
  'Alice Free-Plan',
  'alice-free-entitle-test',
  'autopflege',
  'free',
  'none'
);

select throws_ok(
  $$insert into public.request_forms (business_id, name, slug)
    values ('e0000000-0000-0000-0000-000000000001', 'Anfrage', 'anfrage-free')$$,
  null, null,
  'Ein Free-Plan-Business kann per direktem Insert KEIN Formular anlegen (RLS-Gate)'
);

-- --- Business F: Pro-Plan (aktiv) ---------------------------------------
select tests.authenticate_as('finn_entitle@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry, plan, subscription_status)
values (
  'e0000000-0000-0000-0000-000000000002',
  tests.get_supabase_uid('finn_entitle@test.com'),
  'Finn Pro-Plan',
  'finn-pro-entitle-test',
  'autopflege',
  'pro',
  'active'
);

select lives_ok(
  $$insert into public.request_forms (id, business_id, name, slug)
    values ('e0000000-0000-0000-0000-00000000000f', 'e0000000-0000-0000-0000-000000000002', 'Anfrage', 'anfrage-pro')$$,
  'Ein Pro-Plan-Business KANN per direktem Insert ein Formular anlegen'
);

-- --- Downgrade: bestehendes Formular bleibt bearbeitbar -----------------
update public.businesses set plan = 'free', subscription_status = 'none'
  where id = 'e0000000-0000-0000-0000-000000000002';

select lives_ok(
  $$update public.request_forms set name = 'Anfrage (umbenannt)'
    where id = 'e0000000-0000-0000-0000-00000000000f'$$,
  'Nach einem Downgrade bleibt ein BESTEHENDES Formular weiterhin bearbeitbar (kein Datenverlust)'
);
select throws_ok(
  $$insert into public.request_forms (business_id, name, slug)
    values ('e0000000-0000-0000-0000-000000000002', 'Zweites Formular', 'anfrage-2-nach-downgrade')$$,
  null, null,
  'Nach einem Downgrade kann aber KEIN NEUES Formular mehr angelegt werden'
);

-- --- businesses.owner_id ist jetzt UNIQUE --------------------------------
select throws_ok(
  $$insert into public.businesses (owner_id, business_name, slug, industry)
    values (tests.get_supabase_uid('finn_entitle@test.com'), 'Finns zweites Business', 'finn-zweites-business-test', 'handwerk')$$,
  '23505',
  null,
  'Ein zweites Business fuer denselben Owner ist wegen der UNIQUE-Constraint nicht mehr moeglich'
);
select results_eq(
  $$select count(*)::int from public.businesses where owner_id = tests.get_supabase_uid('finn_entitle@test.com')$$,
  ARRAY[1],
  'Es existiert weiterhin genau ein Business fuer diesen Owner'
);

select * from finish();
rollback;
