-- =====================================================================
-- pgTAP: Token-Isolation im Kunden-Portal + Terminbuchungs-RPCs
-- (Conversion-Funnel-Phase)
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- Erwartetes Verhalten (siehe supabase/schema.sql):
--  - Formular-Definitionen eines NICHT veroeffentlichten Business duerfen
--    ueber den anon-Key niemals auffindbar sein, auch wenn das Formular
--    selbst aktiv ist (Regressionstest fuer eine urspruenglich zu weite
--    "request_forms_select_public"/"request_form_fields_select_public"
--    Policy, die business_id/published nicht beruecksichtigt hat).
--  - `get_public_quote` liefert ausschliesslich das zum `public_token`
--    gehoerende Angebot – kein Zugriff ueber die fortlaufende `id`, kein
--    Ueberschwappen zwischen zwei Kunden/Businesses.
--  - `business_has_calendar_feature` spiegelt den effektiven Plan
--    (lib/entitlements.ts) – Terminbuchung ist nur ab Pro verfuegbar.
--  - `get_available_appointment_slots`/`book_appointment` lehnen ein
--    unbekanntes Token, ein nicht angenommenes Angebot, ein Business ohne
--    Calendar-Feature, einen vergangenen Slot und eine Doppelbuchung
--    (sowohl anwendungsseitig als auch per DB-Exclusion-Constraint) ab.
-- =====================================================================

begin;
select plan(24);

select tests.create_supabase_user('alice_funnel@test.com');
select tests.create_supabase_user('finn_funnel@test.com');
select tests.create_supabase_user('uma_funnel@test.com');

-- --- Business A: veroeffentlicht, Pro-Plan (Calendar-Feature aktiv) ----
select tests.authenticate_as('alice_funnel@test.com');
insert into public.businesses
  (id, owner_id, business_name, slug, industry, published, plan, subscription_status, opening_hours)
values (
  'd0000000-0000-0000-0000-000000000001',
  tests.get_supabase_uid('alice_funnel@test.com'),
  'Alice Autopflege',
  'alice-autopflege-funnel-test',
  'autopflege',
  true,
  'pro',
  'active',
  '[
    {"day":"mon","open":"00:00","close":"23:59","closed":false},
    {"day":"tue","open":"00:00","close":"23:59","closed":false},
    {"day":"wed","open":"00:00","close":"23:59","closed":false},
    {"day":"thu","open":"00:00","close":"23:59","closed":false},
    {"day":"fri","open":"00:00","close":"23:59","closed":false},
    {"day":"sat","open":"00:00","close":"23:59","closed":false},
    {"day":"sun","open":"00:00","close":"23:59","closed":false}
  ]'::jsonb
);

insert into public.request_forms (id, business_id, name, slug, active)
values ('d0000000-0000-0000-0000-0000000000f1', 'd0000000-0000-0000-0000-000000000001', 'Anfrage', 'anfrage', true);
insert into public.request_form_fields (id, form_id, field_type, label, position)
values ('d0000000-0000-0000-0000-0000000000f2', 'd0000000-0000-0000-0000-0000000000f1', 'text', 'Fahrzeugmodell', 0);

