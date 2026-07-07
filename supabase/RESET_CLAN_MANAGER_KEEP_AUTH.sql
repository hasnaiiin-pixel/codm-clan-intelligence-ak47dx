-- Reset completo tabelle CLAN MANAGER, mantenendo auth.users. Usare solo se vuoi ripartire da zero.
begin;
drop function if exists public.codm_delete_event_hard(uuid) cascade;
drop table if exists public.codm_event_players cascade;
drop table if exists public.codm_notifications cascade;
drop table if exists public.codm_events cascade;
drop table if exists public.codm_ocr_templates cascade;
drop table if exists public.clan_members cascade;
drop table if exists public.clans cascade;
commit;
-- Dopo questo eseguire supabase/FINAL_SCHEMA_CLAN_MANAGER.sql
