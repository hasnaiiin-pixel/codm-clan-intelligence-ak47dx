import { getCodmDeviceId } from '../pwa/codmDeviceId';
import { createCodmLocalId, isLocalCodmId, isValidCodmUuid, removeInvalidUuidFieldsForSupabase } from './codmUuid';

const LOCAL_EVENTS_KEY = 'codm_pwa_events';
const EVENT_UUID_FIELDS = [
  'id',
  'event_id',
  'clan_id',
  'team_id',
  'match_id',
  'player_id',
  'user_id',
  'owner_id',
  'created_by',
  'updated_by',
  'captain_id',
  'mvp_id',
  'winner_mvp_id',
  'loser_mvp_id',
  'profile_id'
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function firstValue(source, keys, fallback = null) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
  }
  return fallback;
}

export function readLocalCodmEvents() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export function writeLocalCodmEvents(events) {
  localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent('codm:events-local-updated', { detail: { events } }));
}

function upsertLocalEvent(event) {
  const events = readLocalCodmEvents();
  const key = event.local_id || event.client_id || event.id;
  const index = events.findIndex((item) => (item.local_id || item.client_id || item.id) === key);

  if (index >= 0) events[index] = { ...events[index], ...event };
  else events.unshift(event);

  writeLocalCodmEvents(events);
  return event;
}

export function normalizeCodmEventForLocal(event) {
  const localId =
    event.local_id ||
    (isLocalCodmId(event.id) ? event.id : null) ||
    event.client_id ||
    createCodmLocalId();

  const cleanUuidId = isValidCodmUuid(event.id) ? event.id : undefined;

  return {
    ...event,
    ...(cleanUuidId ? { id: cleanUuidId } : {}),
    client_id: event.client_id || localId,
    local_id: localId,
    device_id: event.device_id || getCodmDeviceId(),
    sync_status: event.sync_status || 'pending',
    sync_error: event.sync_error || null,
    created_at: event.created_at || nowIso(),
    updated_at: nowIso()
  };
}

export function toSupabaseCodmEvent(event) {
  const localEvent = normalizeCodmEventForLocal(event);
  const { safe, localUuidRefs } = removeInvalidUuidFieldsForSupabase(localEvent, EVENT_UUID_FIELDS);

  const payload = {
    ...(isValidCodmUuid(safe.id) ? { id: safe.id } : {}),
    local_id: safe.local_id,
    device_id: safe.device_id,
    title: firstValue(safe, ['title', 'name', 'event_name', 'nome', 'nome_evento'], 'Evento CODM'),
    event_type: firstValue(safe, ['event_type', 'type', 'tipo'], 'event'),
    status: firstValue(safe, ['status', 'stato'], 'scheduled'),
    event_date: normalizeDate(firstValue(safe, ['event_date', 'date', 'data', 'match_date'])),
    start_at: normalizeDate(firstValue(safe, ['start_at', 'startTime', 'orario', 'match_time', 'game_time'])),
    lobby_open_at: normalizeDate(firstValue(safe, ['lobby_open_at', 'lobbyTime', 'orario_lobby', 'lobby_open_time'])),
    description: firstValue(safe, ['description', 'desc', 'note', 'notes'], null),
    cover_url: firstValue(safe, ['cover_url', 'cover', 'coverImage', 'cover_image'], null),
    payload: {
      ...safe,
      id: isValidCodmUuid(safe.id) ? safe.id : undefined,
      original_local_id: safe.local_id
    },
    local_uuid_refs: localUuidRefs,
    sync_status: 'synced',
    sync_error: null,
    updated_at: nowIso()
  };

  return payload;
}

export async function saveCodmEvent({ supabase, event, tableName = 'events' }) {
  const localEvent = normalizeCodmEventForLocal(event);

  upsertLocalEvent({
    ...localEvent,
    sync_status: 'pending',
    sync_error: null,
    updated_at: nowIso()
  });

  if (!supabase || typeof supabase.from !== 'function') {
    return { synced: false, localEvent, reason: 'supabase_missing' };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: false, localEvent, reason: 'offline' };
  }

  const payload = toSupabaseCodmEvent(localEvent);
  const { data, error } = await supabase
    .from(tableName)
    .upsert(payload, { onConflict: 'local_id' })
    .select()
    .single();

  if (error) {
    const failedEvent = {
      ...localEvent,
      sync_status: 'error',
      sync_error: error.message,
      updated_at: nowIso()
    };
    upsertLocalEvent(failedEvent);
    return { synced: false, localEvent: failedEvent, error };
  }

  const syncedEvent = {
    ...localEvent,
    ...data,
    local_id: localEvent.local_id,
    device_id: localEvent.device_id,
    sync_status: 'synced',
    sync_error: null,
    updated_at: nowIso()
  };

  upsertLocalEvent(syncedEvent);
  return { synced: true, localEvent: syncedEvent, data };
}

export async function retryPendingCodmEvents({ supabase, tableName = 'events' }) {
  if (!supabase || typeof supabase.from !== 'function') return { synced: 0, failed: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { synced: 0, failed: 0 };

  const pending = readLocalCodmEvents().filter((event) => event.sync_status === 'pending' || event.sync_status === 'error');
  let synced = 0;
  let failed = 0;

  for (const event of pending) {
    const result = await saveCodmEvent({ supabase, event, tableName });
    if (result.synced) synced += 1;
    else failed += 1;
  }

  return { synced, failed };
}
