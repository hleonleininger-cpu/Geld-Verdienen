-- =====================================================================
-- AnfragePilot - Datenbankschema (konsolidierter, aktueller Stand)
-- =====================================================================
-- Fuer einen FRESH INSTALL: fuehre dieses Skript im Supabase SQL-Editor
-- deines Projekts aus (Dashboard -> SQL Editor -> New query -> einfuegen
-- -> Run). Reihenfolge: schema.sql zuerst, danach optional seed.sql fuer
-- Demo-Daten.
--
-- Fuer eine BEREITS BESTEHENDE Datenbank: nutze stattdessen die einzelnen
-- Dateien unter `supabase/migrations/` der Reihe nach, statt dieses
-- Skript erneut auszufuehren. Kuenftige Schemaaenderungen werden als neue
-- Migration unter `supabase/migrations/000N_*.sql` ergaenzt UND hier in
-- der konsolidierten Fassung nachgezogen.
--
-- Design-Prinzip "lazy evaluation statt Cron": Trial-Ablauf
-- (businesses.trial_ends_at) und Quote-Ablauf (quotes.valid_until) werden
-- NICHT durch einen Hintergrundjob in einen neuen Status ueberfuehrt,
-- sondern bei jedem Lesezugriff aus den Zeitstempeln berechnet (siehe
-- lib/entitlements.ts und die RPC `record_public_quote_event` unten). Das
-- macht das System robust gegen einen fehlenden Cron in einer Serverless-
-- Umgebung wie Cloudflare Workers.
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
  -- DB-gestuetzte Admin-Autorisierung (siehe docs/SECURITY.md). Kann NUR
  -- ueber den Service-Role-Key oder direkt im SQL-Editor gesetzt werden –
  -- es existiert bewusst keine UPDATE-Policy dafuer.
  is_admin boolean not null default false,
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
-- nachzuführen (businesses/leads/quotes/services).
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
  tagline text check (char_length(tagline) <= 160),
  phone text check (char_length(phone) <= 40),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  logo_url text,
  -- Branding/Content fuer die oeffentliche Mini-Site (Phase 3)
  accent_color text check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$'),
  opening_hours jsonb not null default '[]'::jsonb,
  gallery_urls jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  -- Onboarding (Phase 1): onboarding_step ist der naechste zu zeigende
  -- Schritt (0 = noch nicht gestartet, 10 = abgeschlossen).
  onboarding_step int not null default 0 check (onboarding_step between 0 and 10),
  onboarding_completed_at timestamptz,
  -- Plan / Trial / Billing (Phasen 11-13)
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'business')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  -- Referrals (Phase 15)
  referral_code text not null unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  referred_by_code text,
  -- Demo-Isolation (Conversion-Funnel-Phase): eine als Demo markierte
  -- Business-Zeile wird aus Admin-Wachstumszahlen und Lead-Kontingenten
  -- ausgeschlossen (siehe app/admin/page.tsx, app/actions/leads.ts) und
  -- nie mit echten Mandanten vermischt.
  is_demo boolean not null default false,
  -- Terminbuchung (Conversion-Funnel-Phase): nur wirksam, wenn der
  -- effektive Plan das "calendar"-Feature freischaltet (siehe
  -- lib/entitlements.ts + business_has_calendar_feature() unten).
  appointment_duration_minutes int not null default 60
    check (appointment_duration_minutes > 0 and appointment_duration_minutes <= 480),
  appointment_buffer_minutes int not null default 0
    check (appointment_buffer_minutes >= 0 and appointment_buffer_minutes <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);
-- `slug`/`referral_code` sind bereits `unique`, was automatisch einen
-- Index anlegt; ein zusaetzlicher expliziter Index ist daher nicht noetig.

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
-- Das `published`-Flag wird bewusst NICHT in der Policy geprueft (der
-- Owner soll seine eigene, noch unveroeffentlichte Seite ueber dieselbe
-- Route als Vorschau sehen koennen) – die Sichtbarkeitsregel fuer
-- Nicht-Owner sitzt in der Anwendungsschicht (app/[businessSlug]/page.tsx).
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
-- services (Phase 9: Leistungskatalog)
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 1000),
  category text check (char_length(category) <= 80),
  price numeric(10, 2) check (price is null or price >= 0),
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_business_id_idx on public.services (business_id);
create index if not exists services_business_active_idx on public.services (business_id, active);

