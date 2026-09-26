-- =====================================================================
-- pgTAP-Testsuite: Voraussetzungen
-- =====================================================================
-- WICHTIG (Betriebshinweis): Diese Tests wurden in der Sandbox, in der
-- dieser Hardening-Pass entstanden ist, NICHT ausgefuehrt – der lokale
-- Supabase-Stack (`supabase start`) benoetigt einen laufenden Docker-
-- Daemon, der in dieser Umgebung nicht verfuegbar war
-- (`docker info` -> "Cannot connect to the Docker daemon"). Die Tests
-- folgen exakt dem von Supabase dokumentierten pgTAP/Test-Helpers-Muster
-- (siehe https://supabase.com/docs/guides/local-development/testing/pgtap-extended),
-- sind aber vor dem ersten "echten" Lauf zu verifizieren.
--
-- Lokale Ausfuehrung (mit laufendem Docker):
--   supabase start
--   supabase test db
--
-- Voraussetzung: die Test-Helper-Extension muss im lokalen Projekt
-- installiert sein (einmalig, siehe Supabase-Doku):
--   select dbdev.install('basejump-supabase_test_helpers');
--   create extension if not exists "basejump-supabase_test_helpers";
--
-- Diese Datei selbst prueft nur, dass pgTAP und die Test-Helpers verfuegbar
-- sind, damit die eigentlichen Testdateien (01_*, 02_*, 03_*) klar melden,
-- woran es liegt, falls die Umgebung nicht vorbereitet ist.
-- =====================================================================

begin;
select plan(2);

select has_extension('pgtap');
select has_schema('tests');

select * from finish();
rollback;
