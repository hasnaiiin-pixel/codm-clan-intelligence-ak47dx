-- =========================================================
-- CLAN MANAGER V11.0 - SCRIPT CARICAMENTO DATI
-- Uso: eseguire DOPO FINAL_SCHEMA_CLAN_MANAGER.sql.
-- Carica dati riferimento CODM e un torneo demo modificabile.
-- Non cancella auth.users.
-- =========================================================

begin;

-- Assicura clan ufficiale
insert into public.clans(name, tag) values ('AK47DX','AK47DX')
on conflict do nothing;

-- Reference data mappe/modalità/tipi torneo
insert into public.codm_reference_data(category, code, label, sort_order) values
('tournament_type','direct','Eliminazione diretta',1),
('tournament_type','groups','A gruppi',2),
('tournament_type','round_robin','A girone',3),
('tournament_type','groups_final','Girone + eliminazione finale',4),
('format','1v1','1v1',1),('format','2v2','2v2',2),('format','3v3','3v3',3),('format','4v4','4v4',4),('format','5v5','5v5',5),
('weapon_rule','codm_competitive','Regole CODM competitive',1),
('weapon_rule','ar_smg_sniper','AR / SMG / Sniper consentiti',2),
('weapon_rule','no_shotgun_launcher','No shotgun / no launcher',3)
on conflict(category, code) do update set label=excluded.label, sort_order=excluded.sort_order, active=true;

-- Torneo demo solo se non esiste già
with clan as (
  select id from public.clans where tag='AK47DX' order by created_at asc limit 1
), inserted as (
  insert into public.codm_tournaments(clan_id, name, description, tournament_date, start_time, lobby_time, max_teams, format, type, status, rules, bans)
  select id, 'AK47DX DEMO CUP', 'Torneo demo per provare iscrizioni, gruppi, bracket e risultati.', current_date + 7, '21:00', '20:45', 8, '1v1', 'Eliminazione diretta', 'Iscrizioni aperte',
  '{"text":"BO3, screenshot obbligatorio, ritardo massimo 10 minuti","allowed_preset":"Regole CODM competitive","allowed_weapons":["AR","SMG","Sniper","Pistol"]}'::jsonb,
  '{"weapons":["NA45","Akimbo Dobvra","Launcher"],"items":["Persistence"]}'::jsonb
  from clan
  where not exists (select 1 from public.codm_tournaments where name='AK47DX DEMO CUP')
  returning id
)
insert into public.codm_tournament_registrations(tournament_id, nickname, status, note)
select id, nick, 'Confermata', 'Demo seed'
from inserted, unnest(array['MIRZA','GHOST','VIPER','NOVA','RAVEN','BLAZE','WOLF']) nick;

commit;