alter table public.services enable row level security;

create policy "services_select_own"
  on public.services for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Oeffentlich lesbar (nur aktive Leistungen), fuer die oeffentliche
-- Anfrageseite/Mini-Site.
create policy "services_select_public"
  on public.services for select
  to anon, authenticated
  using (active = true);

create policy "services_insert_own"
  on public.services for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "services_update_own"
  on public.services for update
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "services_delete_own"
  on public.services for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
  before update on public.services
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
  -- Pipeline-Stages (Phase 7). 'in_progress' aus dem MVP-Stand wird bei
  -- bestehenden Installationen ueber Migration 0003 nach 'contacted'
  -- migriert.
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'quote_sent', 'negotiating', 'won', 'lost')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  -- Fuer eine kuenftige Team-Funktion vorbereitet; im aktuellen
  -- Ein-Owner-Modell gibt es nur einen moeglichen Assignee (den Owner
  -- selbst), daher wird hierfuer bewusst KEINE eigene UI gebaut (siehe
  -- docs/PRODUCT_FLOWS.md).
  assignee_id uuid references auth.users (id) on delete set null,
  attachment_url text,
  reminder_at timestamptz,
  -- Formular-Builder (Conversion-Funnel-Phase): `form_id` verweist auf das
  -- individuelle Formular, ueber das die Anfrage einging (null = altes,
  -- fest eingebautes Standardformular auf /[businessSlug]). Die
  -- FK-Constraint auf request_forms wird weiter unten ergaenzt, da diese
  -- Tabelle erst spaeter in diesem Skript definiert wird.
  form_id uuid,
  custom_answers jsonb not null default '{}'::jsonb,
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
-- quotes (Phase 5: vollstaendiger Angebots-Workflow)
-- ---------------------------------------------------------------------
create sequence if not exists public.quote_number_seq;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  -- Fuer Menschen lesbare Nummer (z. B. "Q-000123"); wird per Trigger
  -- gesetzt, falls nicht explizit angegeben.
  quote_number text not null unique,
  -- Zufaelliges Zugriffstoken fuer die oeffentliche Kunden-Ansicht
  -- (/q/[token]) – bewusst NICHT die fortlaufende `id`, damit ein Token
  -- unabhaengig von der internen ID rotiert werden koennte und niemand
  -- aus einer sichtbaren ID auf benachbarte Angebote schliessen kann
  -- (id ist zwar schon eine UUID, ein separates Token trennt aber
  -- "interner Datensatz-Identifier" und "Zugriffsberechtigung" sauber).
  public_token uuid not null default gen_random_uuid() unique,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 4000),
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  tax_amount numeric(10, 2) not null default 0,
  -- Gesamtbetrag (Subtotal - Rabatt + Steuer). Heisst weiterhin `price`
  -- aus Kompatibilitaet mit dem bereits bestehenden MVP-Code.
  price numeric(10, 2) not null default 0 check (price >= 0),
  valid_until date,
  notes text check (char_length(notes) <= 2000),
  terms text check (char_length(terms) <= 4000),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_lead_id_idx on public.quotes (lead_id);
create index if not exists quotes_public_token_idx on public.quotes (public_token);

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

