import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAIN_ADMIN_EMAIL = 'hasnaiiin@gmail.com';
const DEFAULT_CLAN_NAME = 'AK47DX';
const DEFAULT_CLAN_TAG = 'AK47DX';

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

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function nicknameFromUser(user: any) {
  const meta = user?.user_metadata || {};
  return String(meta.player_nickname || meta.codm_nickname || meta.nickname || meta.display_name || user?.email?.split('@')[0] || 'Player').trim();
}

function displayNameFromUser(user: any) {
  const meta = user?.user_metadata || {};
  return String(meta.display_name || meta.name || user?.email?.split('@')[0] || nicknameFromUser(user)).trim();
}

function codmUidFromUser(user: any) {
  const meta = user?.user_metadata || {};
  return meta.codm_uid ? String(meta.codm_uid).trim() : null;
}

async function getOrCreateClan(admin: any, ownerUserId?: string | null) {
  const { data: clans, error } = await admin
    .from('clans')
    .select('id,name,tag,owner_user_id,created_at')
    .or(`name.ilike.${DEFAULT_CLAN_NAME},tag.ilike.${DEFAULT_CLAN_TAG},tag.ilike.AK`)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  let clan = clans?.[0] as any;
  if (!clan?.id) {
    const { data: created, error: createError } = await admin
      .from('clans')
      .insert({ name: DEFAULT_CLAN_NAME, tag: DEFAULT_CLAN_TAG, owner_user_id: ownerUserId })
      .select('id,name,tag,owner_user_id')
      .single();
    if (createError) throw createError;
    clan = created;
  }
  return clan;
}

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ ok: false, error: 'Token login mancante.' }, { status: 401 });

    const authClient = anonClient(token);
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user?.id) return NextResponse.json({ ok: false, error: 'Sessione non valida.' }, { status: 401 });

    const admin = serviceClient();
    const user = userData.user;
    const clan = await getOrCreateClan(admin, normalizeEmail(user.email) === MAIN_ADMIN_EMAIL ? user.id : null);
    const nickname = nicknameFromUser(user);
    const role = normalizeEmail(user.email) === MAIN_ADMIN_EMAIL ? 'owner' : 'player';

    const profilePayload = {
      id: user.id,
      email: user.email || null,
      display_name: displayNameFromUser(user),
      player_nickname: nickname,
      codm_uid: codmUidFromUser(user),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await admin.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    if (profileError && /email|player_nickname|codm_uid|updated_at/i.test(profileError.message)) {
      await admin.from('profiles').upsert({ id: user.id, display_name: profilePayload.display_name }, { onConflict: 'id' });
    } else if (profileError) throw profileError;

    const { error: memberError } = await admin
      .from('clan_members')
      .upsert({ clan_id: clan.id, user_id: user.id, role }, { onConflict: 'clan_id,user_id' });
    if (memberError) throw memberError;

    const playerPayload = {
      clan_id: clan.id,
      user_id: user.id,
      nickname,
      uid_codm: codmUidFromUser(user),
      clan_name: clan.tag || clan.name || DEFAULT_CLAN_TAG,
      status: 'active',
      notes: `Sync automatico login/registrazione V6.9 · email=${user.email || '-'}`,
    };

    const { data: existing } = await admin.from('players').select('id').eq('clan_id', clan.id).eq('user_id', user.id).limit(1);
    let playerId = existing?.[0]?.id as string | undefined;
    if (!playerId) {
      const byNick = await admin.from('players').select('id').eq('clan_id', clan.id).eq('nickname', nickname).limit(1);
      playerId = byNick.data?.[0]?.id as string | undefined;
    }
    if (playerId) await admin.from('players').update(playerPayload).eq('id', playerId);
    else {
      const { data: created, error: playerError } = await admin.from('players').insert(playerPayload).select('id').single();
      if (playerError) throw playerError;
      playerId = created?.id;
    }

    return NextResponse.json({ ok: true, role, clanId: clan.id, playerId, message: 'Utente sincronizzato con profilo, permessi e roster.' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore sync roster.' }, { status: 500 });
  }
}
