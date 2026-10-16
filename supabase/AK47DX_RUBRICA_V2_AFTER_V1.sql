-- AK47DX RUBRICA V2 | MIGRAZIONE DOPO V1 (non rieseguire il file V1)
-- Nessuna modifica a partite/tornei/statistiche.
-- Prima dell'installazione: backup database; verifica in ambiente staging.
begin;
alter table public.rubrica_contacts
  add column if not exists presence_status text not null default 'da_verificare',
  add column if not exists whatsapp_group_member boolean,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists source_ref text unique;
-- Preserve old V1 membership categories; V2 presence is independent.
alter table public.rubrica_contacts drop constraint if exists rubrica_contacts_presence_status_check;
alter table public.rubrica_contacts add constraint rubrica_contacts_presence_status_check
  check (presence_status in ('da_verificare','attivo','non_in_clan'));
create index if not exists idx_rubrica_presence on public.rubrica_contacts(presence_status) where deleted_at is null;

alter table public.rubrica_private
  add column if not exists whatsapp_contact text not null default '',
  add column if not exists map_lat double precision,
  add column if not exists map_lon double precision,
  add column if not exists map_opt_in boolean not null default false;
alter table public.rubrica_private drop constraint if exists rubrica_private_map_lat_check;
alter table public.rubrica_private add constraint rubrica_private_map_lat_check check(map_lat is null or map_lat between -90 and 90);
alter table public.rubrica_private drop constraint if exists rubrica_private_map_lon_check;
alter table public.rubrica_private add constraint rubrica_private_map_lon_check check(map_lon is null or map_lon between -180 and 180);

create table if not exists public.rubrica_presence_history (
 id bigint generated always as identity primary key,
 contact_id uuid not null references public.rubrica_contacts(id) on delete cascade,
 old_status text not null,
 new_status text not null,
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);
create index if not exists idx_rubrica_presence_history on public.rubrica_presence_history(contact_id,changed_at desc);

create or replace function public.rubrica_on_presence_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.presence_status is distinct from old.presence_status then
  insert into public.rubrica_presence_history(contact_id,old_status,new_status,changed_by)
  values(old.id,old.presence_status,new.presence_status,auth.uid());
 end if;
 if new.deleted_at is distinct from old.deleted_at then
  if not public.rubrica_can('manage') then raise exception 'Solo un Admin puo spostare i giocatori nel cestino'; end if;
  if old.deleted_at is null and new.deleted_at is not null then new.deleted_by=auth.uid(); end if;
  if new.deleted_at is null then new.deleted_by=null; end if;
 end if;
 return new;
end; $$;
drop trigger if exists rubrica_presence_changed on public.rubrica_contacts;
create trigger rubrica_presence_changed before update on public.rubrica_contacts
for each row execute function public.rubrica_on_presence_changed();

-- Hard-delete via accesso browser impedito: eliminazione ordinaria = cestino.
create or replace function public.rubrica_prevent_direct_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
 raise exception 'Cancellazione diretta non consentita. Usare il cestino; eventuale eliminazione definitiva segue procedura separata.';
end; $$;
drop trigger if exists rubrica_no_direct_delete on public.rubrica_contacts;
create trigger rubrica_no_direct_delete before delete on public.rubrica_contacts
for each row execute function public.rubrica_prevent_direct_delete();

create table if not exists public.rubrica_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 2 and 140),
 description text not null default '',
 starts_on date not null,
 ends_on date not null,
 yearly boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_on >= starts_on)
);
create index if not exists idx_rubrica_events_start on public.rubrica_events(starts_on);

