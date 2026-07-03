-- CODM AK47DX - Admin Owner Seed TEMPLATE
-- Prima crea l'utente in Supabase -> Authentication -> Users.
-- Poi sostituisci ADMIN_EMAIL_HERE con la tua email reale e lancia questo SQL.

DO $$
DECLARE
  v_admin_email text := hasnaiiin@gmail.com; -- esempio: admin@ak47dx.it
  v_user_id uuid;
  v_clan_id uuid;
BEGIN
  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_admin_email)
  limit 1;

  if v_user_id is null then
    raise exception 'Utente admin non trovato in auth.users. Crea prima l utente in Authentication -> Users: %', v_admin_email;
  end if;

  select id into v_clan_id
  from public.clans
  where owner_user_id = v_user_id
     or lower(name) = lower('AK47DX')
     or lower(coalesce(tag,'')) = lower('AK')
  order by created_at asc
  limit 1;

  if v_clan_id is null then
    insert into public.clans (name, tag, owner_user_id)
    values ('AK47DX', 'AK', v_user_id)
    returning id into v_clan_id;
  else
    update public.clans
    set owner_user_id = v_user_id,
        name = coalesce(nullif(name,''), 'AK47DX'),
        tag = coalesce(nullif(tag,''), 'AK')
    where id = v_clan_id;
  end if;

  insert into public.clan_members (clan_id, user_id, role)
  values (v_clan_id, v_user_id, 'owner')
  on conflict (clan_id, user_id) do update set role = 'owner';

  raise notice 'OK: admin % assegnato owner clan %', v_admin_email, v_clan_id;
END $$;
