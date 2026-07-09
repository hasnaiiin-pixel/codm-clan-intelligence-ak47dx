-- =========================================================
-- CLAN MANAGER AK47DX V13.1
-- Permessi granulari utenti + associazione account/player.
-- Eseguire in Supabase SQL Editor DOPO FINAL_SCHEMA_CLAN_MANAGER.sql.
-- Non cancella dati e non modifica auth.users.
-- =========================================================

begin;

alter table if exists public.clan_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table if exists public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_clan_members_permissions on public.clan_members using gin (permissions);
create index if not exists idx_players_user_id_v13_1 on public.players(user_id);

update public.clan_members
set permissions = case
  when role = 'owner' then '{"view_events":true,"create_events":true,"edit_events":true,"delete_events":true,"insert_results":true,"view_stats":true,"manage_players":true,"link_accounts":true,"manage_users":true,"manage_telegram":true,"view_admin_panel":true}'::jsonb
  when role = 'coach' then '{"view_events":true,"create_events":true,"edit_events":true,"delete_events":true,"insert_results":true,"view_stats":true,"manage_players":true,"link_accounts":true,"manage_users":false,"manage_telegram":true,"view_admin_panel":true}'::jsonb
  when role = 'staff' then '{"view_events":true,"create_events":true,"edit_events":true,"delete_events":false,"insert_results":true,"view_stats":true,"manage_players":true,"link_accounts":false,"manage_users":false,"manage_telegram":false,"view_admin_panel":false}'::jsonb
  else '{"view_events":true,"create_events":false,"edit_events":false,"delete_events":false,"insert_results":false,"view_stats":true,"manage_players":false,"link_accounts":false,"manage_users":false,"manage_telegram":false,"view_admin_panel":false}'::jsonb
end
where permissions = '{}'::jsonb or permissions is null;

commit;