create table if not exists public.rubrica_reminder_rules (
 id uuid primary key default gen_random_uuid(),
 role_id uuid not null references public.rubrica_roles(id) on delete cascade,
 kind text not null check(kind in ('birthday','event')),
 days_before integer not null default 0 check(days_before between 0 and 30),
 include_non_clan boolean not null default false,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 unique(role_id,kind,days_before)
);
create table if not exists public.rubrica_notifications (
 id uuid primary key default gen_random_uuid(),
 dedup_key text not null unique,
 role_id uuid not null references public.rubrica_roles(id) on delete cascade,
 kind text not null check(kind in ('birthday','event')),
 contact_id uuid references public.rubrica_contacts(id) on delete cascade,
 event_id uuid references public.rubrica_events(id) on delete cascade,
 title text not null,
 occasion_date date not null,
 days_before integer not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists idx_rubrica_notifications_role on public.rubrica_notifications(role_id,created_at desc);
create table if not exists public.rubrica_notification_reads (
 notification_id uuid not null references public.rubrica_notifications(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(notification_id,user_id)
);

alter table public.rubrica_presence_history enable row level security;
alter table public.rubrica_events enable row level security;
alter table public.rubrica_reminder_rules enable row level security;
alter table public.rubrica_notifications enable row level security;
alter table public.rubrica_notification_reads enable row level security;

create policy rubrica_presence_read on public.rubrica_presence_history for select to authenticated using(public.rubrica_can('view'));
create policy rubrica_events_read on public.rubrica_events for select to authenticated using(public.rubrica_can('view'));
create policy rubrica_events_insert on public.rubrica_events for insert to authenticated with check(public.rubrica_can('edit') and created_by=auth.uid());
create policy rubrica_events_update on public.rubrica_events for update to authenticated using(public.rubrica_can('edit')) with check(public.rubrica_can('edit'));
create policy rubrica_events_delete on public.rubrica_events for delete to authenticated using(public.rubrica_can('manage'));
create policy rubrica_rules_read on public.rubrica_reminder_rules for select to authenticated using(public.rubrica_can('manage'));
create policy rubrica_rules_insert on public.rubrica_reminder_rules for insert to authenticated with check(public.rubrica_can('manage'));
create policy rubrica_rules_update on public.rubrica_reminder_rules for update to authenticated using(public.rubrica_can('manage')) with check(public.rubrica_can('manage'));
create policy rubrica_rules_delete on public.rubrica_reminder_rules for delete to authenticated using(public.rubrica_can('manage'));
-- Row visibility tied to *logged-in account UUID* AND assigned role; birth requires private access.
create policy rubrica_notices_read on public.rubrica_notifications for select to authenticated using (
 public.rubrica_can('view') and (kind <> 'birthday' or public.rubrica_can('private'))
 and exists(select 1 from public.rubrica_user_roles ur where ur.user_id=auth.uid() and ur.role_id=rubrica_notifications.role_id)
);
create policy rubrica_notice_reads_read on public.rubrica_notification_reads for select to authenticated using(user_id=auth.uid());
create policy rubrica_notice_reads_insert on public.rubrica_notification_reads for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.rubrica_notifications n where n.id=notification_id));

-- Never expose notifications creation to authenticated clients: only scheduled/admin SQL role.
grant select on public.rubrica_presence_history, public.rubrica_notifications to authenticated;
grant select,insert,update,delete on public.rubrica_events,public.rubrica_reminder_rules to authenticated;
grant select,insert on public.rubrica_notification_reads to authenticated;

insert into public.rubrica_reminder_rules(role_id,kind,days_before,enabled)
select id,'birthday',0,true from public.rubrica_roles where slug='admin'
on conflict(role_id,kind,days_before) do nothing;
insert into public.rubrica_reminder_rules(role_id,kind,days_before,enabled)
select id,'event',1,true from public.rubrica_roles where slug='admin'
on conflict(role_id,kind,days_before) do nothing;

-- Build day-based notices from confidential birthdays and user events, for configured roles.
-- Execute daily via Supabase Cron (see README). No email/push delivery assumed.
create or replace function public.rubrica_generate_daily_notices(p_today date default ((now() at time zone 'Europe/Rome')::date))
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer := 0; v_created integer := 0; r record; v_next date; v_year integer; v_max_day integer; v_occasion date;
begin
 if current_user not in ('postgres','service_role') and session_user not in ('postgres','service_role') then
  raise exception 'Scheduler-only operation';
 end if;
 for r in
  select r.role_id,r.days_before,r.include_non_clan,c.id contact_id,c.nickname,p.birth_day,p.birth_month
  from public.rubrica_reminder_rules r
  join public.rubrica_contacts c on c.deleted_at is null
  join public.rubrica_private p on p.contact_id=c.id
  where r.enabled and r.kind='birthday' and p.birth_day is not null and p.birth_month is not null
    and (r.include_non_clan or c.presence_status='attivo')
 loop
  v_year=extract(year from p_today)::int;
  v_max_day=extract(day from (date_trunc('month',make_date(v_year,r.birth_month,1)) + interval '1 month - 1 day'))::int;
  v_next=make_date(v_year,r.birth_month,least(r.birth_day,v_max_day));
  if v_next < p_today then
    v_year=v_year+1;
    v_max_day=extract(day from (date_trunc('month',make_date(v_year,r.birth_month,1)) + interval '1 month - 1 day'))::int;
    v_next=make_date(v_year,r.birth_month,least(r.birth_day,v_max_day));
  end if;
  if v_next=p_today+r.days_before then
    insert into public.rubrica_notifications(dedup_key,role_id,kind,contact_id,title,occasion_date,days_before)
    values('birthday/'||r.role_id||'/'||r.contact_id||'/'||v_next||'/'||r.days_before,
     r.role_id,'birthday',r.contact_id,'Compleanno di '||r.nickname,v_next,r.days_before)
    on conflict(dedup_key) do nothing;
    get diagnostics v_created=row_count;v_count=v_count+v_created;
  end if;
 end loop;
 for r in
  select rules.role_id,rules.days_before,e.id event_id,e.title,e.starts_on,e.yearly
  from public.rubrica_reminder_rules rules cross join public.rubrica_events e
  where rules.enabled and rules.kind='event'
 loop
  v_occasion=r.starts_on;
  if r.yearly then
   v_year=extract(year from p_today)::int;
   v_max_day=extract(day from (date_trunc('month',make_date(v_year,extract(month from r.starts_on)::int,1)) + interval '1 month - 1 day'))::int;
   v_occasion=make_date(v_year,extract(month from r.starts_on)::int,least(extract(day from r.starts_on)::int,v_max_day));
   if v_occasion<p_today then
    v_year=v_year+1;
    v_max_day=extract(day from (date_trunc('month',make_date(v_year,extract(month from r.starts_on)::int,1)) + interval '1 month - 1 day'))::int;
    v_occasion=make_date(v_year,extract(month from r.starts_on)::int,least(extract(day from r.starts_on)::int,v_max_day));
   end if;
  end if;
  if v_occasion=p_today+r.days_before then
   insert into public.rubrica_notifications(dedup_key,role_id,kind,event_id,title,occasion_date,days_before)
    values('event/'||r.role_id||'/'||r.event_id||'/'||v_occasion||'/'||r.days_before,
     r.role_id,'event',r.event_id,'Evento: '||r.title,v_occasion,r.days_before)
    on conflict(dedup_key) do nothing;
   get diagnostics v_created=row_count;v_count=v_count+v_created;
  end if;
 end loop;
 return v_count;
