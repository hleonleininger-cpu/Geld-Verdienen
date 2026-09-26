-- =====================================================================
-- Migration 0002: Production-Hardening-Pass
-- =====================================================================
-- Baut auf 0001_initial_schema.sql auf. Idempotent genug, um auch ein
-- zweites Mal gefahrlos zu laufen (IF EXISTS/IF NOT EXISTS ueberall wo
-- moeglich; policies werden per DROP POLICY IF EXISTS + CREATE POLICY neu
-- gesetzt, da Postgres kein natives `CREATE OR REPLACE POLICY` kennt).
--
-- Inhalt dieser Migration:
--  1. CHECK-Constraints fuer Textlaengen/Formate (Datenqualitaet)
--  2. `updated_at`-Spalten + Trigger fuer businesses/leads/quotes
--  3. WITH CHECK auf allen UPDATE-Policies (verhindert Cross-Tenant-
--     Injection ueber's Umbiegen von owner_id/business_id/lead_id)
--  4. businesses_select_public: jetzt auch fuer `authenticated`, nicht nur
--     `anon` (Bugfix: eingeloggte Nutzer sahen fremde oeffentliche
--     Business-Seiten faelschlich als 404)
--  5. Storage: file_size_limit/allowed_mime_types auf Bucket-Ebene,
--     Pfad-Validierung fuer Anfrage-Anhaenge, WITH CHECK auf Logo-Update
--  6. Indizes: Composite-Index fuer den haeufigsten Dashboard-Query,
--     Redundante Einzel-Indizes entfernt
--  7. `public.users.is_admin` fuer DB-gestuetzte Admin-Autorisierung
--  8. Rate-Limiting-Tabelle + SECURITY DEFINER Funktion fuers oeffentliche
--     Anfrageformular
--
-- Siehe docs/SECURITY.md fuer die Begruendung jeder einzelnen Aenderung.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1+2) businesses: Constraints, updated_at, Trigger
-- ---------------------------------------------------------------------
alter table public.businesses
  add column if not exists updated_at timestamptz not null default now();

alter table public.businesses drop constraint if exists businesses_business_name_check;
alter table public.businesses
  add constraint businesses_business_name_check
  check (char_length(business_name) between 1 and 120);

alter table public.businesses drop constraint if exists businesses_slug_check;
alter table public.businesses
  add constraint businesses_slug_check
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.businesses drop constraint if exists businesses_description_check;
alter table public.businesses
  add constraint businesses_description_check
  check (char_length(description) <= 2000);

alter table public.businesses drop constraint if exists businesses_phone_check;
alter table public.businesses
  add constraint businesses_phone_check
  check (char_length(phone) <= 40);

alter table public.businesses drop constraint if exists businesses_email_check;
alter table public.businesses
  add constraint businesses_email_check
  check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

drop index if exists businesses_slug_idx; -- redundant: `unique` legt bereits einen Index an

-- ---------------------------------------------------------------------
-- 3+4) businesses: Policies neu setzen (WITH CHECK, public-Select-Fix)
-- ---------------------------------------------------------------------
drop policy if exists "businesses_select_public" on public.businesses;
create policy "businesses_select_public"
  on public.businesses for select
  to anon, authenticated
  using (true);

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own"
  on public.businesses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- leads: Constraints, updated_at, Trigger, Indizes, Policies
-- ---------------------------------------------------------------------
alter table public.leads
  add column if not exists updated_at timestamptz not null default now();

alter table public.leads drop constraint if exists leads_customer_name_check;
alter table public.leads
  add constraint leads_customer_name_check
  check (char_length(customer_name) between 1 and 120);

