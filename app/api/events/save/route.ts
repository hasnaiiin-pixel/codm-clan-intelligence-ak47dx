import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const MAIN_ADMIN_EMAIL = 'hasnaiiin@gmail.com';
const DEFAULT_CLAN_NAME = 'AK47DX';
const DEFAULT_CLAN_TAG = 'AK47DX';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type EventPlayerInput = {
  player_id?: string | null;
  nickname?: string | null;
  status?: string | null;
};

type EventSaveBody = {
  id?: string | null;
  local_id?: string | null;
  clan_id?: string | null;
  mode?: 'created' | 'updated';
  event?: Record<string, any>;
  players?: EventPlayerInput[];
};

function isUuid(value?: string | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function cleanText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function normalizeIso(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeReminderMinutes(value: unknown) {
  if (!Array.isArray(value)) return [120, 60, 30, 10];
  const nums = value.map((item) => Number(item)).filter((n) => Number.isFinite(n) && n > 0 && n <= 10080);
  return Array.from(new Set(nums.length ? nums : [120, 60, 30, 10])).sort((a, b) => b - a);
}

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function serviceClient() {
  const url = supabaseUrl();
  const serviceKey = serviceRoleKey();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function authClient(token: string) {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) throw new Error('Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function ensureMainAdminClan(admin: SupabaseClient, userId: string) {
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
  } else {
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

async function resolveWritableClanIdWithService(admin: SupabaseClient, requestedClanId: string | null, userId: string, email?: string | null) {
  if (isUuid(requestedClanId)) {
    const { data, error } = await admin
      .from('clan_members')
      .select('clan_id,role')
      .eq('clan_id', requestedClanId)
      .eq('user_id', userId)
      .in('role', ['owner', 'coach', 'staff'])
      .maybeSingle();
    if (error) throw error;
    if (data?.clan_id) return data.clan_id as string;
  }

  if (normalizeEmail(email) === MAIN_ADMIN_EMAIL) return ensureMainAdminClan(admin, userId);

  const { data, error } = await admin
    .from('clan_members')
    .select('clan_id,role')
    .eq('user_id', userId)
    .in('role', ['owner', 'coach', 'staff'])
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  const member = data?.[0] as { clan_id?: string | null } | undefined;
  if (isUuid(member?.clan_id)) return member.clan_id;

  throw new Error('Permesso mancante: serve ruolo owner, coach o staff in un clan Supabase valido.');
}

async function resolveWritableClanIdWithUser(client: SupabaseClient, requestedClanId: string | null, userId: string, email?: string | null) {
  if (isUuid(requestedClanId)) {
    const { data, error } = await client
      .from('clan_members')
      .select('clan_id,role')
      .eq('clan_id', requestedClanId)
      .eq('user_id', userId)
      .in('role', ['owner', 'coach', 'staff'])
      .maybeSingle();
    if (error) throw error;
    if (data?.clan_id) return data.clan_id as string;
  }

  const { data, error } = await client
    .from('clan_members')
    .select('clan_id,role')
    .eq('user_id', userId)
    .in('role', ['owner', 'coach', 'staff'])
    .limit(1);
  if (error) throw error;
  const member = data?.[0] as { clan_id?: string | null } | undefined;
  if (isUuid(member?.clan_id)) return member.clan_id;

  if (normalizeEmail(email) === MAIN_ADMIN_EMAIL) {
    throw new Error('Admin principale riconosciuto, ma SUPABASE_SERVICE_ROLE_KEY non è configurata su Vercel: senza questa chiave il server non può creare/agganciare il clan AK47DX e condividere eventi con tutti.');
  }

  throw new Error('Permesso mancante: serve ruolo owner, coach o staff in un clan Supabase valido.');
}

function buildEventPayload(body: EventSaveBody, clanId: string, userId: string) {
  const event = body.event || {};
  const startsAt = normalizeIso(event.starts_at) || normalizeIso(event.start_at) || new Date().toISOString();
  const endsAt = normalizeIso(event.ends_at);
  return {
    clan_id: clanId,
    title: cleanText(event.title, 'Evento CODM'),
    description: cleanText(event.description, '') || null,
    location: cleanText(event.location, '') || null,
    event_type: cleanText(event.event_type, 'scrim'),
    starts_at: startsAt,
    ends_at: endsAt,
    visibility: cleanText(event.visibility, 'public'),
    telegram_enabled: event.telegram_enabled ?? true,
    google_calendar_url: cleanText(event.google_calendar_url, '') || null,
    created_by: userId,
    event_plan: event.event_plan && typeof event.event_plan === 'object' ? event.event_plan : {},
    convocations: Array.isArray(event.convocations) ? event.convocations : [],
    convocations_text: cleanText(event.convocations_text, '') || null,
    reminder_minutes: sanitizeReminderMinutes(event.reminder_minutes),
    telegram_message_template: cleanText(event.telegram_message_template, '') || null,
    event_notes: cleanText(event.event_notes, '') || null,
    sync_status: 'synced',
    sync_error: null,
    updated_at: new Date().toISOString()
  };
}

async function saveEventPlayers(db: SupabaseClient, eventId: string, clanId: string, players: EventPlayerInput[] = []) {
  const { error: deleteError } = await db.from('codm_event_players').delete().eq('event_id', eventId);
  if (deleteError) throw deleteError;

  const rows = players
    .map((player) => ({
      event_id: eventId,
      clan_id: clanId,
      player_id: isUuid(player.player_id) ? player.player_id : null,
      nickname: cleanText(player.nickname, ''),
      status: cleanText(player.status, 'convocato')
    }))
    .filter((row) => row.nickname);

  if (!rows.length) return 0;
  const { error } = await db.from('codm_event_players').insert(rows);
  if (error) throw error;
  return rows.length;
}

async function notifyClanMembers(admin: SupabaseClient, clanId: string, eventId: string, eventTitle: string, startsAt: string, mode: 'created' | 'updated') {
  const { data: members, error: membersError } = await admin
    .from('clan_members')
    .select('user_id')
    .eq('clan_id', clanId);
  if (membersError) throw membersError;

  const rows = (members || [])
    .map((member: any) => member.user_id)
    .filter((id: unknown): id is string => isUuid(String(id)))
    .map((userId: string) => ({
      clan_id: clanId,
      user_id: userId,
      type: 'event',
      title: mode === 'updated' ? 'Evento aggiornato' : 'Nuovo evento creato',
      body: `${eventTitle} · ${new Date(startsAt).toLocaleString('it-IT')}`,
      metadata: { event_id: eventId, href: '/events' },
      dedupe_key: `event-${mode}-${eventId}`,
      read_at: null,
      created_at: new Date().toISOString()
    }));

  if (!rows.length) return 0;
  const { error } = await admin.from('codm_notifications').upsert(rows, { onConflict: 'user_id,dedupe_key' });
  if (error) throw error;
  return rows.length;
}

async function notifyCurrentUser(db: SupabaseClient, clanId: string, userId: string, eventId: string, eventTitle: string, startsAt: string, mode: 'created' | 'updated') {
  const { error } = await db.from('codm_notifications').upsert({
    clan_id: clanId,
    user_id: userId,
    type: 'event',
    title: mode === 'updated' ? 'Evento aggiornato' : 'Nuovo evento creato',
    body: `${eventTitle} · ${new Date(startsAt).toLocaleString('it-IT')}`,
    metadata: { event_id: eventId, href: '/events' },
    dedupe_key: `event-${mode}-${eventId}`,
    read_at: null,
    created_at: new Date().toISOString()
  }, { onConflict: 'user_id,dedupe_key' });
  return error ? 0 : 1;
}

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ ok: false, error: 'Login richiesto: token sessione mancante.' }, { status: 401 });

    const userClient = authClient(token);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user?.id) {
      return NextResponse.json({ ok: false, error: 'Sessione Supabase non valida.' }, { status: 401 });
    }

    const body = (await request.json()) as EventSaveBody;
    const admin = serviceClient();
    const db = admin || userClient;
    const clanId = admin
      ? await resolveWritableClanIdWithService(admin, isUuid(body.clan_id) ? body.clan_id : null, userData.user.id, userData.user.email)
      : await resolveWritableClanIdWithUser(userClient, isUuid(body.clan_id) ? body.clan_id : null, userData.user.id, userData.user.email);

    const payload = buildEventPayload(body, clanId, userData.user.id);
    const remoteEventId = isUuid(body.id) ? body.id : isUuid(body.event?.id) ? body.event?.id : null;
    const mode: 'created' | 'updated' = remoteEventId ? 'updated' : (body.mode === 'updated' ? 'updated' : 'created');

    let savedEvent: any = null;
    if (remoteEventId) {
      const { data, error } = await db
        .from('codm_events')
        .update(payload)
        .eq('id', remoteEventId)
        .select('*')
        .single();
      if (error) throw error;
      savedEvent = data;
    } else {
      const { data, error } = await db
        .from('codm_events')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      savedEvent = data;
    }

    if (!savedEvent?.id) throw new Error('Evento non salvato su Supabase.');
    const playersCount = await saveEventPlayers(db, savedEvent.id, clanId, body.players || []);
    const notificationsCount = admin
      ? await notifyClanMembers(admin, clanId, savedEvent.id, savedEvent.title, savedEvent.starts_at, mode)
      : await notifyCurrentUser(userClient, clanId, userData.user.id, savedEvent.id, savedEvent.title, savedEvent.starts_at, mode);

    return NextResponse.json({
      ok: true,
      event: savedEvent,
      playersCount,
      notificationsCount,
      clanId,
      shared: true,
      serverMode: admin ? 'service-role' : 'authenticated-rls',
      warning: admin ? null : 'Evento salvato con RLS utente. Per notifiche a tutti i membri configura SUPABASE_SERVICE_ROLE_KEY su Vercel.'
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore salvataggio evento.' }, { status: 500 });
  }
}
