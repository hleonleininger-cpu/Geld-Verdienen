-- =====================================================================
-- AnfragePilot - Demo-Seed-Daten
-- =====================================================================
-- Erzeugt EIN Demo-Unternehmen mit Beispiel-Anfragen, damit du die App
-- sofort mit realistischen Daten in deinem eigenen Account zeigen kannst.
--
-- WARUM NUR EIN BUSINESS? Seit Migration 0005 hat `businesses.owner_id`
-- eine UNIQUE-Constraint (genau ein Business pro Nutzer – das spiegelt,
-- wie die App tatsaechlich funktioniert: `getCurrentBusiness()` sucht
-- immer genau eine Zeile per `owner_id`). Vor Migration 0005 seedete
-- dieses Skript 5 Businesses (eines pro Branche) unter demselben
-- Platzhalter-Owner – das wuerde jetzt bei der zweiten Zeile mit einem
-- Unique-Constraint-Fehler abbrechen. Alle 5 Branchen mit Beispieldaten
-- ansehen kannst du stattdessen unter `/demo` (statische, produktions-
-- unabhaengige Demo, siehe lib/demo/data.ts) – ohne eigenen Account.
--
-- WICHTIG: Dieses Business braucht einen owner_id, der auf einen
-- echten Eintrag in auth.users zeigt (Fremdschluessel-Pflicht).
-- Lege dir zuerst ueber /register ein Konto an, kopiere danach deine
-- User-ID (Supabase Dashboard -> Authentication -> Users) und setze sie
-- unten anstelle von 'DEINE-USER-ID' ein. Fuehre das Skript danach im
-- SQL-Editor aus.
-- =====================================================================

do $$
declare
  demo_owner uuid := 'DEINE-USER-ID'; -- <-- ersetzen!
  biz_autopflege uuid := gen_random_uuid();
begin

  insert into public.businesses (id, owner_id, business_name, slug, industry, description, phone, email, created_at)
  values
    (biz_autopflege, demo_owner, 'Glanzwerk Autopflege', 'glanzwerk-autopflege', 'autopflege',
     'Mobile Fahrzeugaufbereitung fuer Privat- und Firmenkunden in Muenchen und Umgebung.',
     '+49 89 1234567', 'kontakt@glanzwerk-beispiel.de', now() - interval '21 days')
  on conflict do nothing;

  insert into public.leads (business_id, customer_name, customer_email, customer_phone, service, preferred_date, location, budget, description, status, created_at)
  values
    (biz_autopflege, 'Max Mustermann', 'max.mustermann@example.com', '+49 170 1112233',
     'Innen- und Aussenreinigung', current_date + 5, 'München-Schwabing', '100-150 €',
     'BMW 3er, starke Verschmutzung nach Umzug, gerne am Samstagvormittag.', 'new', now() - interval '2 hours'),
    (biz_autopflege, 'Julia Weber', 'julia.weber@example.com', '+49 171 2223344',
     'Lackversiegelung', current_date + 10, 'München-Sendling', '250-400 €',
     'Neuwagen, moechte langfristigen Lackschutz.', 'contacted', now() - interval '2 days');

  insert into public.services (business_id, name, description, category, price, duration_minutes)
  values
    (biz_autopflege, 'Innen- und Aussenreinigung', 'Gruendliche Reinigung von Innenraum und Karosserie.', 'Reinigung', 89, 90),
    (biz_autopflege, 'Lackversiegelung', 'Langfristiger Lackschutz inkl. Politur.', 'Versiegelung', 249, 180);

end $$;
