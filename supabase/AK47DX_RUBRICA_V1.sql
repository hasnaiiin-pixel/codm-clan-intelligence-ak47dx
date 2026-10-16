-- AK47DX Rubrica v1.0 - archivio indipendente da partite, statistiche e tornei.
-- Eseguire una volta nel SQL Editor di Supabase. Eseguire il bootstrap admin in README.
create extension if not exists pgcrypto;

create table if not exists public.rubrica_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]{2,40}$'),
  name text not null check(length(trim(name)) between 2 and 70),
  level integer not null default 20 check(level between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.rubrica_role_permissions (
  role_id uuid not null references public.rubrica_roles(id) on delete cascade,
  permission text not null check (permission in ('view','edit','nick','export','private','manage')),
  primary key(role_id,permission)
);

create table if not exists public.rubrica_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.rubrica_roles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null
);

create table if not exists public.rubrica_contacts (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (length(trim(nickname)) between 1 and 80),
  uid text unique,
  status text not null default 'principale' check(status in ('principale','secondario','inattivo','ex','altro')),
  clan_role text not null default '',
  joined_on date,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.rubrica_private (
  contact_id uuid primary key references public.rubrica_contacts(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  alias text not null default '',
  phone text not null default '',
  second_phone text not null default '',
  city text not null default '',
  country text not null default '',
  province text not null default '',
  birth_day smallint check(birth_day between 1 and 31),
  birth_month smallint check(birth_month between 1 and 12),
  birth_year smallint check(birth_year between 1900 and 2100),
  private_photo_path text,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  check ((birth_day is null and birth_month is null) or (birth_day is not null and birth_month is not null)),
  check (birth_year is null or (birth_day is not null and birth_month is not null))
);

create table if not exists public.rubrica_nickname_history (
  id bigint generated always as identity primary key,
  contact_id uuid not null references public.rubrica_contacts(id) on delete cascade,
  old_nickname text not null,
  new_nickname text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);

create table if not exists public.rubrica_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  contact_id uuid references public.rubrica_contacts(id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_rubrica_contacts_status on public.rubrica_contacts(status);
create index if not exists idx_rubrica_nicks_contact on public.rubrica_nickname_history(contact_id, changed_at desc);
create index if not exists idx_rubrica_audit_date on public.rubrica_audit(created_at desc);

insert into public.rubrica_roles(slug,name,level) values
 ('admin','Admin',100),('capo_clan','Capo Clan',80),('vice_capo','Vice Capo',60),
 ('responsabile_rubrica','Responsabile Rubrica',50),('membro','Membro',20)
on conflict(slug) do nothing;
insert into public.rubrica_role_permissions(role_id,permission)
select id, unnest(array['view','edit','nick','export','private','manage']::text[])
from public.rubrica_roles where slug='admin' on conflict do nothing;
insert into public.rubrica_role_permissions(role_id,permission)
select id, unnest(array['view','edit','nick','export','private']::text[])
from public.rubrica_roles where slug='capo_clan' on conflict do nothing;

-- Security definer avoids recursive RLS checks; never accepts a user_id supplied by callers.
create or replace function public.rubrica_can(p_permission text)
returns boolean language sql stable security definer
set search_path = '' as $$
 select auth.uid() is not null and exists(
   select 1 from public.rubrica_user_roles ur
   join public.rubrica_role_permissions rp on rp.role_id=ur.role_id
   where ur.user_id=auth.uid() and rp.permission=p_permission
 );
$$;
revoke all on function public.rubrica_can(text) from public;
grant execute on function public.rubrica_can(text) to authenticated;

create or replace function public.rubrica_set_user_role(p_email text,p_role_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid; old_role uuid; target_role text;
begin
 if not public.rubrica_can('manage') then raise exception 'Non autorizzato'; end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null limit 1;
 if target is null then raise exception 'Nessun account registrato con email verificata'; end if;
 select slug into target_role from public.rubrica_roles where id=p_role_id;
 if target_role is null then raise exception 'Ruolo sconosciuto'; end if;
 if target=auth.uid() and target_role <> 'admin' then raise exception 'Non puoi revocarti il ruolo Admin'; end if;
 select role_id into old_role from public.rubrica_user_roles where user_id=target;
 insert into public.rubrica_user_roles(user_id,role_id,assigned_by)
 values(target,p_role_id,auth.uid()) on conflict(user_id) do update
 set role_id=excluded.role_id, assigned_by=excluded.assigned_by, assigned_at=now();
 insert into public.rubrica_audit(actor_id,action,detail)
 values(auth.uid(),'role_assigned',jsonb_build_object('target_user',target,'from_role',old_role,'to_role',p_role_id));
end; $$;
revoke all on function public.rubrica_set_user_role(text,uuid) from public;
grant execute on function public.rubrica_set_user_role(text,uuid) to authenticated;

create or replace function public.rubrica_remove_user_role(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.rubrica_can('manage') then raise exception 'Non autorizzato'; end if;
 if p_user_id=auth.uid() then raise exception 'Non puoi revocare il tuo accesso'; end if;
 delete from public.rubrica_user_roles where user_id=p_user_id;
 insert into public.rubrica_audit(actor_id,action,detail)
 values(auth.uid(),'role_revoked',jsonb_build_object('target_user',p_user_id));
end; $$;
revoke all on function public.rubrica_remove_user_role(uuid) from public;
grant execute on function public.rubrica_remove_user_role(uuid) to authenticated;

create or replace function public.rubrica_list_account_roles()
returns table(user_id uuid,email text,role_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
 if not public.rubrica_can('manage') then raise exception 'Non autorizzato'; end if;
 return query select u.id,u.email::text,r.role_id from public.rubrica_user_roles r join auth.users u on u.id=r.user_id order by lower(u.email);
end; $$;
revoke all on function public.rubrica_list_account_roles() from public;
grant execute on function public.rubrica_list_account_roles() to authenticated;

create or replace function public.rubrica_on_contact_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='UPDATE' then
   new.updated_at=now();
   if new.nickname is distinct from old.nickname then
     if not public.rubrica_can('nick') then raise exception 'Cambio nickname non autorizzato'; end if;
     insert into public.rubrica_nickname_history(contact_id,old_nickname,new_nickname,changed_by)
     values(old.id,old.nickname,new.nickname,auth.uid());
   end if;
   return new;
 end if;
 return new;
end; $$;
drop trigger if exists rubrica_contact_change on public.rubrica_contacts;
create trigger rubrica_contact_change before update on public.rubrica_contacts
for each row execute function public.rubrica_on_contact_change();

create or replace function public.rubrica_audit_private_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.rubrica_audit(actor_id,action,contact_id)
 values(auth.uid(),case when tg_op='INSERT' then 'private_created' else 'private_updated' end,new.contact_id);
 return new;
end; $$;
drop trigger if exists rubrica_private_audit on public.rubrica_private;
create trigger rubrica_private_audit after insert or update on public.rubrica_private
for each row execute function public.rubrica_audit_private_change();

alter table public.rubrica_roles enable row level security;
alter table public.rubrica_role_permissions enable row level security;
alter table public.rubrica_user_roles enable row level security;
alter table public.rubrica_contacts enable row level security;
alter table public.rubrica_private enable row level security;
alter table public.rubrica_nickname_history enable row level security;
alter table public.rubrica_audit enable row level security;

create policy rubrica_roles_read on public.rubrica_roles for select to authenticated using (public.rubrica_can('view') or public.rubrica_can('manage'));
create policy rubrica_roles_insert on public.rubrica_roles for insert to authenticated with check(public.rubrica_can('manage') and slug <> 'admin');
create policy rubrica_roles_update on public.rubrica_roles for update to authenticated using(public.rubrica_can('manage') and slug <> 'admin') with check(public.rubrica_can('manage') and slug <> 'admin');
create policy rubrica_roles_delete on public.rubrica_roles for delete to authenticated using(public.rubrica_can('manage') and slug not in ('admin','capo_clan'));

create policy rubrica_perms_read on public.rubrica_role_permissions for select to authenticated using(public.rubrica_can('view') or public.rubrica_can('manage'));
create policy rubrica_perms_insert on public.rubrica_role_permissions for insert to authenticated with check(public.rubrica_can('manage') and permission <> 'manage' and role_id<>(select id from public.rubrica_roles where slug='admin'));
create policy rubrica_perms_delete on public.rubrica_role_permissions for delete to authenticated using(public.rubrica_can('manage') and permission <> 'manage' and role_id<>(select id from public.rubrica_roles where slug='admin'));

create policy rubrica_ur_read on public.rubrica_user_roles for select to authenticated using(user_id=auth.uid() or public.rubrica_can('manage'));

create policy rubrica_contacts_read on public.rubrica_contacts for select to authenticated using(public.rubrica_can('view'));
create policy rubrica_contacts_insert on public.rubrica_contacts for insert to authenticated with check(public.rubrica_can('edit'));
create policy rubrica_contacts_update on public.rubrica_contacts for update to authenticated using(public.rubrica_can('edit')) with check(public.rubrica_can('edit'));
create policy rubrica_contacts_delete on public.rubrica_contacts for delete to authenticated using(public.rubrica_can('manage'));

create policy rubrica_private_read on public.rubrica_private for select to authenticated using(public.rubrica_can('private'));
create policy rubrica_private_insert on public.rubrica_private for insert to authenticated with check(public.rubrica_can('private') and public.rubrica_can('edit'));
create policy rubrica_private_update on public.rubrica_private for update to authenticated using(public.rubrica_can('private') and public.rubrica_can('edit')) with check(public.rubrica_can('private') and public.rubrica_can('edit'));
create policy rubrica_private_delete on public.rubrica_private for delete to authenticated using(public.rubrica_can('manage'));

create policy rubrica_nicks_read on public.rubrica_nickname_history for select to authenticated using(public.rubrica_can('view'));
create policy rubrica_audit_read on public.rubrica_audit for select to authenticated using(public.rubrica_can('manage'));

-- Grant CRUD rights; RLS above is what limits actions per authenticated account.
grant select,insert,update,delete on public.rubrica_roles,public.rubrica_role_permissions,
 public.rubrica_user_roles,public.rubrica_contacts,public.rubrica_private,
 public.rubrica_nickname_history,public.rubrica_audit to authenticated;
-- Non concedere accesso a sequenze/tabelle estranee alla Rubrica.

-- Supabase Storage: bucket PRIVATO e accesso RLS per due tipi di foto.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ak47dx-rubrica','ak47dx-rubrica',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=3145728,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy rubrica_storage_read on storage.objects for select to authenticated
using(bucket_id='ak47dx-rubrica' and (
  (storage.foldername(name))[1]='avatar' and public.rubrica_can('view') or
  (storage.foldername(name))[1]='private' and public.rubrica_can('private')
));
create policy rubrica_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='ak47dx-rubrica' and public.rubrica_can('edit') and (
  (storage.foldername(name))[1]='avatar' or
  (storage.foldername(name))[1]='private' and public.rubrica_can('private')
));
create policy rubrica_storage_delete on storage.objects for delete to authenticated
using(bucket_id='ak47dx-rubrica' and public.rubrica_can('edit') and (
  (storage.foldername(name))[1]='avatar' or
  (storage.foldername(name))[1]='private' and public.rubrica_can('private')
));


-- Audit operazioni (senza memorizzare numero di telefono o altri valori privati).
create or replace function public.rubrica_audit_contact()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.rubrica_audit(actor_id,action,contact_id)
 values(auth.uid(),case when tg_op='INSERT' then 'contact_created' when tg_op='DELETE' then 'contact_deleted' else 'contact_updated' end,
 case when tg_op='DELETE' then old.id else new.id end);
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
drop trigger if exists rubrica_contact_audit on public.rubrica_contacts;
create trigger rubrica_contact_audit after insert or update or delete on public.rubrica_contacts
for each row execute function public.rubrica_audit_contact();

create or replace function public.rubrica_audit_policy()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.rubrica_audit(actor_id,action,detail)
 values(auth.uid(),case when tg_op='INSERT' then 'permission_granted' else 'permission_removed' end,
 jsonb_build_object('role_id',case when tg_op='INSERT' then new.role_id else old.role_id end,
 'permission',case when tg_op='INSERT' then new.permission else old.permission end));
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
drop trigger if exists rubrica_permission_audit on public.rubrica_role_permissions;
create trigger rubrica_permission_audit after insert or delete on public.rubrica_role_permissions
for each row execute function public.rubrica_audit_policy();

create or replace function public.rubrica_log_export(p_format text,p_categories text[],p_fields text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.rubrica_can('export') then raise exception 'Esportazione non autorizzata'; end if;
 if p_format not in ('whatsapp','excel') then raise exception 'Formato non valido'; end if;
 insert into public.rubrica_audit(actor_id,action,detail)
 values(auth.uid(),'export_'||p_format,jsonb_build_object('categories',p_categories,'fields',p_fields));
end; $$;
revoke all on function public.rubrica_log_export(text,text[],text[]) from public;
grant execute on function public.rubrica_log_export(text,text[],text[]) to authenticated;

create or replace function public.rubrica_log_access()
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.rubrica_can('view') then raise exception 'Rubrica non autorizzata'; end if;
 insert into public.rubrica_audit(actor_id,action) values(auth.uid(),'rubrica_opened');
end; $$;
revoke all on function public.rubrica_log_access() from public;
grant execute on function public.rubrica_log_access() to authenticated;

-- Bootstrap da eseguire UNA SOLA VOLTA dall'operatore nel SQL editor sostituendo l'email:
-- insert into public.rubrica_user_roles(user_id,role_id)
-- select u.id,r.id from auth.users u cross join public.rubrica_roles r
-- where lower(u.email)=lower('EMAIL_ADMIN_GIA_REGISTRATA') and u.email_confirmed_at is not null and r.slug='admin'
-- on conflict(user_id) do update set role_id=excluded.role_id;
