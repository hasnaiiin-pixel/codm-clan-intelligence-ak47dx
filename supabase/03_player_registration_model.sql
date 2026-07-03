-- CODM AK47DX - Player Registration Requests
-- Flusso semplice: nuovo player apre /join, inserisce nickname/UID/email.
-- Lo stato resta PENDING finché owner/coach/staff approva.
-- Questa tabella è indipendente e sicura: anon può solo creare richiesta, non modificarla.

create table if not exists public.codm_player_join_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  email text,
  nickname text not null,
  uid_codm text,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_user_id uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.codm_player_join_requests enable row level security;

grant insert on public.codm_player_join_requests to anon, authenticated;
grant select, update on public.codm_player_join_requests to authenticated;

-- Evita duplicati policy.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='codm_player_join_requests' and policyname='codm join request public insert') then
    create policy "codm join request public insert"
    on public.codm_player_join_requests
    for insert to anon, authenticated
    with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='codm_player_join_requests' and policyname='codm join request admins read') then
    create policy "codm join request admins read"
    on public.codm_player_join_requests
    for select to authenticated
    using (public.codm_can_manage_clan(clan_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='codm_player_join_requests' and policyname='codm join request admins update') then
    create policy "codm join request admins update"
    on public.codm_player_join_requests
    for update to authenticated
    using (public.codm_can_manage_clan(clan_id))
    with check (public.codm_can_manage_clan(clan_id));
  end if;
end $$;
