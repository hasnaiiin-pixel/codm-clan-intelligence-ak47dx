-- CODM Clan Intelligence 1.2 SUPABASE ANALYTICS STABLE
-- Archivio partite, Clan HQ, filtri avanzati, statistiche clan/player e grafici.

-- Mantiene i dati richiesti per consultazione storica partita.
alter table public.matches add column if not exists deleted_at timestamptz;
alter table public.matches add column if not exists review_status text not null default 'OK';
alter table public.matches add column if not exists opponent_clan_name text;
alter table public.matches add column if not exists import_source text default 'ocr_or_manual';

-- Migliora righe scoreboard usate per ranking 1-5 e MVP.
alter table public.match_scoreboard_rows add column if not exists manual_player_name text;
alter table public.match_scoreboard_rows add column if not exists clan_name text;
alter table public.match_scoreboard_rows add column if not exists corrected_by uuid;
alter table public.match_scoreboard_rows add column if not exists corrected_at timestamptz;

-- Profilo pubblico/privato del clan visibile nella sezione Clan HQ.
create table if not exists public.clan_public_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null unique default 'main',
  clan_id uuid references public.clans(id) on delete set null,
  clan_name text not null default 'AK Clan',
  tag text,
  motto text,
  story text,
  leaders text,
  vice_admins text,
  social_discord text,
  social_whatsapp text,
  social_tiktok text,
  social_youtube text,
  social_instagram text,
  notice_title text,
  notice_body text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.clan_announcements (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  title text not null,
  body text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_filters_1_2 on public.matches(match_date, mode, result, match_type, map_name, opponent_clan_name);
create index if not exists idx_scoreboard_rows_filters_1_2 on public.match_scoreboard_rows(match_id, team_rank, mvp_type, clan_name, needs_review);
create index if not exists idx_clan_public_profiles_key_1_2 on public.clan_public_profiles(profile_key);
create index if not exists idx_clan_announcements_active_1_2 on public.clan_announcements(active, created_at desc);

alter table public.clan_public_profiles enable row level security;
alter table public.clan_announcements enable row level security;

drop policy if exists "clan profile readable" on public.clan_public_profiles;
create policy "clan profile readable" on public.clan_public_profiles for select to authenticated using (true);
drop policy if exists "clan profile editable admins" on public.clan_public_profiles;
create policy "clan profile editable admins" on public.clan_public_profiles for all to authenticated using (true) with check (true);

drop policy if exists "announcements readable" on public.clan_announcements;
create policy "announcements readable" on public.clan_announcements for select to authenticated using (active = true);
drop policy if exists "announcements editable admins" on public.clan_announcements;
create policy "announcements editable admins" on public.clan_announcements for all to authenticated using (true) with check (true);
