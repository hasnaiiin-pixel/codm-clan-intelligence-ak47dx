-- CODM Clan Intelligence 1.2 FIX2
-- Postazione/Hardpoint, ranking Gold/Silver/Bronze, statistiche player e clan migliorate.

-- Match: metadati per distinguere CED e modalità obiettivo.
alter table public.matches add column if not exists game_family text;
alter table public.matches add column if not exists score_policy text;

-- Righe scoreboard: ranking esplicito e medaglia derivata dalla classifica visuale.
alter table public.match_scoreboard_rows add column if not exists rank_medal text;
update public.match_scoreboard_rows
set rank_medal = case
  when team_rank = 1 then 'gold'
  when team_rank = 2 then 'silver'
  when team_rank = 3 then 'bronze'
  when team_rank is not null then 'ranked'
  else null
end
where rank_medal is null;

-- Player manuali: permettono di salvare statistiche ora e collegare profilo registrato dopo.
alter table public.players add column if not exists profile_link_status text not null default 'manual_or_pending';
alter table public.players add column if not exists linked_registered_player_id uuid references public.players(id) on delete set null;
alter table public.players add column if not exists clan_alias text;

create index if not exists idx_players_clan_name_fix2 on public.players(clan_name, nickname);
create index if not exists idx_match_player_stats_rank_fix2 on public.match_player_stats(player_id, rank_position, is_mvp);
create index if not exists idx_scoreboard_rows_rank_medal_fix2 on public.match_scoreboard_rows(match_id, team_rank, rank_medal);
create index if not exists idx_matches_game_family_fix2 on public.matches(game_family, mode, match_date desc);
