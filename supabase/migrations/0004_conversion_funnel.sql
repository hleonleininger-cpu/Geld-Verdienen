-- =====================================================================
-- Migration 0004: Conversion-Funnel (Formular-Builder, Termine, E-Mail,
-- Demo-Modus, Webhook-Idempotenz)
-- =====================================================================
-- Baut auf 0001-0003 auf. Fuehrt ein: request_forms/request_form_fields
-- (Custom Request Form Builder), blocked_times/appointments
-- (Terminbuchung mit harter DB-seitiger Doppelbuchungs-Sperre),
-- businesses.is_demo (Demo-Modus-Isolation),
-- businesses.appointment_duration_minutes/appointment_buffer_minutes,
-- leads.form_id/custom_answers, eine erweiterte analytics_events-
-- Allowlist, und processed_webhook_events (Stripe-Webhook-Idempotenz).
-- =====================================================================

-- ---------------------------------------------------------------------
-- businesses: Demo-Flag + Terminbuchungs-Einstellungen
-- ---------------------------------------------------------------------
alter table public.businesses
  add column if not exists is_demo boolean not null default false;

alter table public.businesses
  add column if not exists appointment_duration_minutes int not null default 60;
alter table public.businesses
  drop constraint if exists businesses_appointment_duration_minutes_check;
alter table public.businesses
  add constraint businesses_appointment_duration_minutes_check
  check (appointment_duration_minutes > 0 and appointment_duration_minutes <= 480);

alter table public.businesses
  add column if not exists appointment_buffer_minutes int not null default 0;
alter table public.businesses
  drop constraint if exists businesses_appointment_buffer_minutes_check;
alter table public.businesses
  add constraint businesses_appointment_buffer_minutes_check
  check (appointment_buffer_minutes >= 0 and appointment_buffer_minutes <= 240);

-- ---------------------------------------------------------------------
-- leads: Formular-Builder-Zuordnung
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists form_id uuid;
alter table public.leads
  add column if not exists custom_answers jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- request_forms + request_form_fields (Custom Request Form Builder)
-- ---------------------------------------------------------------------
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

drop policy if exists "request_forms_select_own" on public.request_forms;
create policy "request_forms_select_own"
  on public.request_forms for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "request_forms_select_public" on public.request_forms;
create policy "request_forms_select_public"
  on public.request_forms for select
  to anon, authenticated
  using (
    active = true
    and business_id in (select id from public.businesses where published = true)
  );

drop policy if exists "request_forms_insert_own" on public.request_forms;
create policy "request_forms_insert_own"
  on public.request_forms for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "request_forms_update_own" on public.request_forms;
create policy "request_forms_update_own"
  on public.request_forms for update
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "request_forms_delete_own" on public.request_forms;
create policy "request_forms_delete_own"
  on public.request_forms for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop trigger if exists set_request_forms_updated_at on public.request_forms;
create trigger set_request_forms_updated_at
  before update on public.request_forms
  for each row execute procedure public.set_updated_at();

alter table public.leads drop constraint if exists leads_form_id_fkey;
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
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists request_form_fields_form_id_idx
  on public.request_form_fields (form_id, position);

alter table public.request_form_fields enable row level security;

drop policy if exists "request_form_fields_select_own" on public.request_form_fields;
create policy "request_form_fields_select_own"
  on public.request_form_fields for select
  using (
    form_id in (
      select id from public.request_forms
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );

drop policy if exists "request_form_fields_select_public" on public.request_form_fields;
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

drop policy if exists "request_form_fields_insert_own" on public.request_form_fields;
create policy "request_form_fields_insert_own"
  on public.request_form_fields for insert
  with check (
    form_id in (
      select id from public.request_forms
      where business_id in (select id from public.businesses where owner_id = auth.uid())
    )
  );

drop policy if exists "request_form_fields_update_own" on public.request_form_fields;
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

drop policy if exists "request_form_fields_delete_own" on public.request_form_fields;
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

-- ---------------------------------------------------------------------
-- Terminbuchung: blocked_times + appointments
-- ---------------------------------------------------------------------
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

drop policy if exists "blocked_times_select_own" on public.blocked_times;
create policy "blocked_times_select_own"
  on public.blocked_times for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "blocked_times_insert_own" on public.blocked_times;
create policy "blocked_times_insert_own"
  on public.blocked_times for insert
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "blocked_times_delete_own" on public.blocked_times;
create policy "blocked_times_delete_own"
  on public.blocked_times for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

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
  -- Keine `generated ... stored`-Spalte: Postgres stuft `timestamptz +
  -- interval` als STABLE (nicht IMMUTABLE) ein, das waere fuer eine
  -- generierte Spalte unzulaessig ("generation expression is not
  -- immutable"). Stattdessen per Trigger befuellt (siehe unten).
  time_range tstzrange,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_appointment_time_range()
returns trigger
language plpgsql
as $$
begin
  new.time_range := tstzrange(
    new.scheduled_at,
    new.scheduled_at + (new.duration_minutes || ' minutes')::interval,
    '[)'
  );
  return new;
end;
$$;

drop trigger if exists set_appointments_time_range on public.appointments;
create trigger set_appointments_time_range
  before insert or update on public.appointments
  for each row execute procedure public.set_appointment_time_range();

create index if not exists appointments_business_idx
  on public.appointments (business_id, scheduled_at);
create index if not exists appointments_lead_idx on public.appointments (lead_id);

alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (business_id with =, time_range with &&)
  where (status in ('scheduled', 'confirmed'));

alter table public.appointments enable row level security;

drop policy if exists "appointments_select_own" on public.appointments;
create policy "appointments_select_own"
  on public.appointments for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "appointments_update_own" on public.appointments;
create policy "appointments_update_own"
  on public.appointments for update
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "appointments_delete_own" on public.appointments;
create policy "appointments_delete_own"
  on public.appointments for delete
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute procedure public.set_updated_at();

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

-- ---------------------------------------------------------------------
-- analytics_events: erweiterte Allowlist fuer den vollstaendigen Funnel
-- ---------------------------------------------------------------------
drop policy if exists "analytics_events_insert_public" on public.analytics_events;
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

-- ---------------------------------------------------------------------
-- Stripe-Webhook-Idempotenz
-- ---------------------------------------------------------------------
create table if not exists public.processed_webhook_events (
  id text primary key,
  provider text not null default 'stripe',
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- get_public_quote: um Terminbuchungs-Infos erweitern
-- ---------------------------------------------------------------------
-- Der Kunde muss auf der Angebotsseite sehen koennen, ob die Terminbuchung
-- ueberhaupt verfuegbar ist (Pro-Plan) und ob bereits ein Termin fuer diese
-- Anfrage existiert -- ohne dafuer eine zusaetzliche anon-Policy auf
-- `appointments`/`businesses` zu benoetigen. Ersetzt die urspruengliche
-- Definition von `get_public_quote` (siehe Basis-Schema) 1:1, nur um zwei
-- zusaetzliche Felder ergaenzt.
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

  return v_result;
end;
$$;

grant execute on function public.get_public_quote(uuid) to anon, authenticated;

alter table public.processed_webhook_events enable row level security;
