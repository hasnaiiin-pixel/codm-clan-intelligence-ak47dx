import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAIN_ADMIN_EMAIL = 'hasnaiiin@gmail.com';
const DEFAULT_CLAN_NAME = 'AK47DX';
const DEFAULT_CLAN_TAG = 'AK47DX';
const DEFAULT_PLAYER_ROLE = 'player';

type CodmRole = 'viewer' | 'player' | 'staff' | 'coach' | 'owner';
const allowedRoles: CodmRole[] = ['viewer', 'player', 'staff', 'coach', 'owner'];

type AdminClient = any;

type ClanRow = { id: string; name?: string | null; tag?: string | null; owner_user_id?: string | null };
type AuthUserLite = { id: string; email?: string | null; created_at?: string | null; last_sign_in_at?: string | null; user_metadata?: Record<string, any> | null };

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isMainAdminEmail(value?: string | null) {
  return normalizeEmail(value) === MAIN_ADMIN_EMAIL;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  return createClient<any>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return createClient<any>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function requireRequester(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw Object.assign(new Error('Login mancante. Fai accesso come Owner.'), { status: 401 });
  const { data, error } = await anonClient(token).auth.getUser();
  if (error || !data.user?.id) throw Object.assign(new Error('Sessione non valida.'), { status: 401 });
  return data.user;
}

async function getOrCreateClan(admin: AdminClient, ownerUserId?: string | null): Promise<ClanRow> {
  const { data: clans, error } = await admin
    .from('clans')
    .select('id,name,tag,owner_user_id,created_at')
    .or(`name.ilike.${DEFAULT_CLAN_NAME},tag.ilike.${DEFAULT_CLAN_TAG},tag.ilike.AK`)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  let clan = clans?.[0] as ClanRow | undefined;
  if (!clan?.id) {
    if (!ownerUserId) throw new Error('Clan non trovato e owner non disponibile per crearlo.');
    const { data: created, error: createError } = await admin
      .from('clans')
      .insert({ name: DEFAULT_CLAN_NAME, tag: DEFAULT_CLAN_TAG, owner_user_id: ownerUserId })
      .select('id,name,tag,owner_user_id')
      .single();
    if (createError) throw createError;
    clan = created as ClanRow;
  }
  if (!clan?.id) throw new Error('Clan non trovato.');
  return clan;
}

async function assertOwner(admin: AdminClient, requester: any, clanId: string) {
  if (isMainAdminEmail(requester.email)) return true;
  const { data, error } = await admin
    .from('clan_members')
    .select('role')
    .eq('clan_id', clanId)
    .eq('user_id', requester.id)
    .maybeSingle();
  if (error) throw error;
  if (data?.role !== 'owner') throw Object.assign(new Error('Solo Owner può vedere e modificare la gestione utenti.'), { status: 403 });
  return true;
}

async function listAuthUsers(admin: AdminClient): Promise<AuthUserLite[]> {
  const users: AuthUserLite[] = [];
  for (let page = 1; page <= 6; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw error;
    const batch = (data?.users || []) as AuthUserLite[];
    users.push(...batch);
    if (batch.length < 500) break;
  }
  return users;
}

function nicknameFromUser(user: AuthUserLite) {
  const meta = user.user_metadata || {};
  return String(meta.player_nickname || meta.codm_nickname || meta.nickname || meta.name || meta.display_name || user.email?.split('@')[0] || 'Player').trim();
}

function displayNameFromUser(user: AuthUserLite) {
  const meta = user.user_metadata || {};
  return String(meta.display_name || meta.name || user.email?.split('@')[0] || nicknameFromUser(user)).trim();
}

function codmUidFromUser(user: AuthUserLite) {
  const meta = user.user_metadata || {};
  return meta.codm_uid ? String(meta.codm_uid).trim() : null;
}

async function safeUpsertProfile(admin: AdminClient, user: AuthUserLite) {
  const payload = {
    id: user.id,
    email: user.email || null,
    display_name: displayNameFromUser(user),
    player_nickname: nicknameFromUser(user),
    codm_uid: codmUidFromUser(user),
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error && /email|player_nickname|codm_uid|updated_at/i.test(error.message)) {
    await admin.from('profiles').upsert({ id: user.id, display_name: payload.display_name }, { onConflict: 'id' });
  } else if (error) throw error;
}

async function ensurePlayerForUser(admin: AdminClient, clan: ClanRow, user: AuthUserLite) {
  const nickname = nicknameFromUser(user) || 'Player';
  const uid = codmUidFromUser(user);
  const clanTag = clan.tag || clan.name || DEFAULT_CLAN_TAG;

  const { data: existingByUser, error: byUserError } = await admin
    .from('players')
    .select('id,nickname')
    .eq('clan_id', clan.id)
    .eq('user_id', user.id)
    .limit(1);
  if (byUserError && !/user_id/i.test(byUserError.message)) throw byUserError;

  const existingId = existingByUser?.[0]?.id;
  const payload = {
    clan_id: clan.id,
    user_id: user.id,
    nickname,
    uid_codm: uid,
    clan_name: clanTag,
    status: 'active',
    notes: `Sync automatico V6.9 · email=${user.email || '-'} · sorgente=Supabase Auth`,
  };

  if (existingId) {
    const { error } = await admin.from('players').update(payload).eq('id', existingId);
    if (error) throw error;
    return existingId as string;
  }

  const { data: existingByNickname, error: byNameError } = await admin
    .from('players')
    .select('id')
    .eq('clan_id', clan.id)
    .eq('nickname', nickname)
    .limit(1);
  if (byNameError) throw byNameError;

  if (existingByNickname?.[0]?.id) {
    const { error } = await admin.from('players').update(payload).eq('id', existingByNickname[0].id);
    if (error) throw error;
    return existingByNickname[0].id as string;
  }

  const { data: created, error } = await admin.from('players').insert(payload).select('id').single();
  if (error) throw error;
  return created?.id as string;
}

async function syncAuthUsersToClan(admin: AdminClient, clan: ClanRow, authUsers: AuthUserLite[]) {
  let synced = 0;
  for (const user of authUsers) {
    if (!user.id) continue;
    await safeUpsertProfile(admin, user);
    const role: CodmRole = isMainAdminEmail(user.email) ? 'owner' : DEFAULT_PLAYER_ROLE;
    const { error: memberError } = await admin
      .from('clan_members')
      .upsert({ clan_id: clan.id, user_id: user.id, role }, { onConflict: 'clan_id,user_id' });
    if (memberError) throw memberError;
    await ensurePlayerForUser(admin, clan, user);
    synced += 1;
  }
  return synced;
}

export async function GET(request: NextRequest) {
  try {
    const requester = await requireRequester(request);
    const admin = serviceClient();
    const clan = await getOrCreateClan(admin, requester.id);
    await assertOwner(admin, requester, clan.id);

    const authUsers = await listAuthUsers(admin);
    let synced = 0;
    if (request.nextUrl.searchParams.get('sync') === '1') {
      synced = await syncAuthUsersToClan(admin, clan, authUsers);
    }

    const [{ data: profiles }, { data: members }, { data: players }, { data: requests }] = await Promise.all([
      admin.from('profiles').select('id,email,display_name,player_nickname,codm_uid,created_at,updated_at').limit(1000),
      admin.from('clan_members').select('id,clan_id,user_id,role,created_at').eq('clan_id', clan.id).limit(1000),
      admin.from('players').select('id,clan_id,user_id,nickname,uid_codm,clan_name,status,created_at').eq('clan_id', clan.id).order('nickname').limit(1000),
      admin.from('clan_invite_requests').select('id,clan_id,user_id,nickname,uid_codm,social_contact,status,linked_player_id,created_at').eq('clan_id', clan.id).order('created_at', { ascending: false }).limit(500),
    ]);

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
    const memberByUser = new Map((members || []).map((m: any) => [m.user_id, m]));
    const playerByUser = new Map((players || []).filter((p: any) => p.user_id).map((p: any) => [p.user_id, p]));
    const pendingByUser = new Map((requests || []).filter((r: any) => r.user_id && r.status === 'pending').map((r: any) => [r.user_id, r]));

    const rows = authUsers.map((user) => {
      const profile: any = profileById.get(user.id) || {};
      const member: any = memberByUser.get(user.id) || null;
      const player: any = playerByUser.get(user.id) || null;
      const pending: any = pendingByUser.get(user.id) || null;
      const role = isMainAdminEmail(user.email) ? 'owner' : (member?.role || 'registered');
      return {
        id: user.id,
        email: user.email || profile.email || null,
        created_at: user.created_at || profile.created_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        display_name: profile.display_name || displayNameFromUser(user),
        player_nickname: player?.nickname || profile.player_nickname || nicknameFromUser(user),
        codm_uid: player?.uid_codm || profile.codm_uid || codmUidFromUser(user),
        member_id: member?.id || null,
        role,
        player_id: player?.id || null,
        roster_status: player?.status || null,
        clan_name: player?.clan_name || clan.tag || clan.name || DEFAULT_CLAN_TAG,
        pending_request_id: pending?.id || null,
        pending_status: pending?.status || null,
      };
    });

    return NextResponse.json({
      ok: true,
      clan,
      users: rows,
      players: players || [],
      requests: requests || [],
      diagnostics: {
        auth_users: authUsers.length,
        profiles: profiles?.length || 0,
        clan_members: members?.length || 0,
        roster_players: players?.length || 0,
        pending_requests: (requests || []).filter((r: any) => r.status === 'pending').length,
        synced,
        service_role: true,
        requester: requester.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Errore gestione utenti.' }, { status: error?.status || 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requester = await requireRequester(request);
    const admin = serviceClient();
    const clan = await getOrCreateClan(admin, requester.id);
    await assertOwner(admin, requester, clan.id);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'syncAll') {
      const authUsers = await listAuthUsers(admin);
      const synced = await syncAuthUsersToClan(admin, clan, authUsers);
      return NextResponse.json({ ok: true, message: `Sync completato: ${synced} utenti registrati allineati a roster e permessi.`, synced });
    }

    if (action === 'updateRole') {
      const userId = String(body.userId || '');
      const role = String(body.role || '') as CodmRole;
      if (!userId || !allowedRoles.includes(role)) throw Object.assign(new Error('Ruolo o utente non valido.'), { status: 400 });
      const finalRole: CodmRole = String(body.email || '').toLowerCase() === MAIN_ADMIN_EMAIL ? 'owner' : role;
      const { error } = await admin.from('clan_members').upsert({ clan_id: clan.id, user_id: userId, role: finalRole }, { onConflict: 'clan_id,user_id' });
      if (error) throw error;
      return NextResponse.json({ ok: true, message: `Ruolo aggiornato a ${finalRole}.` });
    }



    if (action === 'deleteUser') {
      const userId = String(body.userId || '');
      const email = String(body.email || '').toLowerCase();
      if (!userId) throw Object.assign(new Error('Utente mancante.'), { status: 400 });
      if (email === MAIN_ADMIN_EMAIL) throw Object.assign(new Error('Admin principale non cancellabile.'), { status: 400 });
      await admin.from('clan_members').delete().eq('clan_id', clan.id).eq('user_id', userId);
      await admin.from('players').delete().eq('clan_id', clan.id).eq('user_id', userId);
      await admin.from('profiles').delete().eq('id', userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: 'Utente cancellato da Auth, roster e membri clan.' });
    }

    if (action === 'setRosterStatus') {
      const playerId = String(body.playerId || '');
      const status = String(body.status || 'active');
      if (!playerId) throw Object.assign(new Error('Player mancante.'), { status: 400 });
      const { error } = await admin.from('players').update({ status }).eq('id', playerId).eq('clan_id', clan.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: `Stato roster aggiornato a ${status}.` });
    }

    throw Object.assign(new Error('Azione admin non riconosciuta.'), { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Errore aggiornamento utenti.' }, { status: error?.status || 500 });
  }
}
