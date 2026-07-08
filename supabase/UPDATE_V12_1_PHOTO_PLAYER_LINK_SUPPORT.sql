-- CLAN MANAGER V12.1
-- Supporto import Excel + foto prova allegabile anche dopo + collegamento player a profilo reale.
-- Eseguire dopo FINAL_SCHEMA_CLAN_MANAGER.sql se il database è già esistente.

alter table if exists public.matches
  add column if not exists screenshot_url text,
  add column if not exists screenshot_storage_path text,
  add column if not exists match_notes text,
  add column if not exists notes text;

alter table if exists public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists uid_codm text,
  add column if not exists clan_name text,
  add column if not exists notes text;

create index if not exists idx_players_user_id on public.players(user_id);
create index if not exists idx_players_uid_codm on public.players(uid_codm);
create index if not exists idx_matches_screenshot on public.matches(screenshot_storage_path);

-- Bucket screenshot: se non esiste, crealo da Supabase Storage UI con nome codm-screenshots.
-- Questo script non modifica Auth e non cancella dati.
