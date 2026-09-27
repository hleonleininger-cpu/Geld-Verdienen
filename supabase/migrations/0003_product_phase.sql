-- =====================================================================
-- Migration 0003: Produkt-Phase (Onboarding -> Aktivierung -> Bezahlung)
-- =====================================================================
-- Baut auf 0001 + 0002 auf. Fuehrt ein: services, erweiterte
-- Lead-Pipeline-Stages, vollstaendigen Quote-Workflow mit oeffentlichem
-- Token-Zugriff, activity_events, notifications, Plan-/Trial-/Billing-
-- Felder, referral_events und analytics_events.
--
-- Designprinzip "lazy evaluation statt Cron": Trial-Ablauf und
-- Quote-Ablauf (`valid_until`) werden NICHT durch einen Hintergrundjob in
-- einen neuen Status ueberfuehrt, sondern bei jedem Lesezugriff aus den
-- Zeitstempeln berechnet (siehe lib/entitlements.ts::getEffectivePlan und
-- lib/quotes.ts::getEffectiveQuoteStatus). Das macht das System robust
-- gegen einen fehlenden/verzoegerten Cron, was in einer Serverless-
-- Umgebung (Cloudflare Workers) nicht garantiert verfuegbar ist.
-- =====================================================================

-- ---------------------------------------------------------------------
-- businesses: Onboarding, Branding, Plan/Trial/Billing, Referral
-- ---------------------------------------------------------------------
alter table public.businesses
  add column if not exists tagline text check (char_length(tagline) <= 160),
  add column if not exists accent_color text check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists opening_hours jsonb not null default '[]'::jsonb,
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb,
  add column if not exists published boolean not null default true,
  add column if not exists onboarding_step int not null default 0,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists plan text not null default 'free',
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists referral_code text,
  add column if not exists referred_by_code text;

alter table public.businesses drop constraint if exists businesses_plan_check;
alter table public.businesses
  add constraint businesses_plan_check check (plan in ('free', 'starter', 'pro', 'business'));

alter table public.businesses drop constraint if exists businesses_subscription_status_check;
alter table public.businesses
  add constraint businesses_subscription_status_check
  check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled'));

alter table public.businesses drop constraint if exists businesses_onboarding_step_check;
alter table public.businesses
  add constraint businesses_onboarding_step_check check (onboarding_step between 0 and 10);

create unique index if not exists businesses_referral_code_idx
  on public.businesses (referral_code) where referral_code is not null;

-- Bestehende Zeilen (vor dieser Migration) gelten als abgeschlossen
-- onboarded, damit sie nicht plötzlich in den Wizard zurückgeworfen werden.
update public.businesses
  set onboarding_step = 10, onboarding_completed_at = coalesce(onboarding_completed_at, created_at)
  where onboarding_completed_at is null;

-- Referral-Code fuer bestehende Businesses nachtragen (kurzer,
-- URL-freundlicher Zufallscode).
update public.businesses
  set referral_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where referral_code is null;

alter table public.businesses alter column referral_code set not null;

-- ---------------------------------------------------------------------
-- services
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

-- Oeffentlich lesbar (nur aktive Leistungen), damit die oeffentliche
-- Anfrageseite sie anzeigen kann, ohne dass der Besucher eingeloggt ist.
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
-- leads: erweiterte Pipeline-Stages, Prioritaet, Assignee
-- ---------------------------------------------------------------------
-- Bestehende 'in_progress'-Leads werden zu 'contacted' migriert (naechst-
-- liegende neue Stage), bevor die alte Check-Constraint durch die neue
-- (mit den zusaetzlichen Stages) ersetzt wird.
update public.leads set status = 'contacted' where status = 'in_progress';

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads
  add constraint leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'quote_sent', 'negotiating', 'won', 'lost'));

alter table public.leads
  add column if not exists priority text not null default 'medium',
  add column if not exists assignee_id uuid references auth.users (id) on delete set null;

alter table public.leads drop constraint if exists leads_priority_check;
alter table public.leads
  add constraint leads_priority_check check (priority in ('low', 'medium', 'high'));

-- ---------------------------------------------------------------------
-- quotes: vollstaendiger Workflow (Status, Positionen, oeffentlicher Token)
-- ---------------------------------------------------------------------
create sequence if not exists public.quote_number_seq;

