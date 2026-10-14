-- AK47DX V14.2 FIX25 | APPLICARE DOPO FIX24. NON azzera i tornei o le iscrizioni.
-- Le pagine sono /privacy e /privacy/richiesta, senza email.
-- ATTENZIONE: il titolare reale deve essere impostato dal gestore del torneo prima di aprire le iscrizioni.
begin;

alter table public.codm_tournaments
 add column if not exists public_signup_controller_name text;
alter table public.codm_tournaments
 alter column public_signup_privacy_url set default '/privacy';
-- Mantiene URL validi già configurati; usa la pagina integrata dove non era configurato niente.
update public.codm_tournaments set public_signup_privacy_url='/privacy'
 where nullif(btrim(coalesce(public_signup_privacy_url,'')),'') is null;

alter table public.codm_tournament_public_signups
 add column if not exists privacy_access_hash text;

-- La richiesta resta tracciabile anche quando il giocatore viene cancellato:
-- l'ID personale è scollegato e l'eventuale testo libero deve essere bonificato dallo staff.
create table if not exists public.codm_tournament_privacy_requests (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.codm_tournaments(id) on delete cascade,
 signup_id uuid references public.codm_tournament_public_signups(id) on delete set null,
 auth_hash text not null,
 kind text not null check (kind in ('Rettifica','Cancellazione','Accesso','Limitazione','Opposizione','Altro')),
 message text not null,
 status text not null default 'Ricevuta' check (status in ('Ricevuta','In lavorazione','Completata','Rifiutata')),
 public_response text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_fix25_privacy_requests on public.codm_tournament_privacy_requests(tournament_id,status,created_at);
alter table public.codm_tournament_privacy_requests enable row level security;
revoke all on public.codm_tournament_privacy_requests from anon,authenticated;
grant select on public.codm_tournament_privacy_requests to authenticated;
drop policy if exists fix25_privacy_staff_read on public.codm_tournament_privacy_requests;
create policy fix25_privacy_staff_read on public.codm_tournament_privacy_requests
 for select to authenticated using (public.codm_fix24_is_tournament_staff(tournament_id));

-- Metadata anonimi: mai esporre anagrafica o codici riservati.
create or replace function public.codm_fix24_public_tournament_info(p_tournament uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t record; n integer;
begin
  select id,name,description,cover_url,tournament_date,start_time,format,type,status,
         public_signup_privacy_url,public_signup_limit,public_signup_controller_name
    into t from public.codm_tournaments where id=p_tournament;
  if not found then return null; end if;
  select count(*) into n from public.codm_tournament_public_signups
    where tournament_id=p_tournament and status in ('In attesa','Confermata');
  return jsonb_build_object('id',t.id,'name',t.name,'description',t.description,
    'cover_url',t.cover_url,'date',t.tournament_date,'time',t.start_time,
    'format',t.format,'type',t.type,'status',t.status,
    'privacy_url',coalesce(nullif(t.public_signup_privacy_url,''),'/privacy'),
    'controller_name',t.public_signup_controller_name,
    'limit',t.public_signup_limit,'registered',n);
end $$;
revoke all on function public.codm_fix24_public_tournament_info(uuid) from public;
grant execute on function public.codm_fix24_public_tournament_info(uuid) to anon,authenticated;

-- Evoluzione FIX24: crea credenziale una tantum da 256 bit per i diritti privacy.
-- Ritorna il codice in risposta esclusivamente alla registrazione; nel DB conserva solo SHA256.
create or replace function public.codm_fix24_public_signup(
 p_tournament uuid, p_surname text, p_given_name text, p_nickname text,
 p_uid text, p_consent boolean, p_website text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t record; n integer; sid uuid; s text; g text; nick text; u text; secret text;
begin
  if nullif(btrim(coalesce(p_website,'')),'') is not null then raise exception 'Iscrizione non accettata.'; end if;
  s:=btrim(coalesce(p_surname,''));g:=btrim(coalesce(p_given_name,''));
  nick:=btrim(coalesce(p_nickname,''));u:=btrim(coalesce(p_uid,''));
  if length(s) not between 2 and 80 or length(g) not between 2 and 80
     or length(nick) not between 2 and 80 or u !~ '^[0-9]{8,25}$' then
    raise exception 'Verifica cognome, nome, nickname e UID numerico.';
  end if;
  if p_consent is distinct from true then raise exception 'Conferma di avere letto l’informativa privacy.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tournament::text, 24));
  select status, public_signup_privacy_url, public_signup_limit, public_signup_controller_name into t
   from public.codm_tournaments where id=p_tournament;
  if not found then raise exception 'Torneo non trovato.'; end if;
  if t.status <> 'Iscrizioni aperte' then raise exception 'Iscrizioni chiuse.'; end if;
  if nullif(btrim(coalesce(t.public_signup_privacy_url,'')),'') is null
      or nullif(btrim(coalesce(t.public_signup_controller_name,'')),'') is null then
    raise exception 'Informativa incompleta: manca l’identità del titolare. Contatta l’organizzatore.';
  end if;
  if exists(select 1 from public.codm_tournament_public_signups where tournament_id=p_tournament and uid=u) then
    raise exception 'Questo UID risulta già iscritto al torneo.';
  end if;
  select count(*) into n from public.codm_tournament_public_signups
   where tournament_id=p_tournament and status in ('In attesa','Confermata');
  if t.public_signup_limit is not null and t.public_signup_limit>0 and n>=t.public_signup_limit then
    raise exception 'Posti esauriti.';
  end if;
  secret:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  sid:=gen_random_uuid();
  insert into public.codm_tournament_public_signups(id,tournament_id,surname,given_name,nickname,uid,privacy_access_hash)
    values(sid,p_tournament,s,g,nick,u,encode(sha256(convert_to(secret || ':' || sid::text, 'UTF8')),'hex'));
  return jsonb_build_object('reference',left(sid::text,8),'signup_id',sid,'access_code',secret,'status','In attesa');
end $$;
revoke all on function public.codm_fix24_public_signup(uuid,text,text,text,text,boolean,text) from public;
grant execute on function public.codm_fix24_public_signup(uuid,text,text,text,text,boolean,text) to anon,authenticated;

create or replace function public.codm_fix25_submit_privacy_request(
 p_tournament uuid,p_signup uuid,p_access_code text,p_kind text,p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; rid uuid;
begin
  if p_kind not in ('Rettifica','Cancellazione','Accesso','Limitazione','Opposizione','Altro')
   or length(btrim(coalesce(p_message,''))) not between 5 and 1000 then
    raise exception 'Verifica tipo e descrizione della richiesta.';
  end if;
  select id,privacy_access_hash into s from public.codm_tournament_public_signups
    where id=p_signup and tournament_id=p_tournament;
  if not found or s.privacy_access_hash is null or length(coalesce(p_access_code,''))<>64
    or s.privacy_access_hash<>encode(sha256(convert_to(p_access_code || ':' || s.id::text,'UTF8')),'hex') then
    raise exception 'Dati di verifica errati o codice non disponibile per questa iscrizione.';
  end if;
  if (select count(*) from public.codm_tournament_privacy_requests
    where signup_id=p_signup and created_at>now()-interval '24 hours') >= 3 then
    raise exception 'Limite richieste giornaliere raggiunto. Riprova più tardi.';
  end if;
  rid:=gen_random_uuid();
  insert into public.codm_tournament_privacy_requests(id,tournament_id,signup_id,auth_hash,kind,message)
    values(rid,p_tournament,p_signup,encode(sha256(convert_to(p_access_code || ':' || rid::text,'UTF8')),'hex'),p_kind,btrim(p_message));
  return jsonb_build_object('request_id',rid,'status','Ricevuta');
end $$;
revoke all on function public.codm_fix25_submit_privacy_request(uuid,uuid,text,text,text) from public;
grant execute on function public.codm_fix25_submit_privacy_request(uuid,uuid,text,text,text) to anon,authenticated;

create or replace function public.codm_fix25_privacy_request_status(p_request uuid,p_access_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  select status,public_response,kind,created_at,auth_hash into r from public.codm_tournament_privacy_requests where id=p_request;
  if not found or r.auth_hash<>encode(sha256(convert_to(coalesce(p_access_code,'') || ':' || p_request::text,'UTF8')),'hex') then
    raise exception 'Richiesta o codice privato non valido.';
  end if;
  return jsonb_build_object('status',r.status,'response',r.public_response,'kind',r.kind,'created_at',r.created_at);
end $$;
revoke all on function public.codm_fix25_privacy_request_status(uuid,text) from public;
grant execute on function public.codm_fix25_privacy_request_status(uuid,text) to anon,authenticated;

create or replace function public.codm_fix25_review_privacy_request(p_id uuid,p_status text,p_response text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if p_status not in ('Ricevuta','In lavorazione','Completata','Rifiutata')
    or length(coalesce(p_response,''))>2000 then raise exception 'Stato o risposta non valida.'; end if;
  select id,tournament_id into r from public.codm_tournament_privacy_requests where id=p_id for update;
  if not found then raise exception 'Richiesta non trovata.'; end if;
  if not public.codm_fix24_is_tournament_staff(r.tournament_id) then raise exception 'Accesso negato.'; end if;
  update public.codm_tournament_privacy_requests
    set status=p_status,public_response=nullif(btrim(p_response),''),updated_at=now() where id=p_id;
  return jsonb_build_object('status',p_status);
end $$;
revoke all on function public.codm_fix25_review_privacy_request(uuid,text,text) from public;
grant execute on function public.codm_fix25_review_privacy_request(uuid,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
