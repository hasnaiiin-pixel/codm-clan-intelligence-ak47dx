-- AK47DX V14.2 FIX24 | Applicare UNA volta dopo FINAL_SCHEMA_CLAN_MANAGER.sql.
-- Non modifica dati precedenti. Eseguire da Supabase SQL Editor come proprietario.
begin;

alter table public.codm_tournaments
  add column if not exists public_signup_privacy_url text,
  add column if not exists public_signup_limit integer;

create table if not exists public.codm_tournament_public_signups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.codm_tournaments(id) on delete cascade,
  surname text not null,
  given_name text not null,
  nickname text not null,
  uid text not null,
  status text not null default 'In attesa' check (status in ('In attesa','Confermata','Rifiutata','Annullata')),
  consent_at timestamptz not null default now(),
  registration_id uuid unique references public.codm_tournament_registrations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, uid)
);
create index if not exists idx_fix24_signup_tournament on public.codm_tournament_public_signups(tournament_id, status, created_at);
alter table public.codm_tournament_public_signups enable row level security;
revoke all on table public.codm_tournament_public_signups from anon, authenticated;
grant select on table public.codm_tournament_public_signups to authenticated;

create or replace function public.codm_fix24_is_tournament_staff(p_tournament uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    lower(coalesce(auth.jwt()->>'email','')) = 'hasnaiiin@gmail.com'
    or exists (
      select 1 from public.codm_tournaments t
      join public.clan_members cm on (t.clan_id is null or t.clan_id = cm.clan_id)
      where t.id=p_tournament and cm.user_id=auth.uid()
        and lower(cm.role::text) in ('owner','coach','staff')
    )
  );
$$;
revoke all on function public.codm_fix24_is_tournament_staff(uuid) from public;
grant execute on function public.codm_fix24_is_tournament_staff(uuid) to authenticated;

drop policy if exists codm_fix24_staff_read on public.codm_tournament_public_signups;
create policy codm_fix24_staff_read on public.codm_tournament_public_signups
  for select to authenticated using (public.codm_fix24_is_tournament_staff(tournament_id));

