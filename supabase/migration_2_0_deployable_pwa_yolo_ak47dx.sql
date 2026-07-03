-- CODM Clan Intelligence 2.0 Deployable PWA YOLO AK47DX
-- Estende la 2.0 con Storage, inviti cloud, PWA e dataset YOLO/OCR.

-- Storage buckets per prove screenshot e dataset.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('match-screenshots', 'match-screenshots', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('profile-screenshots', 'profile-screenshots', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('ocr-training-crops', 'ocr-training-crops', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('yolo-datasets', 'yolo-datasets', false, 52428800, array['application/zip','text/plain','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Bucket policies: inizialmente semplici per distribuzione clan; stringere in produzione se serve.
drop policy if exists "ak47dx match screenshots read" on storage.objects;
create policy "ak47dx match screenshots read" on storage.objects for select to anon, authenticated using (bucket_id in ('match-screenshots','profile-screenshots','ocr-training-crops'));

drop policy if exists "ak47dx match screenshots upload" on storage.objects;
create policy "ak47dx match screenshots upload" on storage.objects for insert to authenticated with check (bucket_id in ('match-screenshots','profile-screenshots','ocr-training-crops','yolo-datasets'));

drop policy if exists "ak47dx screenshots update" on storage.objects;
create policy "ak47dx screenshots update" on storage.objects for update to authenticated using (bucket_id in ('match-screenshots','profile-screenshots','ocr-training-crops','yolo-datasets')) with check (bucket_id in ('match-screenshots','profile-screenshots','ocr-training-crops','yolo-datasets'));

drop policy if exists "ak47dx screenshots delete" on storage.objects;
create policy "ak47dx screenshots delete" on storage.objects for delete to authenticated using (bucket_id in ('match-screenshots','profile-screenshots','ocr-training-crops','yolo-datasets'));

-- URL pubblica app/backend per inviti reali e PWA.
create table if not exists public.app_deployment_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.app_deployment_settings (setting_key, setting_value)
values
  ('app_public_url', 'https://ak47dx-clan.vercel.app'),
  ('ocr_backend_url', 'https://ak47dx-ocr-api.onrender.com'),
  ('pwa_enabled', 'true'),
  ('invite_enabled', 'true'),
  ('yolo_dataset_enabled', 'true')
on conflict (setting_key) do nothing;

-- Inviti con approvazione/ruoli più chiari.
alter table public.clan_invites add column if not exists max_uses int;
alter table public.clan_invites add column if not exists used_count int not null default 0;
alter table public.clan_invites add column if not exists invite_url text;
alter table public.clan_invites add column if not exists qr_url text;

alter table public.clan_invite_requests add column if not exists requested_role text default 'player';
alter table public.clan_invite_requests add column if not exists admin_notes text;
alter table public.clan_invite_requests add column if not exists approved_role text;

-- Dataset YOLO/OCR export.
create table if not exists public.yolo_dataset_exports (
  id uuid primary key default gen_random_uuid(),
  export_name text not null,
  storage_path text,
  screenshot_count int not null default 0,
  crop_count int not null default 0,
  label_count int not null default 0,
  status text not null default 'created',
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.ocr_training_samples add column if not exists screen_type text;
alter table public.ocr_training_samples add column if not exists phone_type text;
alter table public.ocr_training_samples add column if not exists label_class text;
alter table public.ocr_training_samples add column if not exists verified boolean not null default false;
alter table public.ocr_training_samples add column if not exists verified_by uuid;
alter table public.ocr_training_samples add column if not exists verified_at timestamptz;

create index if not exists idx_training_samples_screen_label on public.ocr_training_samples(screen_type, label_class, verified);
create index if not exists idx_dataset_exports_status on public.yolo_dataset_exports(status, created_at desc);

alter table public.app_deployment_settings enable row level security;
alter table public.yolo_dataset_exports enable row level security;

drop policy if exists "ak47dx deployment settings read" on public.app_deployment_settings;
create policy "ak47dx deployment settings read" on public.app_deployment_settings for select to anon, authenticated using (true);

drop policy if exists "ak47dx deployment settings edit" on public.app_deployment_settings;
create policy "ak47dx deployment settings edit" on public.app_deployment_settings for all to authenticated using (true) with check (true);

drop policy if exists "ak47dx dataset exports read" on public.yolo_dataset_exports;
create policy "ak47dx dataset exports read" on public.yolo_dataset_exports for select to authenticated using (true);

drop policy if exists "ak47dx dataset exports edit" on public.yolo_dataset_exports;
create policy "ak47dx dataset exports edit" on public.yolo_dataset_exports for all to authenticated using (true) with check (true);
