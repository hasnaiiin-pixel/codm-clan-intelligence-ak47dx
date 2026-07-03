-- Verifica rapida permessi CODM.
select id, name, tag, owner_user_id from public.clans;
select cm.clan_id, cm.user_id, cm.role, p.display_name
from public.clan_members cm
left join public.profiles p on p.id = cm.user_id
order by cm.created_at desc;

select policyname, tablename, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('clans','clan_members','players','matches','match_player_stats','match_scoreboard_rows','clan_public_profiles','clan_invite_requests')
order by tablename, policyname;
