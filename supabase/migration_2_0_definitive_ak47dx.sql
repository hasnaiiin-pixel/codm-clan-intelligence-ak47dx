-- CODM Clan Intelligence 2.0 DEFINITIVE AK47DX
-- Release unica: Action Panel screenshot, inviti giocatori, Clan HQ, analytics, player manuali e cloud/YOLO-ready.

-- Match proof / Action Panel.
alter table public.matches add column if not exists screenshot_url text;
alter table public.matches add column if not exists screenshot_storage_path text;
alter table public.matches add column if not exists match_notes text;
alter table public.matches add column if not exists winning_team text check (winning_team in ('blue','red','draw') or winning_team is null);
alter table public.matches add column if not exists our_team text check (our_team in ('blue','red') or our_team is null);
alter table public.matches add column if not exists review_status text not null default 'OK';
alter table public.matches add column if not exists deleted_at timestamptz;
alter table public.matches add column if not exists game_family text;
alter table public.matches add column if not exists score_policy text default 'KILL_DEATH_ASSIST_ONLY';
alter table public.matches add column if not exists action_panel_pinned boolean not null default true;

-- Scoreboard rows / ranking 1-5 / medals.
create table if not exists public.match_scoreboard_rows (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid,
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  manual_player_name text,
  nickname_raw text,
  nickname_resolved text,
  clan_name text,
  team_color text check (team_color in ('blue','red')),
  team_side text check (team_side in ('ALLY','ENEMY')),
  team_result text check (team_result in ('winner','loser','draw') or team_result is null),
  team_rank int check (team_rank between 1 and 5),
  rank_medal text,
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  mvp_type text,
  needs_review boolean not null default false,
  corrected_by uuid,
  corrected_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.match_scoreboard_rows add column if not exists rank_medal text;
update public.match_scoreboard_rows set rank_medal = case when team_rank = 1 then 'gold' when team_rank = 2 then 'silver' when team_rank = 3 then 'bronze' when team_rank is not null then 'ranked' else null end where rank_medal is null;

-- Player manuali collegabili a profilo registrato in futuro.
alter table public.players add column if not exists clan_name text;
alter table public.players add column if not exists clan_alias text;
alter table public.players add column if not exists profile_link_status text not null default 'manual_or_pending';
alter table public.players add column if not exists linked_registered_player_id uuid references public.players(id) on delete set null;
alter table public.players add column if not exists invite_code text;

-- Clan HQ pubblico.
create table if not exists public.clan_public_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null unique default 'main',
  clan_id uuid references public.clans(id) on delete set null,
  clan_name text not null default 'AK47DX',
  tag text default 'AK47DX',
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
  logo_url text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.clan_announcements (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  title text not null,
  body text,
  priority text not null default 'normal',
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Inviti e richieste iscrizione.
create table if not exists public.clan_invites (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  clan_id uuid references public.clans(id) on delete set null,
  clan_tag text not null default 'AK47DX',
  target_role text not null default 'player',
  status text not null default 'active',
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_invite_requests (
  id uuid primary key default gen_random_uuid(),
  invite_code text,
  clan_tag text not null default 'AK47DX',
  nickname text not null,
  uid_codm text,
  social_contact text,
  status text not null default 'pending',
  linked_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

-- Dataset futuro YOLO/OCR: salva crop, box e correzioni.
create table if not exists public.ocr_training_samples (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  image_url text,
  crop_url text,
  field_name text not null,
  box_json jsonb,
  ocr_value text,
  corrected_value text,
  source_template text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_2_0_filters on public.matches(match_date desc, mode, result, map_name, winning_team, our_team, review_status);
create index if not exists idx_rows_2_0_filters on public.match_scoreboard_rows(match_id, team_color, team_rank, rank_medal, mvp_type, clan_name, needs_review);
create index if not exists idx_players_2_0_clan on public.players(clan_name, nickname, profile_link_status);
create index if not exists idx_invites_2_0_code on public.clan_invites(invite_code, status);
create index if not exists idx_invite_requests_2_0_code on public.clan_invite_requests(invite_code, status);

alter table public.clan_public_profiles enable row level security;
alter table public.clan_announcements enable row level security;
alter table public.clan_invites enable row level security;
alter table public.clan_invite_requests enable row level security;
alter table public.ocr_training_samples enable row level security;

drop policy if exists "2.0 clan profile readable" on public.clan_public_profiles;
create policy "2.0 clan profile readable" on public.clan_public_profiles for select to authenticated using (true);
drop policy if exists "2.0 clan profile editable" on public.clan_public_profiles;
create policy "2.0 clan profile editable" on public.clan_public_profiles for all to authenticated using (true) with check (true);

drop policy if exists "2.0 invites readable" on public.clan_invites;
create policy "2.0 invites readable" on public.clan_invites for select to authenticated using (true);
drop policy if exists "2.0 invites editable" on public.clan_invites;
create policy "2.0 invites editable" on public.clan_invites for all to authenticated using (true) with check (true);

drop policy if exists "2.0 invite requests public insert" on public.clan_invite_requests;
create policy "2.0 invite requests public insert" on public.clan_invite_requests for insert to anon, authenticated with check (true);
drop policy if exists "2.0 invite requests readable" on public.clan_invite_requests;
create policy "2.0 invite requests readable" on public.clan_invite_requests for select to authenticated using (true);