end; $$;
revoke all on function public.rubrica_generate_daily_notices(date) from public,anon,authenticated;
-- No GRANT to authenticated. PostgreSQL owner can run via Supabase Cron SQL Editor.

-- Import batch safely, no copies of personal data in source code or public assets.
-- Whitelist accepted properties; do not overwrite existing players by UID.
create or replace function public.rubrica_import_batch(p_source text,p_records jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_uid text; v_nick text; v_contact uuid; v_source text;
 v_inserted integer := 0; v_skipped integer := 0; v_index integer; v_bday integer; v_bmonth integer; v_byear integer;
begin
 if not (public.rubrica_can('manage') and public.rubrica_can('edit') and public.rubrica_can('private')) then raise exception 'Importazione riservata Admin autorizzato'; end if;
 if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)>200 then raise exception 'Massimo 200 righe JSON'; end if;
 if length(trim(p_source)) not between 3 and 80 then raise exception 'Nome sorgente non valido'; end if;
 for r in select value from jsonb_array_elements(p_records) loop
  v_nick=left(trim(coalesce(r->>'nickname','')),80);
  v_uid=nullif(trim(coalesce(r->>'uid','')),'');
  v_index=nullif(r->>'source_position','')::integer;
  if v_nick='' or v_index is null or v_index < 1 or (v_uid is not null and v_uid !~ '^[0-9]{15,22}$') then raise exception 'Riga %: nickname, posizione o UID non validi',v_index; end if;
  v_source=trim(p_source)||'#'||v_index;
  if exists (select 1 from public.rubrica_contacts where source_ref=v_source or (v_uid is not null and uid=v_uid)) then
   v_skipped=v_skipped+1;
   continue;
  end if;
  v_bday=nullif(r->>'birth_day','')::integer;
  v_bmonth=nullif(r->>'birth_month','')::integer;
  v_byear=nullif(r->>'birth_year','')::integer;
  if (v_bday is null) <> (v_bmonth is null) then raise exception 'Data parziale non valida nella riga %',v_index; end if;
  insert into public.rubrica_contacts(nickname,uid,status,presence_status,clan_role,whatsapp_group_member,source_ref,created_by)
  values(v_nick,v_uid,'altro','da_verificare',left(coalesce(r->>'clan_role',''),100),
   case when jsonb_typeof(r->'whatsapp_group_member')='boolean' then (r->>'whatsapp_group_member')::boolean else null end,
   v_source,auth.uid()) returning id into v_contact;
  insert into public.rubrica_private(contact_id,phone,first_name,last_name,whatsapp_contact,city,country,province,birth_day,birth_month,birth_year,notes)
  values(v_contact,left(coalesce(r->>'phone',''),60),'','',left(coalesce(r->>'whatsapp_contact',''),200),
   '', '', '',v_bday,v_bmonth,v_byear,left(coalesce(r->>'notes',''),1000));
  v_inserted=v_inserted+1;
 end loop;
 insert into public.rubrica_audit(actor_id,action,detail)
 values(auth.uid(),'import_batch',jsonb_build_object('source',p_source,'created',v_inserted,'skipped',v_skipped));
 return jsonb_build_object('created',v_inserted,'skipped',v_skipped,'total',jsonb_array_length(p_records));
end; $$;
revoke all on function public.rubrica_import_batch(text,jsonb) from public,anon;
grant execute on function public.rubrica_import_batch(text,jsonb) to authenticated;
commit;