alter table public.quotes
  add column if not exists status text not null default 'draft',
  add column if not exists public_token uuid not null default gen_random_uuid(),
  add column if not exists quote_number text,
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists subtotal numeric(10, 2) not null default 0,
  add column if not exists discount_amount numeric(10, 2) not null default 0,
  add column if not exists tax_rate numeric(5, 2) not null default 0,
  add column if not exists tax_amount numeric(10, 2) not null default 0,
  add column if not exists notes text,
  add column if not exists terms text,
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz;

-- Bestehende Angebote (vor dieser Migration) gelten als bereits gesendet,
-- damit sie nicht rueckwirkend als "Entwurf" erscheinen.
update public.quotes set status = 'sent', sent_at = coalesce(sent_at, created_at)
  where status = 'draft' and created_at < now();

update public.quotes set quote_number = 'Q-' || lpad(nextval('public.quote_number_seq')::text, 6, '0')
  where quote_number is null;

alter table public.quotes alter column quote_number set not null;
alter table public.quotes drop constraint if exists quotes_quote_number_key;
alter table public.quotes add constraint quotes_quote_number_key unique (quote_number);

alter table public.quotes drop constraint if exists quotes_public_token_key;
alter table public.quotes add constraint quotes_public_token_key unique (public_token);

alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'));

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

create index if not exists quotes_public_token_idx on public.quotes (public_token);

-- ---------------------------------------------------------------------
-- activity_events (Timeline) + notifications
-- ---------------------------------------------------------------------
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

alter table public.activity_events drop constraint if exists activity_events_actor_check;
alter table public.activity_events
  add constraint activity_events_actor_check check (actor in ('system', 'owner', 'customer'));

create index if not exists activity_events_business_created_idx
  on public.activity_events (business_id, created_at desc);
create index if not exists activity_events_lead_created_idx
  on public.activity_events (lead_id, created_at desc) where lead_id is not null;

alter table public.activity_events enable row level security;

create policy "activity_events_select_own"
  on public.activity_events for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Nur der Owner darf direkt (ohne die untenstehende RPC) Events fuer sein
-- eigenes Business einfuegen (z. B. "Angebot gesendet", "Stage geaendert").
-- Vom oeffentlichen Kunden ausgeloeste Events (angesehen/angenommen/
-- abgelehnt) laufen ausschliesslich ueber `record_public_quote_event`
-- (SECURITY DEFINER), damit kein anonymer Insert direkt auf diese Tabelle
-- noetig ist.
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

-- Owner-ausgeloeste Benachrichtigungen (z. B. aus einer kuenftigen
-- Team-Funktion) direkt erlaubt; kundenausgeloeste laufen ueber die RPC.
create policy "notifications_insert_own"
  on public.notifications for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Trigger: Timeline-Event + Benachrichtigung fuer jede neue Anfrage.
-- SECURITY DEFINER, weil die INSERT-Policies fuer activity_events/
-- notifications (`..._insert_own`) einen eingeloggten Owner voraussetzen,
-- eine neue Anfrage aber ueber das oeffentliche (anonyme) Formular kommt
-- (siehe `leads_insert_public` im urspruenglichen Schema).
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
-- Oeffentlicher Quote-Zugriff: SECURITY DEFINER RPC
-- ---------------------------------------------------------------------
-- Der Kunde greift NIE direkt auf `quotes`/`leads`/`activity_events`/
-- `notifications` zu (dafuer gibt es keine anon-Policy) – ausschliesslich
-- ueber diese eng gefasste Funktion, identifiziert durch den zufaelligen
-- `public_token` (nicht die fortlaufende `id`).
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
    'business_logo_url', b.logo_url
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
-- Storage: Business-Galerie (Phase 3)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery', 'gallery', true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gallery_public_read" on storage.objects;
create policy "gallery_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

drop policy if exists "gallery_owner_write" on storage.objects;
create policy "gallery_owner_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gallery_owner_delete" on storage.objects;
create policy "gallery_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- referral_events
-- ---------------------------------------------------------------------
create table if not exists public.referral_events (
  id bigint generated always as identity primary key,
  referral_code text not null,
  event_type text not null,
  referred_business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.referral_events drop constraint if exists referral_events_event_type_check;
alter table public.referral_events
  add constraint referral_events_event_type_check check (event_type in ('clicked', 'signed_up'));

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
-- analytics_events (Produkt-Funnel, nur fuer /admin sichtbar)
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
      'signup', 'onboarding_started', 'onboarding_completed',
      'business_page_published', 'lead_created', 'quote_created',
      'quote_sent', 'quote_viewed', 'quote_accepted', 'appointment_created',
      'lead_won', 'trial_started', 'checkout_started', 'subscription_started'
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
-- Ende Migration 0003
-- =====================================================================
