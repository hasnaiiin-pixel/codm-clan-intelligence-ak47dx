-- AK47DX RUBRICA V3 | Applicare DOPO V1 e V2 in staging. NESSUN dato personale nel codice.
-- "Condivisibile" = testo/file generato da un account autorizzato, NON accesso anonimo a rubrica.
-- Il telefono viene incluso nella versione condivisibile solo dopo approvazione specifica.
begin;
-- Ruoli di accesso al sito: nuovi ruoli senza permessi automatici, associabili alle email verificate.
-- NON attribuiscono automaticamente il corrispondente ruolo al giocatore della rubrica.
insert into public.rubrica_roles(slug,name,level) values
 ('co_capo','Co-Capo Clan',70),('staff','Staff',40)
on conflict(slug) do nothing;
alter table public.rubrica_private
  add column if not exists phone_share_approved boolean not null default false,
  add column if not exists phone_share_approved_at timestamptz,
  add column if not exists phone_share_approved_by uuid references auth.users(id) on delete set null;

-- L'approvazione può essere concessa/revocata solo da un amministratore con 'manage'.
-- Modificando il numero si revoca l'approvazione, finché non viene riautorizzato.
create or replace function public.rubrica_share_approval_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.phone_share_approved then
      if not public.rubrica_can('manage') then raise exception 'Solo Admin può autorizzare l’esportazione del telefono'; end if;
      if trim(new.phone) = '' then raise exception 'Numero di telefono assente'; end if;
      new.phone_share_approved_at=now();
      new.phone_share_approved_by=auth.uid();
    else
      new.phone_share_approved_at=null;
      new.phone_share_approved_by=null;
    end if;
  else
    if new.phone is distinct from old.phone then
      -- Mai trasferire l'autorizzazione di un numero a un altro numero.
      new.phone_share_approved=false;
    end if;
    if new.phone_share_approved is distinct from old.phone_share_approved then
      if not public.rubrica_can('manage') then
        -- cambio telefono può revocare automaticamente il consenso senza ruolo Admin
        if not (old.phone_share_approved and not new.phone_share_approved and new.phone is distinct from old.phone) then
          raise exception 'Solo Admin può cambiare il consenso di esportazione del telefono';
        end if;
      end if;
      if new.phone_share_approved then
        if trim(new.phone) = '' then raise exception 'Numero di telefono assente'; end if;
        new.phone_share_approved_at=now();
        new.phone_share_approved_by=auth.uid();
      else
        new.phone_share_approved_at=null;
        new.phone_share_approved_by=null;
      end if;
    else
      new.phone_share_approved_at=old.phone_share_approved_at;
      new.phone_share_approved_by=old.phone_share_approved_by;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists rubrica_share_approval_guard_t on public.rubrica_private;
create trigger rubrica_share_approval_guard_t before insert or update on public.rubrica_private
for each row execute function public.rubrica_share_approval_guard();

-- Function exposing ONLY opted-in phone numbers, only to authenticated Rubrica exporters.
-- Never grant SELECT on public.rubrica_private to non-'private' users except the existing RLS.
create or replace function public.rubrica_shared_phones()
returns table(contact_id uuid, phone text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not (public.rubrica_can('view') and public.rubrica_can('export')) then
  raise exception 'Esportazione Rubrica non autorizzata';
 end if;
 return query select c.id,p.phone
 from public.rubrica_contacts c
 join public.rubrica_private p on p.contact_id=c.id
 where c.deleted_at is null and p.phone_share_approved and trim(p.phone)<>'';
end; $$;
revoke all on function public.rubrica_shared_phones() from public,anon;
grant execute on function public.rubrica_shared_phones() to authenticated;

-- Audit con profili: nessun utente senza 'manage' può dichiarare un'esportazione Admin.
create or replace function public.rubrica_log_export(p_format text,p_categories text[],p_fields text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not (public.rubrica_can('view') and public.rubrica_can('export')) then
   raise exception 'Esportazione Rubrica non autorizzata';
 end if;
 if p_format not in ('whatsapp','excel') then raise exception 'Formato non valido'; end if;
 if 'admin'=any(p_fields) and not (public.rubrica_can('manage') and public.rubrica_can('private')) then
   raise exception 'Esportazione Admin non autorizzata';
 end if;
 insert into public.rubrica_audit(actor_id,action,detail)
 values(auth.uid(),'export_'||p_format,jsonb_build_object('categories',p_categories,'fields',p_fields));
end; $$;
revoke all on function public.rubrica_log_export(text,text[],text[]) from public,anon;
grant execute on function public.rubrica_log_export(text,text[],text[]) to authenticated;
commit;