alter table public.leads drop constraint if exists leads_customer_email_check;
alter table public.leads
  add constraint leads_customer_email_check
  check (customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table public.leads drop constraint if exists leads_customer_phone_check;
alter table public.leads
  add constraint leads_customer_phone_check
  check (char_length(customer_phone) <= 40);

alter table public.leads drop constraint if exists leads_service_check;
alter table public.leads
  add constraint leads_service_check
  check (char_length(service) between 1 and 160);

alter table public.leads drop constraint if exists leads_location_check;
alter table public.leads
  add constraint leads_location_check
  check (char_length(location) <= 160);

alter table public.leads drop constraint if exists leads_budget_check;
alter table public.leads
  add constraint leads_budget_check
  check (char_length(budget) <= 80);

alter table public.leads drop constraint if exists leads_description_check;
alter table public.leads
  add constraint leads_description_check
  check (char_length(description) <= 2000);

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
  before update on public.leads
  for each row execute procedure public.set_updated_at();

drop index if exists leads_business_id_idx; -- ersetzt durch Composite-Index
drop index if exists leads_created_at_idx;   -- ersetzt durch Composite-Index

create index if not exists leads_business_id_created_at_idx
  on public.leads (business_id, created_at desc);
create index if not exists leads_reminder_at_idx
  on public.leads (reminder_at) where reminder_at is not null;

drop policy if exists "leads_update_own_business" on public.leads;
create policy "leads_update_own_business"
  on public.leads for update
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- quotes: Constraints, updated_at, Trigger, Policies
-- ---------------------------------------------------------------------
alter table public.quotes
  add column if not exists updated_at timestamptz not null default now();

alter table public.quotes drop constraint if exists quotes_title_check;
alter table public.quotes
  add constraint quotes_title_check
  check (char_length(title) between 1 and 200);

alter table public.quotes drop constraint if exists quotes_description_check;
alter table public.quotes
  add constraint quotes_description_check
  check (char_length(description) <= 4000);

alter table public.quotes drop constraint if exists quotes_price_check;
alter table public.quotes
  add constraint quotes_price_check
  check (price >= 0);

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
  before update on public.quotes
  for each row execute procedure public.set_updated_at();

drop policy if exists "quotes_update_own_business" on public.quotes;
create policy "quotes_update_own_business"
  on public.quotes for update
  using (
    lead_id in (
      select l.id from public.leads l
      join public.businesses b on b.id = l.business_id
      where b.owner_id = auth.uid()
    )
  )
  with check (
    lead_id in (
      select l.id from public.leads l
      join public.businesses b on b.id = l.business_id
      where b.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Storage: Groessen-/Typ-Limits + Pfad-Validierung
-- ---------------------------------------------------------------------
update storage.buckets set
  file_size_limit = 3145728,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'logos';

update storage.buckets set
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'lead-attachments';

drop policy if exists "logos_owner_update" on storage.objects;
create policy "logos_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments_public_insert" on storage.objects;
create policy "attachments_public_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'lead-attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and (storage.foldername(name))[1]::uuid in (select id from public.businesses)
  );

-- ---------------------------------------------------------------------
-- Admin-Rolle (DB-gestuetzt)
-- ---------------------------------------------------------------------
alter table public.users add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------
-- Rate-Limiting fuer das oeffentliche Anfrageformular
-- ---------------------------------------------------------------------
create table if not exists public.lead_submission_attempts (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_submission_attempts_lookup_idx
  on public.lead_submission_attempts (business_id, ip_hash, created_at desc);

alter table public.lead_submission_attempts enable row level security;

create or replace function public.check_and_record_lead_attempt(
  p_business_id uuid,
  p_ip_hash text,
  p_max_attempts int default 5,
  p_window_minutes int default 60
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.lead_submission_attempts
  where business_id = p_business_id
    and ip_hash = p_ip_hash
    and created_at > now() - (p_window_minutes || ' minutes')::interval;

  if recent_count >= p_max_attempts then
    return false;
  end if;

  begin
    insert into public.lead_submission_attempts (business_id, ip_hash)
    values (p_business_id, p_ip_hash);
  exception when foreign_key_violation then
    return false;
  end;

  return true;
end;
$$;

grant execute on function public.check_and_record_lead_attempt(uuid, text, int, int)
  to anon, authenticated;

-- =====================================================================
-- Ende Migration 0002
-- =====================================================================
