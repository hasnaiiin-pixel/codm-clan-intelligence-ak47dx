import { createCodmUuid, getCodmDeviceId } from '../pwa/codmDeviceId';

const LOCAL_EVENTS_KEY = 'codm_pwa_events';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nowIso() {
  return new Date().toISOString();
}

function readLocalEvents() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function writeLocalEvents(events) {
  localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent('codm:events-local-updated', { detail: { events } }));
}

function upsertLocalEvent(event) {
  const events = readLocalEvents();
  const key = event.local_id || event.id || event.client_id;
  const index = events.findIndex((item) => (item.local_id || item.id || item.client_id) === key);

  if (index >= 0) {
    events[index] = { ...events[index], ...event };
  } else {
    events.unshift(event);
  }

  writeLocalEvents(events);
  return event;
}

function buildLocalEvent(event) {
  const localId = event.local_id || (typeof event.id === 'string' && event.id.startsWith('local-') ? event.id : null) || `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  return {
    ...event,
    client_id: event.client_id || localId,
    local_id: localId,
    device_id: event.device_id || getCodmDeviceId(),
    sync_status: event.sync_status || 'pending',
    created_at: event.created_at || nowIso(),
    updated_at: nowIso()
  };
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function toSupabaseEventPayload(event) {
  const localEvent = buildLocalEvent(event);

  const payload = {
    ...localEvent,
    local_id: localEvent.local_id,
    device_id: localEvent.device_id,
    sync_status: 'synced',
    sync_error: null,
    updated_at: nowIso()
  };

  // Fix definitivo: se id è local-ak47dx o qualunque valore non UUID, NON inviarlo a Supabase.
  // Supabase/Postgres deve generare id uuid con gen_random_uuid().
  if (!payload.id || !UUID_RE.test(String(payload.id))) {
    delete payload.id;
  }

  // Normalizzazione campi data più comuni, senza obbligare nomi specifici del progetto.
  ['date', 'event_date', 'start_at', 'end_at', 'created_at', 'updated_at'].forEach((key) => {
    if (key in payload) payload[key] = normalizeDate(payload[key]);
  });

  // Questi campi sono solo UI/locali e non devono andare al DB se non esistono.
  delete payload.client_id;
  delete payload._localOnly;
  delete payload._uiState;
  delete payload.temp_id;

  return payload;
}

export async function saveCodmEventPwa({ supabase, event, tableName = 'events' }) {
  const localEvent = buildLocalEvent(event);

  upsertLocalEvent({
    ...localEvent,
    sync_status: 'pending',
    sync_error: null,
    updated_at: nowIso()
  });

  if (!supabase || typeof supabase.from !== 'function' || !navigator.onLine) {
    return { synced: false, localEvent, reason: 'offline_or_supabase_missing' };
  }

  const payload = toSupabaseEventPayload(localEvent);
  const { data, error } = await supabase
    .from(tableName)
    .insert(payload)
    .select()
    .single();

  if (error) {
    upsertLocalEvent({
      ...localEvent,
      sync_status: 'error',
      sync_error: error.message,
      updated_at: nowIso()
    });
    return { synced: false, localEvent, error };
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
  if (!supabase || typeof supabase.from !== 'function' || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const events = readLocalEvents();
  const pending = events.filter((event) => event.sync_status === 'pending' || event.sync_status === 'error');
  let synced = 0;
  let failed = 0;

  for (const event of pending) {
    const payload = toSupabaseEventPayload(event);
    const { data, error } = await supabase
      .from(tableName)
      .upsert(payload, { onConflict: 'local_id' })
      .select()
      .single();

    if (error) {
      failed += 1;
      upsertLocalEvent({ ...event, sync_status: 'error', sync_error: error.message, updated_at: nowIso() });
    } else {
      synced += 1;
      upsertLocalEvent({ ...event, ...data, local_id: event.local_id, sync_status: 'synced', sync_error: null, updated_at: nowIso() });
    }
  }

  return { synced, failed };
}

export function getLocalCodmEvents() {
  return readLocalEvents();
}
