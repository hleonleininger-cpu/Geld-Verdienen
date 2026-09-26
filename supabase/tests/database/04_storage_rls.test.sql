-- =====================================================================
-- pgTAP: RLS-Verhalten fuer Storage-Buckets (logos, lead-attachments)
-- =====================================================================
-- Siehe Hinweis zur Ausfuehrung in 00_setup.test.sql.
--
-- `storage.objects` ist eine reine Metadaten-Tabelle (Dateiname, Bucket,
-- Owner) – ein Insert hier simuliert einen Upload-Versuch, ohne echte
-- Datei-Bytes zu benoetigen, und ist damit fuer RLS-Tests ausreichend.
--
-- Erwartetes Verhalten (siehe supabase/schema.sql):
--  - Ein Nutzer darf ein Logo nur in seinen EIGENEN Ordner (uid/...)
--    hochladen, nicht in den eines fremden Nutzers.
--  - Ein Anfrage-Anhang darf nur unter dem Ordnernamen einer tatsaechlich
--    EXISTIERENDEN business_id hochgeladen werden.
--  - Nur der Business-Owner darf Anhaenge seines Business lesen.
-- =====================================================================

begin;
select plan(4);

select tests.create_supabase_user('alice_storage@test.com');
select tests.create_supabase_user('bob_storage@test.com');

select tests.authenticate_as('alice_storage@test.com');
insert into public.businesses (id, owner_id, business_name, slug, industry)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  tests.get_supabase_uid('alice_storage@test.com'),
  'Alice Foto',
  'alice-foto-rls-test',
  'fotografie'
);

-- Alice darf ein Logo in ihren eigenen Ordner hochladen.
select lives_ok(
  format(
    $$insert into storage.objects (bucket_id, name, owner)
      values ('logos', %L || '/logo.png', %L)$$,
    tests.get_supabase_uid('alice_storage@test.com'),
    tests.get_supabase_uid('alice_storage@test.com')
  ),
  'Alice kann ein Logo in ihren eigenen Ordner hochladen'
);

-- Alice darf KEIN Logo in Bobs Ordner hochladen.
select throws_ok(
  format(
    $$insert into storage.objects (bucket_id, name, owner)
      values ('logos', %L || '/logo.png', %L)$$,
    tests.get_supabase_uid('bob_storage@test.com'),
    tests.get_supabase_uid('alice_storage@test.com')
  ),
  '42501',
  null,
  'Alice kann kein Logo in Bobs Ordner hochladen'
);

-- Anonymer Besucher darf einen Anhang fuer Alices (existierendes) Business
-- hochladen.
select tests.clear_authentication();
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('lead-attachments', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/foto.jpg')$$,
  'Anonymer Besucher kann einen Anhang fuer ein existierendes Business hochladen'
);

-- Anonymer Besucher darf KEINEN Anhang unter einer nicht existierenden
-- business_id hochladen.
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('lead-attachments', '00000000-0000-0000-0000-000000000000/foto.jpg')$$,
  '42501',
  null,
  'Anonymer Besucher kann keinen Anhang unter einer nicht existierenden business_id hochladen'
);

select * from finish();
rollback;
