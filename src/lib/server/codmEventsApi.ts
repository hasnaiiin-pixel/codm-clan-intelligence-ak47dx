import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const MAIN_ADMIN_EMAIL = 'hasnaiiin@gmail.com';
export const DEFAULT_CLAN_NAME = 'AK47DX';
export const DEFAULT_CLAN_TAG = 'AK47DX';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
export const WRITER_ROLES = ['owner', 'coach', 'staff'] as const;

export type CodmUserContext = {
  userId: string;
  email: string | null;
  userClient: SupabaseClient;
  admin: SupabaseClient | null;
  db: SupabaseClient;
};

export function isUuid(value?: string | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function isMainAdmin(email?: string | null) {
  return normalizeEmail(email) === MAIN_ADMIN_EMAIL;
}

export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

export function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

export function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function serviceClient() {
  const url = supabaseUrl();
  const serviceKey = serviceRoleKey();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function requireServiceClient() {
  const admin = serviceClient();
  if (!admin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante su Vercel: eventi bloccati per evitare differenze tra browser e PWA. Aggiungi la variabile e fai redeploy.');
  }
  return admin;
}

export function authClient(token: string) {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) throw new Error('Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function getUserContext(token: string): Promise<CodmUserContext> {
  if (!token) throw new Error('Login richiesto: token sessione mancante.');
  const userClient = authClient(token);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user?.id) throw new Error('Sessione Supabase non valida. Fai logout/login e riprova.');
  const admin = requireServiceClient();
  return {
    userId: userData.user.id,
    email: userData.user.email || null,
    userClient,
    admin,
    db: admin
  };
}

export async function ensureOfficialClan(admin: SupabaseClient, ownerUserId?: string | null) {
  const { data: clans, error: readError } = await admin
    .from('clans')
    .select('id,name,tag,owner_user_id,created_at')
    .or(`tag.ilike.${DEFAULT_CLAN_TAG},name.ilike.${DEFAULT_CLAN_NAME},tag.ilike.AK`)
    .order('created_at', { ascending: true })
    .limit(1);
  if (readError) throw readError;

  let clan = clans?.[0] as { id: string; name?: string | null; tag?: string | null; owner_user_id?: string | null } | undefined;
  if (!clan?.id) {
    const insertPayload: Record<string, unknown> = { name: DEFAULT_CLAN_NAME, tag: DEFAULT_CLAN_TAG };
    if (isUuid(ownerUserId)) insertPayload.owner_user_id = ownerUserId;
    const { data, error } = await admin
      .from('clans')
      .insert(insertPayload)
      .select('id,name,tag,owner_user_id')
      .single();
    if (error) throw error;
    clan = data as typeof clan;
  } else {
    const patch: Record<string, unknown> = {};
    if (!clan.name) patch.name = DEFAULT_CLAN_NAME;
    if (!clan.tag) patch.tag = DEFAULT_CLAN_TAG;
    if (!clan.owner_user_id && isUuid(ownerUserId)) patch.owner_user_id = ownerUserId;
    if (Object.keys(patch).length) {
      const { data, error } = await admin
        .from('clans')
        .update(patch)
        .eq('id', clan.id)
        .select('id,name,tag,owner_user_id')
        .single();
      if (error) throw error;
      clan = data as typeof clan;
    }
  }

  if (!clan?.id) throw new Error('Clan ufficiale AK47DX non trovato o non creato.');
  return clan;
}

export async function ensureMainAdminMembership(admin: SupabaseClient, clanId: string, userId: string, email?: string | null) {
  if (!isMainAdmin(email)) return;
  const { error } = await admin
    .from('clan_members')
    .upsert({ clan_id: clanId, user_id: userId, role: 'owner' }, { onConflict: 'clan_id,user_id' });
  if (error) throw error;
}

export async function resolveOfficialClanId(ctx: CodmUserContext, requireWriter = false) {
  const admin = ctx.admin || requireServiceClient();
  const official = await ensureOfficialClan(admin, isMainAdmin(ctx.email) ? ctx.userId : null);
  if (!isUuid(official.id)) throw new Error('Clan ufficiale AK47DX non ha UUID valido.');
  await ensureMainAdminMembership(admin, official.id, ctx.userId, ctx.email);

  if (!requireWriter) return official.id;
  const canWrite = await isClanWriter(ctx, official.id);
  if (!canWrite) throw new Error('Permesso mancante: solo Owner, Coach o Staff possono creare, modificare o cancellare eventi. Controlla Gestione utenti.');
  return official.id;
}

// Compatibilità con route vecchie: da V8.1 il client non può più scegliere clan_id.
export async function resolveClanId(ctx: CodmUserContext, _requestedClanId?: string | null, requireWriter = false) {
  return resolveOfficialClanId(ctx, requireWriter);
}

export async function isClanWriter(ctx: CodmUserContext, clanId: string) {
  if (!isUuid(clanId)) return false;
  if (isMainAdmin(ctx.email)) return true;
  const admin = ctx.admin || requireServiceClient();
  const { data, error } = await admin
    .from('clan_members')
    .select('role')
    .eq('clan_id', clanId)
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (error) throw error;
  return WRITER_ROLES.includes(String(data?.role || '') as any);
}

export function noStoreHeaders(extra?: HeadersInit) {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    ...(extra || {})
  };
}
