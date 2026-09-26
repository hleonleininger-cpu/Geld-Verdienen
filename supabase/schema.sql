-- =====================================================================
-- AnfragePilot - Datenbankschema (konsolidierter, aktueller Stand)
-- =====================================================================
-- Fuer einen FRESH INSTALL: fuehre dieses Skript im Supabase SQL-Editor
-- deines Projekts aus (Dashboard -> SQL Editor -> New query -> einfuegen
-- -> Run). Reihenfolge: schema.sql zuerst, danach optional seed.sql fuer
-- Demo-Daten.
--
-- Fuer eine BEREITS BESTEHENDE Datenbank (z. B. schon mit dem MVP-Stand
-- deployed): nutze stattdessen die einzelnen Dateien unter
-- `supabase/migrations/` der Reihe nach, statt dieses Skript erneut
-- auszufuehren (sonst schlagen z. B. `create policy`-Statements auf schon
-- existierende Policies fehl). Kuenftige Schemaaenderungen werden als neue
-- Migration unter `supabase/migrations/000N_*.sql` ergaenzt UND hier in
-- der konsolidierten Fassung nachgezogen.
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

-- Gemeinsame Funktion, um `updated_at` bei jedem UPDATE automatisch
-- nachzuführen (businesses/leads/quotes).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  industry text not null,
  description text check (char_length(description) <= 2000),
  phone text check (char_length(phone) <= 40),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);
-- `slug` ist bereits `unique`, was in Postgres automatisch einen Index anlegt;
-- ein zusaetzlicher expliziter Index ist daher nicht noetig.

alter table public.businesses enable row level security;

create policy "businesses_select_own"
  on public.businesses for select
  using (auth.uid() = owner_id);

-- Die oeffentliche Anfrage-Seite (/[businessSlug]) muss den Firmennamen,
-- die Beschreibung usw. lesen koennen – unabhaengig davon, ob der Besucher
-- eingeloggt ist (z. B. ein anderer Unternehmer, der sich eine fremde
-- Anfrageseite ansieht) oder nicht. Ohne `authenticated` in der Rollenliste
-- wuerde ein eingeloggter Nutzer auf FREMDEN oeffentlichen Anfrageseiten
-- faelschlich einen 404 sehen, weil dann nur `businesses_select_own` greift.
create policy "businesses_select_public"
  on public.businesses for select
  to anon, authenticated
  using (true);

create policy "businesses_insert_own"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

-- WICHTIG: `with check` ist hier zusaetzlich zu `using` noetig, sonst
-- koennte ein Owner sein eigenes Business per UPDATE einer anderen
-- `owner_id` "uebergeben" (Cross-Tenant-Schreibzugriff ueber ein Update,
-- nicht nur ueber Insert).
create policy "businesses_update_own"
  on public.businesses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "businesses_delete_own"
  on public.businesses for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text not null check (customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone text check (char_length(customer_phone) <= 40),
  service text not null check (char_length(service) between 1 and 160),
  preferred_date date,
  location text check (char_length(location) <= 160),
  budget text check (char_length(budget) <= 80),
  description text check (char_length(description) <= 2000),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'quote_sent', 'won', 'lost')),
  attachment_url text,
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deckt den haeufigsten Dashboard-Query ab: alle Leads eines Business,
-- neueste zuerst (siehe lib/data/leads.ts::getLeadsForBusiness).
create index if not exists leads_business_id_created_at_idx
  on public.leads (business_id, created_at desc);
create index if not exists leads_status_idx on public.leads (status);
-- Partieller Index fuer die Erinnerungs-Anzeige im Dashboard (nur Zeilen
-- mit gesetzter Erinnerung sind fuer diese Abfrage relevant).
create index if not exists leads_reminder_at_idx
  on public.leads (reminder_at) where reminder_at is not null;

alter table public.leads enable row level security;

-- Unternehmer sehen/aendern nur Leads ihrer eigenen Businesses.
create policy "leads_select_own_business"
  on public.leads for select
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- `with check` verhindert, dass ein Owner per UPDATE die `business_id`
-- eines eigenen Leads auf ein FREMDES Business umbiegt (Cross-Tenant-
-- Injection ueber ein Update statt ueber Insert).
create policy "leads_update_own_business"
  on public.leads for update
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  )
  with check (
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

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
  before update on public.leads
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 4000),
  price numeric(10, 2) not null default 0 check (price >= 0),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- `with check` verhindert, dass ein Owner ein eigenes Angebot per UPDATE
