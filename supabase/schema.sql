-- =====================================================================
-- AnfragePilot - Datenbankschema
-- =====================================================================
-- Fuehre dieses Skript im Supabase SQL-Editor deines Projekts aus
-- (Dashboard -> SQL Editor -> New query -> einfuegen -> Run).
-- Reihenfolge: schema.sql zuerst, danach optional seed.sql fuer Demo-Daten.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- users
-- Oeffentliches Spiegelbild von auth.users, damit wir bequem darauf
-- referenzieren / joinen koennen, ohne Passwoerter selbst zu verwalten.
-- Supabase Auth bleibt die einzige Quelle fuer Anmeldedaten.
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

-- Trigger: bei neuer Supabase-Auth-Registrierung automatisch einen
-- Eintrag in public.users anlegen.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  industry text not null,
  description text,
  phone text,
  email text,
  logo_url text,
  created_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);
create index if not exists businesses_slug_idx on public.businesses (slug);

alter table public.businesses enable row level security;

create policy "businesses_select_own"
  on public.businesses for select
  using (auth.uid() = owner_id);

-- Die oeffentliche Anfrage-Seite (/[businessSlug]) muss den Firmennamen,
-- die Beschreibung usw. lesen koennen, ohne dass der Besucher eingeloggt ist.
create policy "businesses_select_public"
  on public.businesses for select
  to anon
  using (true);

create policy "businesses_insert_own"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

create policy "businesses_update_own"
  on public.businesses for update
  using (auth.uid() = owner_id);

create policy "businesses_delete_own"
  on public.businesses for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  service text not null,
  preferred_date date,
  location text,
  budget text,
  description text,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'quote_sent', 'won', 'lost')),
  attachment_url text,
  reminder_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_business_id_idx on public.leads (business_id);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

-- Unternehmer sehen/aendern nur Leads ihrer eigenen Businesses.
create policy "leads_select_own_business"
  on public.leads for select
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

create policy "leads_update_own_business"
  on public.leads for update
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

create policy "leads_delete_own_business"
  on public.leads for delete
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- Jeder (auch nicht eingeloggte Besucher) darf ueber das oeffentliche
-- Formular eine Anfrage fuer ein existierendes Business anlegen.
create policy "leads_insert_public"
  on public.leads for insert
  to anon, authenticated
  with check (
    business_id in (select id from public.businesses)
  );

-- ---------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  title text not null,
  description text,
  price numeric(10, 2) not null default 0,
  valid_until date,
  created_at timestamptz not null default now()
);

create index if not exists quotes_lead_id_idx on public.quotes (lead_id);

alter table public.quotes enable row level security;

create policy "quotes_select_own_business"
  on public.quotes for select
  using (
    lead_id in (
      select l.id from public.leads l
      join public.businesses b on b.id = l.business_id
      where b.owner_id = auth.uid()
    )
  );

create policy "quotes_insert_own_business"
  on public.quotes for insert
  with check (
    lead_id in (
      select l.id from public.leads l
      join public.businesses b on b.id = l.business_id
      where b.owner_id = auth.uid()
    )
  );

create policy "quotes_update_own_business"
  on public.quotes for update
  using (
    lead_id in (
      select l.id from public.leads l
      join public.businesses b on b.id = l.business_id
      where b.owner_id = auth.uid()
    )
  );

create policy "quotes_delete_own_business"
  on public.quotes for delete
  using (
    lead_id in (
      select l.id from public.leads l
      join public.businesses b on b.id = l.business_id
      where b.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Storage: Logos (oeffentlich lesbar) & Anfrage-Anhaenge (privat)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', false)
on conflict (id) do nothing;

-- Logos: jeder darf lesen (oeffentliche Landingpage/Anfrage-Seite zeigt sie),
-- nur eingeloggte Nutzer duerfen in ihren eigenen Ordner (uid/...) schreiben.
create policy "logos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'logos');

create policy "logos_owner_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Anfrage-Anhaenge: jeder Besucher darf waehrend des Absendens hochladen
-- (Ordnername = business_id, damit der Upload eindeutig zugeordnet ist),
-- gelesen werden darf nur vom Besitzer des jeweiligen Business.
create policy "attachments_public_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'lead-attachments');

create policy "attachments_owner_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lead-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where owner_id = auth.uid()
    )
  );

-- =====================================================================
-- Ende Schema
-- =====================================================================