-- Soltanto metadati del torneo, mai UID, nome, cognome o liste di iscritti.
create or replace function public.codm_fix24_public_tournament_info(p_tournament uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t record; n integer;
begin
  select id,name,description,cover_url,tournament_date,start_time,format,type,status,
         public_signup_privacy_url,public_signup_limit
    into t from public.codm_tournaments where id=p_tournament;
  if not found then return null; end if;
  select count(*) into n from public.codm_tournament_public_signups
    where tournament_id=p_tournament and status in ('In attesa','Confermata');
  return jsonb_build_object('id',t.id,'name',t.name,'description',t.description,
    'cover_url',t.cover_url,'date',t.tournament_date,'time',t.start_time,
    'format',t.format,'type',t.type,'status',t.status,
    'privacy_url',t.public_signup_privacy_url,'limit',t.public_signup_limit,'registered',n);
end $$;
revoke all on function public.codm_fix24_public_tournament_info(uuid) from public;
grant execute on function public.codm_fix24_public_tournament_info(uuid) to anon, authenticated;

create or replace function public.codm_fix24_public_signup(
 p_tournament uuid, p_surname text, p_given_name text, p_nickname text,
 p_uid text, p_consent boolean, p_website text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t record; n integer; sid uuid; s text; g text; nick text; u text;
begin
  if nullif(btrim(coalesce(p_website,'')),'') is not null then raise exception 'Iscrizione non accettata.'; end if;
  s := btrim(coalesce(p_surname,'')); g := btrim(coalesce(p_given_name,''));
  nick := btrim(coalesce(p_nickname,'')); u := btrim(coalesce(p_uid,''));
  if length(s) not between 2 and 80 or length(g) not between 2 and 80
     or length(nick) not between 2 and 80 or u !~ '^[0-9]{8,25}$' then
     raise exception 'Verifica cognome, nome, nickname e UID numerico.';
  end if;
  if p_consent is distinct from true then raise exception 'Consenso privacy obbligatorio.'; end if;
  -- Serializzazione per gestire correttamente il limite posti in accessi simultanei.
  perform pg_advisory_xact_lock(hashtextextended(p_tournament::text, 24));
  select status,public_signup_privacy_url,public_signup_limit into t
    from public.codm_tournaments where id=p_tournament;
  if not found then raise exception 'Torneo non trovato.'; end if;
  if t.status <> 'Iscrizioni aperte' then raise exception 'Iscrizioni chiuse.'; end if;
  if nullif(btrim(coalesce(t.public_signup_privacy_url,'')),'') is null then
    raise exception 'Informativa privacy non configurata dall’organizzatore.';
  end if;
  if exists (select 1 from public.codm_tournament_public_signups
     where tournament_id=p_tournament and uid=u) then
      raise exception 'Questo UID risulta già iscritto al torneo.';
  end if;
  select count(*) into n from public.codm_tournament_public_signups
   where tournament_id=p_tournament and status in ('In attesa','Confermata');
  if t.public_signup_limit is not null and t.public_signup_limit > 0 and n >= t.public_signup_limit then
    raise exception 'Posti esauriti.';
  end if;
  insert into public.codm_tournament_public_signups(tournament_id,surname,given_name,nickname,uid)
    values (p_tournament,s,g,nick,u) returning id into sid;
  return jsonb_build_object('reference',left(sid::text,8),'status','In attesa');
end $$;
revoke all on function public.codm_fix24_public_signup(uuid,text,text,text,text,boolean,text) from public;
grant execute on function public.codm_fix24_public_signup(uuid,text,text,text,text,boolean,text) to anon, authenticated;

-- Approva/rifiuta senza accesso anonimo alla tabella personale.
-- All'approvazione crea una iscrizione canonica usata già dal motore squadre FIX23.
create or replace function public.codm_fix24_review_signup(p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; canonical uuid;
begin
  if p_status not in ('Confermata','Rifiutata','Annullata','In attesa') then
    raise exception 'Stato non valido.';
  end if;
  select * into r from public.codm_tournament_public_signups where id=p_id for update;
  if not found then raise exception 'Iscrizione non trovata.'; end if;
  if not public.codm_fix24_is_tournament_staff(r.tournament_id) then
    raise exception 'Accesso negato.';
  end if;
  canonical := r.registration_id;
  if p_status = 'Confermata' and canonical is null then
    -- Esclusione nickname già usati nel torneo, per evitare di sovrapporre due partecipanti.
    if exists(select 1 from public.codm_tournament_registrations
      where tournament_id=r.tournament_id and lower(btrim(nickname))=lower(btrim(r.nickname))) then
      raise exception 'Nickname già presente nelle iscrizioni del torneo. Controlla i duplicati.';
    end if;
    insert into public.codm_tournament_registrations(tournament_id,nickname,status,note)
      values(r.tournament_id,r.nickname,'Confermata','Iscrizione pubblica FIX24')
      returning id into canonical;
  elsif canonical is not null then
    update public.codm_tournament_registrations
      set status=case when p_status='Confermata' then 'Confermata' else 'Ritirata' end
      where id=canonical;
  end if;
  update public.codm_tournament_public_signups
    set status=p_status, registration_id=canonical,updated_at=now()
    where id=p_id;
  return jsonb_build_object('status',p_status,'registration_id',canonical);
end $$;
revoke all on function public.codm_fix24_review_signup(uuid,text) from public;
grant execute on function public.codm_fix24_review_signup(uuid,text) to authenticated;

-- Correzione anagrafica riservata allo staff; non cambia team/match già giocati.
create or replace function public.codm_fix24_edit_signup(
 p_id uuid, p_surname text,p_given_name text,p_nickname text,p_uid text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; s text; g text; n text; u text;
begin
  select * into r from public.codm_tournament_public_signups where id=p_id for update;
  if not found then raise exception 'Iscrizione non trovata.'; end if;
  if not public.codm_fix24_is_tournament_staff(r.tournament_id) then raise exception 'Accesso negato.'; end if;
  s:=btrim(coalesce(p_surname,''));g:=btrim(coalesce(p_given_name,''));
  n:=btrim(coalesce(p_nickname,''));u:=btrim(coalesce(p_uid,''));
  if length(s) not between 2 and 80 or length(g) not between 2 and 80
     or length(n) not between 2 and 80 or u !~ '^[0-9]{8,25}$' then
    raise exception 'Valori non validi.';
  end if;
  if r.registration_id is not null and r.nickname <> n then
    if exists(select 1 from public.codm_tournament_teams t where t.tournament_id=r.tournament_id
       and (t.players ? r.nickname or t.reserves ? r.nickname))
       or exists(select 1 from public.codm_tournament_matches m where m.tournament_id=r.tournament_id
       and (m.team_a=r.nickname or m.team_b=r.nickname)) then
       raise exception 'Il nickname è già usato da una squadra o partita. Modificare prima i dati collegati.';
    end if;
    if exists(select 1 from public.codm_tournament_registrations rr where rr.tournament_id=r.tournament_id
       and rr.id<>r.registration_id and lower(rr.nickname)=lower(n)) then
       raise exception 'Nickname già registrato nel torneo.';
    end if;
    update public.codm_tournament_registrations set nickname=n where id=r.registration_id;
  end if;
  update public.codm_tournament_public_signups set surname=s,given_name=g,nickname=n,uid=u,updated_at=now() where id=p_id;
  return jsonb_build_object('status','Aggiornata');
end $$;
revoke all on function public.codm_fix24_edit_signup(uuid,text,text,text,text) from public;
grant execute on function public.codm_fix24_edit_signup(uuid,text,text,text,text) to authenticated;

-- Rimozione dei dati personali: se il nome è usato in partite/squadre
-- impedisce cancellazione accidentale dei riferimenti storici.
create or replace function public.codm_fix24_delete_signup(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select * into r from public.codm_tournament_public_signups where id=p_id for update;
  if not found then raise exception 'Iscrizione non trovata.'; end if;
  if not public.codm_fix24_is_tournament_staff(r.tournament_id) then raise exception 'Accesso negato.'; end if;
  if exists(select 1 from public.codm_tournament_teams t where t.tournament_id=r.tournament_id
     and (t.players ? r.nickname or t.reserves ? r.nickname))
   or exists(select 1 from public.codm_tournament_matches m where m.tournament_id=r.tournament_id
     and (m.team_a=r.nickname or m.team_b=r.nickname)) then
     raise exception 'Giocatore già presente in squadre o partite: occorre prima gestire quei riferimenti.';
  end if;
  if r.registration_id is not null then
    delete from public.codm_tournament_registrations where id=r.registration_id;
  end if;
  delete from public.codm_tournament_public_signups where id=p_id;
  return jsonb_build_object('deleted',true);
end $$;
revoke all on function public.codm_fix24_delete_signup(uuid) from public;
grant execute on function public.codm_fix24_delete_signup(uuid) to authenticated;

-- Evita un'ulteriore policy SELECT generica sulla nuova tabella.
notify pgrst, 'reload schema';
commit;