-- an einen FREMDEN Lead (eines anderen Business) umhaengt.
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

create policy "quotes_delete_own_business"
  on public.quotes for delete
  using (
    lead_id in (
      select l.id from public.leads l
      join public.businesses b on b.id = l.business_id
      where b.owner_id = auth.uid()
    )
  );

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
  before update on public.quotes
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- Storage: Logos (oeffentlich lesbar) & Anfrage-Anhaenge (privat)
-- ---------------------------------------------------------------------
-- `file_size_limit` (Bytes) und `allowed_mime_types` werden zusaetzlich zur
-- serverseitigen Validierung in den Server Actions gesetzt: Wer die
-- Next.js-App umgeht und direkt gegen die Supabase-Storage-API postet
-- (z. B. mit dem oeffentlichen anon-Key), darf trotzdem keine beliebig
-- grossen oder beliebig typisierten Dateien hochladen ("Do not rely on UI
-- restrictions as authorization").
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true,
  3145728, -- 3 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-attachments', 'lead-attachments', false,
  8388608, -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Anfrage-Anhaenge: jeder Besucher darf waehrend des Absendens hochladen
-- (Ordnername = business_id, damit der Upload eindeutig zugeordnet ist),
-- gelesen werden darf nur vom Besitzer des jeweiligen Business. Der Upload
-- ist zusaetzlich auf Pfade beschraenkt, deren erstes Segment eine
-- tatsaechlich existierende `business_id` ist – das verhindert, dass der
-- private Bucket mit beliebigen/erfundenen Ordnernamen zugemuellt wird.
create policy "attachments_public_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'lead-attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and (storage.foldername(name))[1]::uuid in (select id from public.businesses)
  );

create policy "attachments_owner_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lead-attachments'
    and (storage.foldername(name))[1] in (
      select id::text from public.businesses where owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Admin-Rolle (DB-gestuetzt statt nur ueber eine Client-Umgebungsvariable)
-- ---------------------------------------------------------------------
-- Siehe docs/SECURITY.md ("Admin-Autorisierung") fuer die Begruendung:
-- ADMIN_EMAILS bleibt ein Server-only-Bootstrap-Fallback fuer die lokale
-- Entwicklung, die eigentliche Autorisierungsquelle in Produktion ist
-- dieses Flag. Es kann NUR ueber den Service-Role-Key (oder direkt im SQL
-- Editor) gesetzt werden – es existiert bewusst KEINE UPDATE-Policy dafuer,
-- die authenticated-Nutzern erlauben wuerde, sich selbst zum Admin zu machen.
alter table public.users add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------
-- Rate-Limiting fuer das oeffentliche Anfrageformular
-- ---------------------------------------------------------------------
-- Die Tabelle selbst ist ueber PostgREST NICHT direkt erreichbar (RLS an,
-- aber bewusst keine Policies fuer anon/authenticated) – Zugriff nur ueber
-- die SECURITY DEFINER Funktion unten, die Zaehlen und Schreiben atomar
-- kapselt und niemals Zeilen an den Client zurueckgibt.
create table if not exists public.lead_submission_attempts (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_submission_attempts_lookup_idx
  on public.lead_submission_attempts (business_id, ip_hash, created_at desc);

alter table public.lead_submission_attempts enable row level security;

-- Alte Eintraege muessen nicht ewig aufbewahrt werden; ein taegliches Cron-
-- Job (z. B. Supabase Cron oder pg_cron) kann optional
-- `delete from public.lead_submission_attempts where created_at < now() - interval '7 days'`
-- ausfuehren. Fuer das MVP ist das Datenvolumen unkritisch genug, um darauf
-- zu verzichten.

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
    -- Unbekannte business_id: nichts protokollieren, aber auch nicht
    -- durchlassen. Der eigentliche Insert in `leads` scheitert ohnehin an
    -- der `leads_insert_public`-Policy.
    return false;
  end;

  return true;
end;
$$;

-- Bewusst nur EXECUTE auf die Funktion, nicht auf die Tabelle selbst.
grant execute on function public.check_and_record_lead_attempt(uuid, text, int, int)
  to anon, authenticated;

-- =====================================================================
-- Ende Schema
-- =====================================================================