insert into public.leads (id, business_id, customer_name, customer_email, service)
values
  ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Kundin A1 (angenommen)', 'a1@example.com', 'Premium Detail'),
  ('d0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'Kundin A2 (nicht angenommen)', 'a2@example.com', 'Innenreinigung'),
  ('d0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'Kundin A3 (kollidierender Termin)', 'a3@example.com', 'Ceramic Coating');

insert into public.quotes (id, lead_id, public_token, title, price, status, sent_at, accepted_at, valid_until)
values
  ('d0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-00000000a001', 'Premium Detail', 250, 'accepted', now() - interval '1 day', now(), null),
  ('d0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-00000000a002', 'Innenreinigung', 90, 'sent', now(), null, null),
  ('d0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-00000000a003', 'Ceramic Coating', 600, 'accepted', now() - interval '1 day', now(), null);

-- --- Business F: veroeffentlicht, Free-Plan (kein Calendar-Feature) ----
select tests.authenticate_as('finn_funnel@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry, published, plan, subscription_status)
values (
  'd0000000-0000-0000-0000-000000000004',
  tests.get_supabase_uid('finn_funnel@test.com'),
  'Finn Fotografie',
  'finn-fotografie-funnel-test',
  'fotografie',
  true,
  'free',
  'none'
);
insert into public.leads (id, business_id, customer_name, customer_email, service)
values ('d0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000004', 'Kunde F1', 'f1@example.com', 'Fotoshooting');
insert into public.quotes (id, lead_id, public_token, title, price, status, sent_at, accepted_at, valid_until)
values ('d0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-00000000a004', 'Fotoshooting', 300, 'accepted', now() - interval '1 day', now(), null);

-- --- Business U: NICHT veroeffentlicht --------------------------------
select tests.authenticate_as('uma_funnel@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry, published)
values (
  'd0000000-0000-0000-0000-00000000000b',
  tests.get_supabase_uid('uma_funnel@test.com'),
  'Uma Unveroeffentlicht',
  'uma-unveroeffentlicht-funnel-test',
  'gartenservice',
  false
);
insert into public.request_forms (id, business_id, name, slug, active)
values ('d0000000-0000-0000-0000-00000000000c', 'd0000000-0000-0000-0000-00000000000b', 'Anfrage', 'anfrage', true);
insert into public.request_form_fields (id, form_id, field_type, label, position)
values ('d0000000-0000-0000-0000-00000000000d', 'd0000000-0000-0000-0000-00000000000c', 'text', 'Grundstücksgröße', 0);

select tests.clear_authentication();

-- --- Regression: Formulare eines unveroeffentlichten Business duerfen
--     ueber den anon-Key niemals sichtbar sein --------------------------
select results_eq(
  $$select name from public.request_forms where business_id = 'd0000000-0000-0000-0000-000000000001'$$,
  ARRAY['Anfrage'],
  'Anonymer Besucher sieht das aktive Formular eines VEROEFFENTLICHTEN Business'
);
select results_eq(
  $$select count(*)::int from public.request_forms where business_id = 'd0000000-0000-0000-0000-00000000000b'$$,
  ARRAY[0],
  'Anonymer Besucher sieht KEIN Formular eines NICHT veroeffentlichten Business'
);
select results_eq(
  $$select label from public.request_form_fields where form_id = 'd0000000-0000-0000-0000-0000000000f1'$$,
  ARRAY['Fahrzeugmodell'],
  'Anonymer Besucher sieht die Felder eines VEROEFFENTLICHTEN Formulars'
);
select results_eq(
  $$select count(*)::int from public.request_form_fields where form_id = 'd0000000-0000-0000-0000-00000000000c'$$,
  ARRAY[0],
  'Anonymer Besucher sieht KEINE Felder eines NICHT veroeffentlichten Business'
);

-- --- business_has_calendar_feature -------------------------------------
select ok(
  (select public.business_has_calendar_feature('d0000000-0000-0000-0000-000000000001')) = true,
  'Pro-Plan (aktiv) hat das Calendar-Feature'
);
select ok(
  (select public.business_has_calendar_feature('d0000000-0000-0000-0000-000000000004')) = false,
  'Free-Plan hat das Calendar-Feature NICHT'
);

-- --- get_public_quote: Token-Isolation ---------------------------------
select results_eq(
  $$select (public.get_public_quote('d0000000-0000-0000-0000-00000000a001')->>'customer_name')$$,
  ARRAY['Kundin A1 (angenommen)'],
  'get_public_quote liefert exakt den zum Token gehoerenden Kunden'
);
select results_eq(
  $$select (public.get_public_quote('d0000000-0000-0000-0000-00000000a004')->>'customer_name')$$,
  ARRAY['Kunde F1'],
  'get_public_quote eines anderen Business/Tokens liefert dessen eigenen Kunden (kein Ueberschwappen)'
);
select is(
  (select public.get_public_quote('00000000-0000-0000-0000-000000000000')),
  null,
  'Ein unbekanntes/erratenes Token liefert null statt eines Angebots'
);
select is(
  (select public.get_public_quote('d0000000-0000-0000-0000-00000000a001')->'appointment'),
  null,
  'get_public_quote zeigt vor der Buchung keinen Termin'
);

-- --- get_available_appointment_slots -----------------------------------
select results_eq(
  $$select public.get_available_appointment_slots('00000000-0000-0000-0000-000000000000', current_date + 1)$$,
  ARRAY['[]'::jsonb],
  'get_available_appointment_slots liefert [] fuer ein unbekanntes Token'
);
select results_eq(
  $$select public.get_available_appointment_slots('d0000000-0000-0000-0000-00000000a002', current_date + 1)$$,
  ARRAY['[]'::jsonb],
  'get_available_appointment_slots liefert [] fuer ein noch nicht angenommenes Angebot'
);
select results_eq(
  $$select public.get_available_appointment_slots('d0000000-0000-0000-0000-00000000a004', current_date + 1)$$,
  ARRAY['[]'::jsonb],
  'get_available_appointment_slots liefert [] ohne Calendar-Feature (Free-Plan)'
);
select ok(
  (select jsonb_array_length(public.get_available_appointment_slots('d0000000-0000-0000-0000-00000000a001', current_date + 1))) > 0,
  'get_available_appointment_slots liefert freie Slots fuer ein angenommenes Angebot mit Calendar-Feature'
);

-- --- book_appointment: Fehlerfaelle -------------------------------------
select throws_ok(
  $$select public.book_appointment('00000000-0000-0000-0000-000000000000', (current_date + 1)::timestamptz + interval '10 hours')$$,
  'P0001', 'not_found',
  'book_appointment lehnt ein unbekanntes Token ab'
);
select throws_ok(
  $$select public.book_appointment('d0000000-0000-0000-0000-00000000a002', (current_date + 1)::timestamptz + interval '10 hours')$$,
  'P0001', 'quote_not_accepted',
  'book_appointment lehnt ein nicht angenommenes Angebot ab'
);
select throws_ok(
  $$select public.book_appointment('d0000000-0000-0000-0000-00000000a004', (current_date + 1)::timestamptz + interval '10 hours')$$,
  'P0001', 'feature_not_available',
  'book_appointment lehnt Buchung ohne Calendar-Feature ab (Free-Plan)'
);
select throws_ok(
  $$select public.book_appointment('d0000000-0000-0000-0000-00000000a001', now() - interval '1 day')$$,
  'P0001', 'slot_in_past',
  'book_appointment lehnt einen Termin in der Vergangenheit ab'
);

-- --- book_appointment: Erfolgreiche Buchung + Folgesperren --------------
select lives_ok(
  $$select public.book_appointment('d0000000-0000-0000-0000-00000000a001', (current_date + 1)::timestamptz + interval '10 hours')$$,
  'book_appointment bucht erfolgreich einen freien Slot'
);
select results_eq(
  $$select status from public.appointments where lead_id = 'd0000000-0000-0000-0000-000000000002'$$,
  ARRAY['scheduled'],
  'Der gebuchte Termin wurde mit Status scheduled angelegt'
);
select throws_ok(
  $$select public.book_appointment('d0000000-0000-0000-0000-00000000a001', (current_date + 1)::timestamptz + interval '14 hours')$$,
  'P0001', 'already_booked',
  'Fuer dieselbe Anfrage kann kein zweiter Termin gebucht werden'
);
select throws_ok(
  $$select public.book_appointment('d0000000-0000-0000-0000-00000000a003', (current_date + 1)::timestamptz + interval '10 hours')$$,
  'P0001', 'slot_unavailable',
  'Ein exakt ueberlappender Slot fuer eine ANDERE Anfrage desselben Business wird durch die DB-Exclusion-Constraint verhindert (harte Doppelbuchungs-Sperre)'
);

-- --- Termin taucht ausschliesslich beim richtigen Kunden auf ------------
select results_eq(
  $$select (public.get_public_quote('d0000000-0000-0000-0000-00000000a001')->'appointment'->>'status')$$,
  ARRAY['scheduled'],
  'get_public_quote zeigt nach der Buchung den eigenen Termin'
);
select is(
  (select public.get_public_quote('d0000000-0000-0000-0000-00000000a004')->'appointment'),
  null,
  'Die Buchung bei Business A taucht NICHT im Angebot eines anderen Business/Kunden auf'
);

select * from finish();
rollback;
