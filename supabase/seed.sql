-- =====================================================================
-- AnfragePilot - Demo-Seed-Daten
-- =====================================================================
-- Erzeugt EIN Demo-Unternehmen pro Branche mit Beispiel-Anfragen, damit
-- du die App sofort mit realistischen Daten zeigen kannst.
--
-- WICHTIG: Diese Businesses brauchen einen owner_id, der auf einen
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
  biz_reinigung uuid := gen_random_uuid();
  biz_garten uuid := gen_random_uuid();
  biz_foto uuid := gen_random_uuid();
  biz_handwerk uuid := gen_random_uuid();
begin

  insert into public.businesses (id, owner_id, business_name, slug, industry, description, phone, email, created_at)
  values
    (biz_autopflege, demo_owner, 'Glanzwerk Autopflege', 'glanzwerk-autopflege', 'autopflege',
     'Mobile Fahrzeugaufbereitung fuer Privat- und Firmenkunden in Muenchen und Umgebung.',
     '+49 89 1234567', 'kontakt@glanzwerk-beispiel.de', now() - interval '21 days'),
    (biz_reinigung, demo_owner, 'ReinRaum Gebaeudereinigung', 'reinraum-reinigung', 'reinigung',
     'Buero-, Praxis- und Umzugsreinigung mit Festpreisgarantie.',
     '+49 30 9876543', 'info@reinraum-beispiel.de', now() - interval '14 days'),
    (biz_garten, demo_owner, 'GrünWerk Gartenservice', 'gruenwerk-garten', 'gartenservice',
     'Gartenpflege, Baumschnitt und Neuanlagen fuer private Gaerten.',
     '+49 221 5551234', 'hallo@gruenwerk-beispiel.de', now() - interval '10 days'),
    (biz_foto, demo_owner, 'Lichtblick Fotografie', 'lichtblick-fotografie', 'fotografie',
     'Portrait-, Hochzeits- und Businessfotografie im Rhein-Main-Gebiet.',
     '+49 69 2223344', 'studio@lichtblick-beispiel.de', now() - interval '7 days'),
    (biz_handwerk, demo_owner, 'Meisterhand Handwerksservice', 'meisterhand-handwerk', 'handwerk',
     'Renovierungen, Reparaturen und kleine Umbauten aus einer Hand.',
     '+49 40 4445566', 'auftrag@meisterhand-beispiel.de', now() - interval '3 days')
  on conflict (slug) do nothing;

  insert into public.leads (business_id, customer_name, customer_email, customer_phone, service, preferred_date, location, budget, description, status, created_at)
  values
    (biz_autopflege, 'Max Mustermann', 'max.mustermann@example.com', '+49 170 1112233',
     'Innen- und Aussenreinigung', current_date + 5, 'München-Schwabing', '100-150 €',
     'BMW 3er, starke Verschmutzung nach Umzug, gerne am Samstagvormittag.', 'new', now() - interval '2 hours'),
    (biz_autopflege, 'Julia Weber', 'julia.weber@example.com', '+49 171 2223344',
     'Lackversiegelung', current_date + 10, 'München-Sendling', '250-400 €',
     'Neuwagen, moechte langfristigen Lackschutz.', 'contacted', now() - interval '2 days'),

    (biz_reinigung, 'Café Sonnenschein GmbH', 'buero@cafe-sonnenschein-beispiel.de', '+49 30 3334455',
     'Büroreinigung wöchentlich', current_date + 3, 'Berlin-Kreuzberg', '200-300 € / Monat',
     '120 qm Bueroflaeche, zweimal woechentlich gewuenscht.', 'new', now() - interval '5 hours'),
    (biz_reinigung, 'Familie Schneider', 'schneider.familie@example.com', '+49 172 5556677',
     'Umzugsreinigung', current_date + 1, 'Berlin-Pankow', '150-200 €',
     '3-Zimmer-Wohnung, Uebergabe am Monatsende, Endreinigung benoetigt.', 'quote_sent', now() - interval '1 days'),

    (biz_garten, 'Herr Albrecht', 'albrecht@example.com', '+49 173 6667788',
     'Heckenschnitt', current_date + 7, 'Köln-Ehrenfeld', '80-120 €',
     '15 Meter Hecke, ca. 2 Meter hoch, Grünschnitt soll mitgenommen werden.', 'new', now() - interval '1 days'),

    (biz_foto, 'Sarah & Tom', 'sarah.tom@example.com', '+49 174 7778899',
     'Hochzeitsfotografie', current_date + 60, 'Frankfurt am Main', '800-1200 €',
     'Ganztagsbegleitung, ca. 120 Gaeste, Location am Main.', 'won', now() - interval '6 days'),

    (biz_handwerk, 'Herr Kaya', 'kaya@example.com', '+49 175 8889900',
     'Badezimmer-Renovierung', current_date + 14, 'Hamburg-Altona', '3000-5000 €',
     'Komplettsanierung eines 8 qm Bades, Fliesen und Sanitaer.', 'contacted', now() - interval '3 days');

  insert into public.services (business_id, name, description, category, price, duration_minutes)
  values
    (biz_autopflege, 'Innen- und Aussenreinigung', 'Gruendliche Reinigung von Innenraum und Karosserie.', 'Reinigung', 89, 90),
    (biz_autopflege, 'Lackversiegelung', 'Langfristiger Lackschutz inkl. Politur.', 'Versiegelung', 249, 180),
    (biz_reinigung, 'Bueroreinigung (woechentlich)', 'Regelmaessige Unterhaltsreinigung fuer Bueroflaechen.', 'Gewerbe', 180, 120),
    (biz_reinigung, 'Umzugs-Endreinigung', 'Uebergabefertige Reinigung inkl. Fenster.', 'Privat', 220, 240),
    (biz_garten, 'Heckenschnitt', 'Fachgerechter Rueckschnitt inkl. Abtransport.', 'Pflege', 95, 90),
    (biz_foto, 'Hochzeitsfotografie (Ganztag)', 'Begleitung von Vorbereitung bis Feier.', 'Hochzeit', 1200, 480),
    (biz_handwerk, 'Badsanierung', 'Komplettsanierung nach Aufwand.', 'Renovierung', null, null);

end $$;
