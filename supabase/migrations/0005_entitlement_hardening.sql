-- =====================================================================
-- Entitlement-Haertung + Datenintegritaet (Stabilitaets-Audit)
-- =====================================================================
-- Zwei unabhaengige, kleine Fixes, gefunden bei einem Production-Readiness-
-- Audit vor dem ersten zahlenden Kunden:
--
-- 1. `custom_forms` (Formular-Builder, Pro-Plan) wurde bisher NUR in der
--    Next.js Server Action (`createForm()`) geprueft, nicht in RLS. Ein
--    Free-Plan-Nutzer haette per direktem PostgREST-Request (eigener JWT,
--    ohne die App zu benutzen) ein `request_forms`-Row anlegen und aktivieren
--    koennen. `calendar` (Terminbuchung) war bereits korrekt auf DB-Ebene
--    ueber `business_has_calendar_feature()` abgesichert – dieselbe
--    Absicherung fehlte fuer `custom_forms`.
-- 2. `businesses.owner_id` hatte keine UNIQUE-Constraint. Ein doppeltes,
--    (fast) gleichzeitiges Absenden von Onboarding-Schritt 1 (Doppelklick,
--    zwei Tabs) haette zwei Business-Zeilen fuer denselben Nutzer anlegen
--    koennen – `getCurrentBusiness()` nutzt `.maybeSingle()` und wuerde bei
--    mehr als einer Zeile einen Fehler werfen, was den betroffenen Nutzer
--    komplett aus seinem eigenen Dashboard aussperren wuerde.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. custom_forms-Feature serverseitig (DB-Ebene) durchsetzen
-- ---------------------------------------------------------------------
-- Spiegelt lib/entitlements.ts (PLAN_FEATURES.custom_forms) UND die
-- bereits bestehende business_has_calendar_feature()-Logik. Beide Features
-- haben zufaellig denselben Plan-Schwellenwert (pro/business), werden aber
-- bewusst als getrennte Funktionen gefuehrt, damit sie unabhaengig
-- voneinander geaendert werden koennen, ohne das jeweils andere Feature zu
-- beeinflussen.
create or replace function public.business_has_custom_forms_feature(p_business_id uuid)
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

-- Nur INSERT ("Anlegen") wird gegated, nicht UPDATE: ein bereits
-- bestehendes Formular soll nach einem Downgrade weiter bearbeitbar/
-- de-/aktivierbar bleiben ("kein Datenverlust bei Downgrade", siehe
-- app/dashboard/forms/actions.ts::createForm-Kommentar).
drop policy if exists "request_forms_insert_own" on public.request_forms;
create policy "request_forms_insert_own"
  on public.request_forms for insert
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
    and public.business_has_custom_forms_feature(business_id)
  );

-- ---------------------------------------------------------------------
-- 2. Genau ein Business pro Nutzer auf DB-Ebene erzwingen
-- ---------------------------------------------------------------------
alter table public.businesses
  add constraint businesses_owner_id_unique unique (owner_id);
