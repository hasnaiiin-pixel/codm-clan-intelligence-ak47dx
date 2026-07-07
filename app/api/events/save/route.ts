import { NextRequest, NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { getUserContext, resolveOfficialClanId, isUuid, noStoreHeaders } from '@/lib/server/codmEventsApi';
import { sendTelegramEventLifecycle } from '@/lib/server/codmTelegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type EventPlayerInput = { player_id?: string | null; nickname?: string | null; status?: string | null };
type EventSaveBody = { id?: string | null; mode?: 'created' | 'updated'; event?: Record<string, any>; players?: EventPlayerInput[] };

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: noStoreHeaders(init?.headers) });
}

function cleanText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeIso(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeReminderMinutes(value: unknown) {
  if (!Array.isArray(value)) return [10080, 1440, 360, 120, 60, 30, 10, 0];
  const nums = value.map((item) => Number(item)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 43200);
  return Array.from(new Set(nums.length ? nums : [120, 30, 10, 0])).sort((a, b) => b - a);
}

function normalizeEventPlan(event: Record<string, any>) {
  const plan = event.event_plan && typeof event.event_plan === 'object' ? { ...event.event_plan } : {};
  const teamA = cleanText(plan.teamAName, 'AK47DX');
  const teamB = cleanText(plan.teamBName || plan.opponentName, 'Clan avversario');
  return { ...plan, teamAName: teamA, teamBName: teamB };
}

function buildEventPayload(body: EventSaveBody, clanId: string, userId: string, mode: 'created' | 'updated') {
  const event = body.event || {};
  const eventPlan = normalizeEventPlan(event);
  const startsAt = normalizeIso(event.starts_at) || normalizeIso(event.start_at);
  const endsAt = normalizeIso(event.ends_at);
  const payload: Record<string, unknown> = {
    clan_id: clanId,
    title: cleanText(event.title, `Scrim ${eventPlan.teamAName} vs ${eventPlan.teamBName}`),
    description: cleanText(event.description, '') || null,
    location: cleanText(event.location, '') || null,
    event_type: cleanText(event.event_type, 'scrim'),
    ends_at: endsAt,
    visibility: cleanText(event.visibility, 'public'),
    telegram_enabled: event.telegram_enabled ?? true,
    google_calendar_url: cleanText(event.google_calendar_url, '') || null,
    event_plan: eventPlan,
    convocations: Array.isArray(event.convocations) ? event.convocations : [],
    convocations_text: cleanText(event.convocations_text, '') || null,
    reminder_minutes: sanitizeReminderMinutes(event.reminder_minutes),
    telegram_message_template: cleanText(event.telegram_message_template, '') || null,
    event_notes: cleanText(event.event_notes, '') || null,
    local_id: null,
    sync_status: 'synced',
    sync_error: null,
    updated_at: new Date().toISOString()
  };
  if (startsAt) payload.starts_at = startsAt;
  else if (mode === 'created') payload.starts_at = new Date().toISOString();
  if (mode === 'created') payload.created_by = userId;
  return payload;
}

async function saveEventPlayers(db: SupabaseClient, eventId: string, clanId: string, players: EventPlayerInput[] = []) {
  try {
    const { error: deleteError } = await db.from('codm_event_players').delete().eq('event_id', eventId);
    if (deleteError && deleteError.code !== '42P01') throw deleteError;
  } catch (error: any) {
    if (error?.code !== '42P01') throw error;
  }

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
  const { data: members, error: membersError } = await admin.from('clan_members').select('user_id').eq('clan_id', clanId);
  if (membersError) throw membersError;
  const rows = (members || [])
    .map((member: any) => member.user_id)
    .filter((id: unknown): id is string => isUuid(String(id)))
    .map((userId: string) => ({
      clan_id: clanId,
      user_id: userId,
      type: 'event',
      title: mode === 'updated' ? 'Evento modificato' : 'Nuovo evento creato',
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

export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    const clanId = await resolveOfficialClanId(ctx, true);
    const body = (await request.json()) as EventSaveBody;
    const remoteEventId = isUuid(body.id) ? body.id : isUuid(body.event?.id) ? body.event?.id : null;
    const mode: 'created' | 'updated' = remoteEventId ? 'updated' : 'created';
    const payload = buildEventPayload(body, clanId, ctx.userId, mode);

    let savedEvent: any = null;
    if (remoteEventId) {
      const { data, error } = await ctx.admin!
        .from('codm_events')
        .update(payload)
        .eq('id', remoteEventId)
        .eq('clan_id', clanId)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error('Evento non trovato nel database ufficiale AK47DX: aggiorna lista eventi e riprova.');
      savedEvent = data;
    } else {
      const { data, error } = await ctx.admin!.from('codm_events').insert(payload).select('*').single();
      if (error) throw error;
      savedEvent = data;
    }

    if (!savedEvent?.id) throw new Error('Evento non salvato su Supabase.');
    const playersCount = await saveEventPlayers(ctx.admin!, savedEvent.id, clanId, body.players || []);
    const notificationsCount = await notifyClanMembers(ctx.admin!, clanId, savedEvent.id, savedEvent.title, savedEvent.starts_at, mode);
    const telegram = await sendTelegramEventLifecycle(mode, savedEvent);

    return noStoreJson({ ok: true, event: savedEvent, playersCount, notificationsCount, telegram, clanId, shared: true, serverMode: 'service-role', clientClanIdAccepted: false });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore salvataggio evento.' }, { status: 500 });
  }
}