create or replace function public.set_quote_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.quote_number is null then
    new.quote_number := 'Q-' || lpad(nextval('public.quote_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_quotes_defaults on public.quotes;
create trigger set_quotes_defaults
  before insert on public.quotes
  for each row execute procedure public.set_quote_defaults();

-- Es gibt bewusst KEINE anon/authenticated-Policy, die einen Kunden
-- direkt auf `quotes` zugreifen liesse. Der gesamte oeffentliche
-- Zugriffspfad (lesen, ansehen-vermerken, annehmen, ablehnen) laeuft
-- ausschliesslich ueber die beiden SECURITY DEFINER Funktionen weiter
-- unten, identifiziert durch `public_token`.

-- ---------------------------------------------------------------------
-- activity_events (Phase 8: Timeline) + notifications (Phase 21)
-- ---------------------------------------------------------------------
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor text not null default 'system' check (actor in ('system', 'owner', 'customer')),
  created_at timestamptz not null default now()
);

create index if not exists activity_events_business_created_idx
  on public.activity_events (business_id, created_at desc);
create index if not exists activity_events_lead_created_idx
  on public.activity_events (lead_id, created_at desc) where lead_id is not null;

alter table public.activity_events enable row level security;

create policy "activity_events_select_own"
  on public.activity_events for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Nur der Owner darf direkt (ohne die untenstehenden RPCs) Events fuer
-- sein eigenes Business einfuegen (z. B. "Angebot gesendet", "Stage
-- geaendert"). Vom oeffentlichen Kunden ausgeloeste Events (angesehen/
-- angenommen/abgelehnt) laufen ausschliesslich ueber
-- `record_public_quote_event` (SECURITY DEFINER).
create policy "activity_events_insert_own"
  on public.activity_events for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_business_created_idx
  on public.notifications (business_id, created_at desc);
create index if not exists notifications_business_unread_idx
  on public.notifications (business_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "notifications_delete_own"
  on public.notifications for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "notifications_insert_own"
  on public.notifications for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Trigger: Timeline-Event + Benachrichtigung fuer jede neue Anfrage.
-- SECURITY DEFINER, weil die INSERT-Policies fuer activity_events/
-- notifications (`..._insert_own`) einen eingeloggten Owner voraussetzen,
-- eine neue Anfrage aber ueber das oeffentliche (anonyme) Formular kommt
-- (siehe `leads_insert_public` weiter oben).
-- ---------------------------------------------------------------------
create or replace function public.log_lead_created_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_events (business_id, lead_id, type, actor, payload)
    values (
      new.business_id, new.id, 'lead_created', 'customer',
      jsonb_build_object('customer_name', new.customer_name, 'service', new.service)
    );
  insert into public.notifications (business_id, type, title, body, link)
    values (
      new.business_id, 'lead_created', 'Neue Anfrage',
      new.customer_name || ' hat eine Anfrage gestellt (' || new.service || ').',
      '/dashboard/leads/' || new.id
    );
  return new;
end;
$$;

drop trigger if exists on_lead_created on public.leads;
create trigger on_lead_created
  after insert on public.leads
  for each row execute procedure public.log_lead_created_activity();

-- ---------------------------------------------------------------------
-- Oeffentlicher Quote-Zugriff (Kern des "Customer Portal", Phase 4/5)
-- ---------------------------------------------------------------------
-- Der Kunde greift NIE direkt auf `quotes`/`leads`/`activity_events`/
-- `notifications` zu (dafuer gibt es keine anon-Policy) – ausschliesslich
-- ueber diese beiden eng gefassten Funktionen, identifiziert durch den
-- zufaelligen `public_token` (nicht die fortlaufende `id`).
create or replace function public.get_public_quote(p_public_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', q.id,
    'quote_number', q.quote_number,
    'title', q.title,
    'description', q.description,
    'line_items', q.line_items,
    'subtotal', q.subtotal,
    'discount_amount', q.discount_amount,
    'tax_rate', q.tax_rate,
    'tax_amount', q.tax_amount,
    'price', q.price,
    'valid_until', q.valid_until,
    'notes', q.notes,
    'terms', q.terms,
    'status', q.status,
    'created_at', q.created_at,
    'sent_at', q.sent_at,
    'viewed_at', q.viewed_at,
    'accepted_at', q.accepted_at,
    'declined_at', q.declined_at,
    'customer_name', l.customer_name,
    'customer_email', l.customer_email,
    'business_name', b.business_name,
    'business_phone', b.phone,
    'business_email', b.email,
    'business_logo_url', b.logo_url,
    'calendar_enabled', public.business_has_calendar_feature(b.id),
    'appointment', (
      select jsonb_build_object('id', a.id, 'scheduled_at', a.scheduled_at, 'status', a.status)
      from public.appointments a
      where a.lead_id = l.id
      order by a.created_at desc
      limit 1
    )
  ) into v_result
  from public.quotes q
  join public.leads l on l.id = q.lead_id
  join public.businesses b on b.id = l.business_id
  where q.public_token = p_public_token;

  return v_result; -- null, wenn kein Treffer (Route zeigt dann 404)
end;
$$;

grant execute on function public.get_public_quote(uuid) to anon, authenticated;

create or replace function public.record_public_quote_event(
  p_public_token uuid,
  p_event text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote record;
begin
  if p_event not in ('viewed', 'accepted', 'declined') then
    raise exception 'invalid_event';
  end if;

  select q.id, q.status, q.valid_until, q.lead_id, l.business_id
    into v_quote
  from public.quotes q
  join public.leads l on l.id = q.lead_id
  where q.public_token = p_public_token;

  if not found then
    raise exception 'not_found';
  end if;

  -- Lazy-Ablauf: ein Angebot nach `valid_until` gilt als abgelaufen und
  -- kann nicht mehr angenommen/abgelehnt werden (Ansehen bleibt erlaubt).
  if p_event in ('accepted', 'declined')
     and v_quote.valid_until is not null
     and v_quote.valid_until < current_date then
    raise exception 'expired';
  end if;

  if p_event = 'viewed' then
    if v_quote.status = 'sent' then
      update public.quotes set status = 'viewed', viewed_at = now() where id = v_quote.id;
      insert into public.activity_events (business_id, lead_id, quote_id, type, actor)
        values (v_quote.business_id, v_quote.lead_id, v_quote.id, 'quote_viewed', 'customer');
      insert into public.notifications (business_id, type, title, body, link)
        values (
          v_quote.business_id, 'quote_viewed', 'Angebot angesehen',
          'Ein Kunde hat dein Angebot geöffnet.',
          '/dashboard/leads/' || v_quote.lead_id
        );
    end if;
  elsif p_event = 'accepted' then
    if v_quote.status not in ('sent', 'viewed') then
      raise exception 'invalid_transition';
    end if;
    update public.quotes set status = 'accepted', accepted_at = now() where id = v_quote.id;
    update public.leads set status = 'won'
      where id = v_quote.lead_id and status not in ('won', 'lost');
    insert into public.activity_events (business_id, lead_id, quote_id, type, actor)
      values (v_quote.business_id, v_quote.lead_id, v_quote.id, 'quote_accepted', 'customer');
    insert into public.notifications (business_id, type, title, body, link)
      values (
        v_quote.business_id, 'quote_accepted', 'Angebot angenommen! 🎉',
        'Ein Kunde hat dein Angebot angenommen.',
        '/dashboard/leads/' || v_quote.lead_id
      );
  elsif p_event = 'declined' then
    if v_quote.status not in ('sent', 'viewed') then
      raise exception 'invalid_transition';
    end if;
    update public.quotes set status = 'declined', declined_at = now() where id = v_quote.id;
    insert into public.activity_events (business_id, lead_id, quote_id, type, actor)
      values (v_quote.business_id, v_quote.lead_id, v_quote.id, 'quote_declined', 'customer');
    insert into public.notifications (business_id, type, title, body, link)
      values (
        v_quote.business_id, 'quote_declined', 'Angebot abgelehnt',
        'Ein Kunde hat dein Angebot abgelehnt.',
        '/dashboard/leads/' || v_quote.lead_id
      );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.record_public_quote_event(uuid, text) to anon, authenticated;

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

-- Business-Galerie (Phase 3): oeffentlich lesbar, nur der Owner darf in
-- seinen eigenen Ordner schreiben.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery', 'gallery', true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
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

create policy "gallery_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

create policy "gallery_owner_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "gallery_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);

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

-- ---------------------------------------------------------------------
-- referral_events (Phase 15)
-- ---------------------------------------------------------------------
create table if not exists public.referral_events (
  id bigint generated always as identity primary key,
  referral_code text not null,
  event_type text not null check (event_type in ('clicked', 'signed_up')),
  referred_business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists referral_events_code_idx on public.referral_events (referral_code, created_at desc);

alter table public.referral_events enable row level security;

-- Ein Business darf seine EIGENEN Referral-Events sehen (ueber seinen
-- eigenen Code), aber keine fremden.
create policy "referral_events_select_own"
  on public.referral_events for select
  using (
    referral_code in (select referral_code from public.businesses where owner_id = auth.uid())
  );

create policy "referral_events_insert_public"
  on public.referral_events for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------------------
-- analytics_events (Phase 16: Produkt-Funnel, nur fuer /admin sichtbar)
-- ---------------------------------------------------------------------
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  business_id uuid references public.businesses (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_business_idx
  on public.analytics_events (business_id) where business_id is not null;

alter table public.analytics_events enable row level security;

-- Bewusst KEINE select-Policy: analytics_events sind nur ueber den
-- Service-Role-Client (/admin) lesbar, auch nicht fuer den eigenen Owner
-- (vermeidet unnoetige Exposition von Produkt-Telemetrie im MVP-Umfang).
create policy "analytics_events_insert_public"
  on public.analytics_events for insert
  to anon, authenticated
  with check (
    event_name in (
      'landing_view', 'signup', 'onboarding_started', 'onboarding_completed',
      'business_page_published', 'first_form_published', 'lead_created',
      'first_lead', 'quote_created', 'first_quote', 'quote_sent',
      'quote_viewed', 'quote_accepted', 'appointment_booked', 'lead_won',
      'trial_started', 'checkout_started', 'subscription_started'
    )
  );

-- Ein-Query-Aggregation fuer das Admin-Wachstums-Dashboard (Phase 17):
-- zaehlt alle Events gruppiert nach `event_name` in einem Rutsch, statt
-- einer separaten Zaehl-Query pro Funnel-Schritt. SECURITY DEFINER, damit
-- die Funktion trotz fehlender SELECT-Policy auf `analytics_events` lesen
-- kann – per REVOKE/GRANT unten aber ausschliesslich fuer den
-- Service-Role-Client (Admin-Bereich) nutzbar, NICHT fuer anon/authenticated.
create or replace function public.admin_funnel_counts(p_since timestamptz default null)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb)
  from (
    select event_name, count(*) as cnt
    from public.analytics_events
    where p_since is null or created_at >= p_since
    group by event_name
  ) t;
$$;

revoke all on function public.admin_funnel_counts(timestamptz) from public;
grant execute on function public.admin_funnel_counts(timestamptz) to service_role;

-- =====================================================================
-- request_forms + request_form_fields (Custom Request Form Builder)
-- =====================================================================
-- Ein Business kann beliebig viele eigene Anfrageformulare anlegen,
-- erreichbar unter /request/[businessSlug]/[formSlug]. Das alte, fest
-- eingebaute Formular auf /[businessSlug] bleibt komplett unveraendert
-- bestehen (kein `is_default`-Sonderfall noetig, da beide Wege unabhaengig
-- nebeneinander existieren).
create table if not exists public.request_forms (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 1000),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create index if not exists request_forms_business_id_idx on public.request_forms (business_id);

alter table public.request_forms enable row level security;

create policy "request_forms_select_own"
  on public.request_forms for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Oeffentlich lesbar (nur aktive Formulare veroeffentlichter Businesses),
-- fuer die oeffentliche Formularseite /request/[businessSlug]/[formSlug].
-- Ohne die business_id-Einschraenkung waere ueber den anon-Key jedes aktive
-- Formular jedes Tenants auflistbar, auch von Businesses, die ihre Seite
-- noch gar nicht veroeffentlicht haben.
create policy "request_forms_select_public"
  on public.request_forms for select
  to anon, authenticated
  using (
    active = true
    and business_id in (select id from public.businesses where published = true)
  );

create policy "request_forms_insert_own"
  on public.request_forms for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "request_forms_update_own"
  on public.request_forms for update
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "request_forms_delete_own"
  on public.request_forms for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop trigger if exists set_request_forms_updated_at on public.request_forms;
create trigger set_request_forms_updated_at
  before update on public.request_forms
  for each row execute procedure public.set_updated_at();

-- Jetzt, da request_forms existiert, die vorbereitete FK-Spalte auf
-- leads.form_id nachtraeglich mit einer echten Constraint versehen.
alter table public.leads
  add constraint leads_form_id_fkey
  foreign key (form_id) references public.request_forms (id) on delete set null;

create table if not exists public.request_form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.request_forms (id) on delete cascade,
  field_type text not null check (field_type in (
    'text', 'textarea', 'email', 'phone', 'number', 'date',
    'select', 'multiselect', 'checkbox', 'file'
  )),
  label text not null check (char_length(label) between 1 and 200),
  description text check (char_length(description) <= 500),
  required boolean not null default false,
  position int not null default 0,
  -- Auswahloptionen fuer select/multiselect, z. B. ["Klein", "Mittel", "Gross"].
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists request_form_fields_form_id_idx
  on public.request_form_fields (form_id, position);

alter table public.request_form_fields enable row level security;

create policy "request_form_fields_select_own"
  on public.request_form_fields for select
  using (
    form_id in (
      select id from public.request_forms
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );

create policy "request_form_fields_select_public"
  on public.request_form_fields for select
  to anon, authenticated
  using (
    form_id in (
      select rf.id from public.request_forms rf
      join public.businesses b on b.id = rf.business_id
      where rf.active = true and b.published = true
    )
  );

create policy "request_form_fields_insert_own"
  on public.request_form_fields for insert
  with check (
    form_id in (
      select id from public.request_forms
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );

create policy "request_form_fields_update_own"
  on public.request_form_fields for update
  using (
    form_id in (
      select id from public.request_forms
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  )
  with check (
    form_id in (
      select id from public.request_forms
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );

create policy "request_form_fields_delete_own"
  on public.request_form_fields for delete
  using (
    form_id in (
      select id from public.request_forms
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );

drop trigger if exists set_request_form_fields_updated_at on public.request_form_fields;
create trigger set_request_form_fields_updated_at
  before update on public.request_form_fields
  for each row execute procedure public.set_updated_at();

-- =====================================================================
-- Terminbuchung (Appointments): blocked_times + appointments
-- =====================================================================
-- Verfuegbare Zeitfenster werden aus `businesses.opening_hours` (bereits
-- vorhanden, Phase 3) + `appointment_duration_minutes` +
-- `appointment_buffer_minutes` berechnet – keine zusaetzliche
-- "Arbeitszeiten"-Tabelle noetig, Oeffnungszeiten UND Terminverfuegbarkeit
-- sind dasselbe Konzept fuer ein Dienstleistungsunternehmen.
create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists blocked_times_business_idx
  on public.blocked_times (business_id, starts_at);

alter table public.blocked_times enable row level security;

create policy "blocked_times_select_own"
  on public.blocked_times for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "blocked_times_insert_own"
  on public.blocked_times for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "blocked_times_delete_own"
  on public.blocked_times for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Fuer die "kein Doppel-Termin"-Exclusion-Constraint unten (kombiniert
-- Gleichheit auf business_id mit einem Bereichs-Overlap auf time_range in
-- einem einzigen GiST-Index).
create extension if not exists btree_gist;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 480),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text check (char_length(notes) <= 2000),
  public_token uuid not null default gen_random_uuid() unique,
  -- Generierte Spalte statt Berechnung in jeder Query: der GiST-Index fuer
  -- die Exclusion-Constraint braucht eine indexierbare Range-Spalte.
  time_range tstzrange generated always as (
    tstzrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval, '[)')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_business_idx
  on public.appointments (business_id, scheduled_at);
create index if not exists appointments_lead_idx on public.appointments (lead_id);

-- Harte, DB-seitige Doppelbuchungs-Sperre: fuer dasselbe Business koennen
-- sich zwei AKTIVE (scheduled/confirmed) Termine nie zeitlich ueberlappen
-- – unabhaengig davon, ueber welchen Pfad (RPC, Owner-Dashboard, direktes
-- SQL) der Insert erfolgt. Das ist die eigentliche "Prevent double
-- booking"-Garantie, nicht nur eine Anwendungsebene-Pruefung davor.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (business_id with =, time_range with &&)
  where (status in ('scheduled', 'confirmed'));

alter table public.appointments enable row level security;

create policy "appointments_select_own"
  on public.appointments for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "appointments_update_own"
  on public.appointments for update
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "appointments_delete_own"
  on public.appointments for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Bewusst KEINE anon/authenticated INSERT-Policy: jede Buchung laeuft
-- ausschliesslich ueber die SECURITY DEFINER RPC `book_appointment` unten,
-- identifiziert per Quote-`public_token` (gleiches Muster wie
-- `record_public_quote_event`).

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- Server-seitige Plan-Pruefung fuer das Terminbuchungs-Feature
-- ---------------------------------------------------------------------
-- Spiegelt lib/entitlements.ts (PLAN_FEATURES.calendar, TRIAL_PLAN='pro',
-- getEffectivePlanInfo) in SQL, damit die beiden unten stehenden
-- oeffentlichen RPCs "Termine buchen" NIEMALS allein anhand von
-- Client-/UI-Zustand freischalten – ausschliesslich anhand des in der DB
-- gespeicherten, webhook-geschriebenen Plan-/Abo-Zustands ("Never
-- activate paid features solely based on checkout success in the
-- browser"). Bei Aenderungen an den Plan-Regeln MUSS diese Funktion mit
-- lib/entitlements.ts synchron gehalten werden.
create or replace function public.business_has_calendar_feature(p_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_plan text;
  v_subscription_status text;
  v_trial_ends_at timestamptz;
  v_effective_plan text;
begin
  select plan, subscription_status, trial_ends_at
    into v_plan, v_subscription_status, v_trial_ends_at
  from public.businesses
  where id = p_business_id;

  if not found then
    return false;
  end if;

  if v_subscription_status = 'active' then
    v_effective_plan := v_plan;
  elsif v_subscription_status = 'trialing'
        and v_trial_ends_at is not null
        and v_trial_ends_at > now() then
    v_effective_plan := 'pro';
  else
    v_effective_plan := 'free';
  end if;

  return v_effective_plan in ('pro', 'business');
end;
$$;

-- ---------------------------------------------------------------------
-- Oeffentliche Terminbuchungs-RPCs (identifiziert per Quote-public_token)
-- ---------------------------------------------------------------------
-- Ein Kunde darf einen Termin erst NACH Annahme eines Angebots buchen.
-- Beide Funktionen lesen/schreiben `blocked_times`/`appointments` trotz
-- fehlender anon-Policies (SECURITY DEFINER), exakt wie
-- `get_public_quote`/`record_public_quote_event` weiter oben.
create or replace function public.get_available_appointment_slots(
  p_public_token uuid,
  p_date date
) returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_quote_status text;
  v_business_id uuid;
  v_business record;
  v_day_key text;
  v_day_hours record;
  v_duration interval;
  v_buffer interval;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_slots jsonb := '[]'::jsonb;
begin
  select q.status, l.business_id
    into v_quote_status, v_business_id
  from public.quotes q
  join public.leads l on l.id = q.lead_id
  where q.public_token = p_public_token;

  if not found or v_quote_status <> 'accepted' then
    return '[]'::jsonb;
  end if;

  if not public.business_has_calendar_feature(v_business_id) then
    return '[]'::jsonb;
  end if;

  select * into v_business from public.businesses where id = v_business_id;

  v_duration := (v_business.appointment_duration_minutes || ' minutes')::interval;
  v_buffer := (v_business.appointment_buffer_minutes || ' minutes')::interval;

  v_day_key := (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from p_date)::int + 1];

  select * into v_day_hours
  from jsonb_to_recordset(v_business.opening_hours) as x(day text, open text, close text, closed boolean)
  where x.day = v_day_key;

  if not found or v_day_hours.closed then
    return '[]'::jsonb;
  end if;

  v_day_start := (p_date::text || ' ' || v_day_hours.open)::timestamptz;
  v_day_end := (p_date::text || ' ' || v_day_hours.close)::timestamptz;

  if v_day_start < now() then
    v_day_start := now();
  end if;

  v_slot_start := v_day_start;
  while v_slot_start + v_duration <= v_day_end loop
    v_slot_end := v_slot_start + v_duration;

    if not exists (
      select 1 from public.blocked_times bt
      where bt.business_id = v_business_id
        and bt.starts_at < v_slot_end + v_buffer
        and bt.ends_at > v_slot_start - v_buffer
    ) and not exists (
      select 1 from public.appointments a
      where a.business_id = v_business_id
        and a.status in ('scheduled', 'confirmed')
        and a.scheduled_at < v_slot_end + v_buffer
        and (a.scheduled_at + (a.duration_minutes || ' minutes')::interval) > v_slot_start - v_buffer
    ) then
      v_slots := v_slots || jsonb_build_array(to_jsonb(v_slot_start));
    end if;

    v_slot_start := v_slot_start + v_duration;
  end loop;

  return v_slots;
end;
$$;

grant execute on function public.get_available_appointment_slots(uuid, date) to anon, authenticated;

create or replace function public.book_appointment(
  p_public_token uuid,
  p_starts_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_quote_status text;
  v_lead_id uuid;
  v_business_id uuid;
  v_duration_minutes int;
  v_buffer_minutes int;
  v_opening_hours jsonb;
  v_day_key text;
  v_day_hours record;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_duration interval;
  v_buffer interval;
  v_appointment_id uuid;
begin
  select q.id, q.status, l.id, l.business_id
    into v_quote_id, v_quote_status, v_lead_id, v_business_id
  from public.quotes q
  join public.leads l on l.id = q.lead_id
  where q.public_token = p_public_token;

  if not found then
    raise exception 'not_found';
  end if;
  if v_quote_status <> 'accepted' then
    raise exception 'quote_not_accepted';
  end if;
  if not public.business_has_calendar_feature(v_business_id) then
    raise exception 'feature_not_available';
  end if;
  if p_starts_at < now() then
    raise exception 'slot_in_past';
  end if;
  if exists (
    select 1 from public.appointments
    where lead_id = v_lead_id and status in ('scheduled', 'confirmed')
  ) then
    raise exception 'already_booked';
  end if;

  select appointment_duration_minutes, appointment_buffer_minutes, opening_hours
    into v_duration_minutes, v_buffer_minutes, v_opening_hours
  from public.businesses where id = v_business_id;
  v_duration := (v_duration_minutes || ' minutes')::interval;
  v_buffer := (v_buffer_minutes || ' minutes')::interval;

  -- Server-seitige Verfuegbarkeitspruefung ("Create appointment only
  -- after server-side availability check"): der Client sendet nur einen
  -- Zeitpunkt, niemals eine vom Browser berechnete Verfuegbarkeit. Ohne
  -- diese Pruefung koennte die RPC direkt (z. B. per anon-Key) mit einem
  -- beliebigen Zeitpunkt ausserhalb der Oeffnungszeiten oder waehrend
  -- einer blockierten Zeit aufgerufen werden.
  v_day_key := (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from p_starts_at)::int + 1];
  select * into v_day_hours
  from jsonb_to_recordset(v_opening_hours) as x(day text, open text, close text, closed boolean)
  where x.day = v_day_key;

  if not found or v_day_hours.closed then
    raise exception 'outside_business_hours';
  end if;

  v_day_start := (p_starts_at::date::text || ' ' || v_day_hours.open)::timestamptz;
  v_day_end := (p_starts_at::date::text || ' ' || v_day_hours.close)::timestamptz;
  if p_starts_at < v_day_start or (p_starts_at + v_duration) > v_day_end then
    raise exception 'outside_business_hours';
  end if;

  if exists (
    select 1 from public.blocked_times bt
    where bt.business_id = v_business_id
      and bt.starts_at < p_starts_at + v_duration + v_buffer
      and bt.ends_at > p_starts_at - v_buffer
  ) then
    raise exception 'slot_unavailable';
  end if;

  begin
    insert into public.appointments
      (business_id, lead_id, quote_id, scheduled_at, duration_minutes, status)
    values
      (v_business_id, v_lead_id, v_quote_id, p_starts_at, v_duration_minutes, 'scheduled')
    returning id into v_appointment_id;
  exception
    when exclusion_violation then
      raise exception 'slot_unavailable';
  end;

  insert into public.activity_events (business_id, lead_id, quote_id, type, actor)
    values (v_business_id, v_lead_id, v_quote_id, 'appointment_booked', 'customer');
  insert into public.notifications (business_id, type, title, body, link)
    values (
      v_business_id, 'appointment_booked', 'Termin gebucht',
      'Ein Kunde hat einen Termin vereinbart.',
      '/dashboard/leads/' || v_lead_id
    );

  return jsonb_build_object(
    'ok', true,
    'appointment_id', v_appointment_id,
    'scheduled_at', p_starts_at
  );
end;
$$;

grant execute on function public.book_appointment(uuid, timestamptz) to anon, authenticated;

-- =====================================================================
-- Webhook-Idempotenz (Stripe)
-- =====================================================================
-- Speichert bereits verarbeitete Stripe-Event-IDs. Bewusst KEINE Policies
-- (auch nicht fuer den Owner) – nur der Service-Role-Client (die
-- Webhook-Route) greift ueberhaupt darauf zu, RLS ohne Policy blockt
-- PostgREST fuer alle anderen vollstaendig.
create table if not exists public.processed_webhook_events (
  id text primary key,
  provider text not null default 'stripe',
  processed_at timestamptz not null default now()
);

alter table public.processed_webhook_events enable row level security;

-- =====================================================================
-- Ende Schema
-- =====================================================================
