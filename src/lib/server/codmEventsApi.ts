import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const MAIN_ADMIN_EMAIL = 'hasnaiiin@gmail.com';
export const DEFAULT_CLAN_NAME = 'AK47DX';
export const DEFAULT_CLAN_TAG = 'AK47DX';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (userError || !userData.user?.id) throw new Error('Sessione Supabase non valida.');
  const admin = serviceClient();
  return {
    userId: userData.user.id,
    email: userData.user.email || null,
    userClient,
    admin,
    db: admin || userClient
  };
}

export async function ensureMainAdminClan(admin: SupabaseClient, userId: string) {
  const { data: clans, error: readError } = await admin
    .from('clans')
    .select('id,name,tag,owner_user_id')
    .or(`owner_user_id.eq.${userId},name.ilike.${DEFAULT_CLAN_NAME},tag.ilike.${DEFAULT_CLAN_TAG},tag.ilike.AK`)
    .order('created_at', { ascending: true })
    .limit(1);
  if (readError) throw readError;

  let clan = clans?.[0] as { id: string; name?: string | null; tag?: string | null; owner_user_id?: string | null } | undefined;
  if (!clan?.id) {
    const { data, error } = await admin
      .from('clans')
      .insert({ name: DEFAULT_CLAN_NAME, tag: DEFAULT_CLAN_TAG, owner_user_id: userId })
      .select('id,name,tag,owner_user_id')
      .single();
    if (error) throw error;
    clan = data as typeof clan;
  } else if (clan.owner_user_id !== userId || !clan.name || !clan.tag) {
    const { data, error } = await admin
      .from('clans')
      .update({ owner_user_id: userId, name: clan.name || DEFAULT_CLAN_NAME, tag: clan.tag || DEFAULT_CLAN_TAG })
      .eq('id', clan.id)
      .select('id,name,tag,owner_user_id')
      .single();
    if (error) throw error;
    clan = data as typeof clan;
  }

  if (!clan?.id) throw new Error('Clan admin non trovato.');
  const { error: memberError } = await admin
    .from('clan_members')
    .upsert({ clan_id: clan.id, user_id: userId, role: 'owner' }, { onConflict: 'clan_id,user_id' });
  if (memberError) throw memberError;
  return clan.id;
}

export async function resolveClanId(ctx: CodmUserContext, requestedClanId?: string | null, requireWriter = false) {
  const db = ctx.admin || ctx.userClient;
  const requested = isUuid(requestedClanId) ? requestedClanId : null;
  const roles = requireWriter ? ['owner', 'coach', 'staff'] : ['owner', 'coach', 'staff', 'player', 'viewer', 'member', 'registered'];

  if (requested) {
    const query = db
      .from('clan_members')
      .select('clan_id,role')
      .eq('clan_id', requested)
      .eq('user_id', ctx.userId);
    const { data, error } = requireWriter ? await query.in('role', roles).maybeSingle() : await query.maybeSingle();
    if (error) throw error;
    if (data?.clan_id) return data.clan_id as string;
  }

  if (ctx.admin && normalizeEmail(ctx.email) === MAIN_ADMIN_EMAIL) return ensureMainAdminClan(ctx.admin, ctx.userId);

  const memberQuery = db
    .from('clan_members')
    .select('clan_id,role')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: true })
    .limit(1);
  const { data, error } = requireWriter ? await memberQuery.in('role', roles) : await memberQuery;
  if (error) throw error;
  const member = data?.[0] as { clan_id?: string | null } | undefined;
  if (isUuid(member?.clan_id)) return member.clan_id;

  if (requireWriter) {
    if (normalizeEmail(ctx.email) === MAIN_ADMIN_EMAIL) {
      throw new Error('Admin principale riconosciuto, ma SUPABASE_SERVICE_ROLE_KEY non è configurata su Vercel: senza questa chiave il server non può garantire scrittura/cancellazione condivisa.');
    }
    throw new Error('Permesso mancante: serve ruolo owner, coach o staff in un clan valido.');
  }
  return null;
}

export async function isClanWriter(ctx: CodmUserContext, clanId: string) {
  if (ctx.admin && normalizeEmail(ctx.email) === MAIN_ADMIN_EMAIL) return true;
  const db = ctx.admin || ctx.userClient;
  const { data, error } = await db
    .from('clan_members')
    .select('role')
    .eq('clan_id', clanId)
    .eq('user_id', ctx.userId)
    .in('role', ['owner', 'coach', 'staff'])
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.role);
}
