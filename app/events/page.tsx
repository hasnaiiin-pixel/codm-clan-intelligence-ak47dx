'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';
import { buildGoogleCalendarUrl } from '@/lib/googleCalendar';

type CodmEvent = {
  id: string;
  clan_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  event_type: string | null;
  google_calendar_url: string | null;
  telegram_enabled: boolean | null;
  reminder_2h_sent_at: string | null;
  reminder_10m_sent_at: string | null;
  created_at: string;
  convocations?: Array<{ id: string; nickname: string }> | null;
  convocations_text?: string | null;
  reminder_minutes?: number[] | null;
  sent_reminders?: Record<string, string> | null;
  telegram_message_template?: string | null;
  event_notes?: string | null;
};

type PlayerRow = { id: string; nickname: string; clan_name?: string | null; status?: string | null };

type EventPlayerRow = { event_id: string; player_id: string | null; nickname: string };

function toLocalInputValue(date = new Date(Date.now() + 24 * 60 * 60 * 1000)) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function EventsPage() {
  const auth = useCodmAuth();
  const [events, setEvents] = useState<CodmEvent[]>([]);
  const [eventPlayers, setEventPlayers] = useState<EventPlayerRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [title, setTitle] = useState('Scrim / Allenamento AK47DX');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('CODM room');
  const [eventType, setEventType] = useState('scrim');
  const [startsAt, setStartsAt] = useState(toLocalInputValue(new Date(Date.now() + 12 * 60 * 1000)));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(new Date(Date.now() + 72 * 60 * 1000)));
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState('120,10');
  const [telegramTemplate, setTelegramTemplate] = useState('🎮 <b>AK47DX Reminder</b>\n\n<b>{title}</b>\n⏱️ Mancano {minutes} minuti\n🕒 {date}\n📍 {location}\n\n{description}\n\n<b>Convocati:</b>\n{convocati}');
  const [eventNotes, setEventNotes] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(monthKey(new Date()));
  const [eventFilter, setEventFilter] = useState<'future' | 'all' | 'past'>('future');
  const [eventsLoading, setEventsLoading] = useState(false);
  const canWrite = auth.canWrite;

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('id,nickname,clan_name,status').order('nickname');
    setPlayers((data || []) as PlayerRow[]);
  }

  async function loadEvents() {
    setEventsLoading(true);
    setMessage('');
    const { data, error } = await supabase
      .from('codm_events')
      .select('*')
      .order('starts_at', { ascending: true })
      .limit(300);
    if (error) {
      setMessage(`Errore caricamento eventi: ${error.message}`);
      setEventsLoading(false);
      return;
    }
    const rows = (data || []) as CodmEvent[];
    setEvents(rows);
    try { localStorage.setItem('codm_events_last_cache', JSON.stringify(rows)); } catch {}

    const eventIds = rows.map((event: any) => event.id).filter(Boolean);
    if (eventIds.length) {
      const { data: epRows, error: epError } = await supabase
        .from('codm_event_players')
        .select('event_id,player_id,nickname')
        .in('event_id', eventIds);
      if (epError) setMessage(`Eventi caricati, ma convocati non letti: ${epError.message}`);
      setEventPlayers((epRows || []) as EventPlayerRow[]);
    } else {
      setEventPlayers([]);
    }
    setEventsLoading(false);
  }

  useEffect(() => {
    void loadEvents();
    void loadPlayers();
  }, []);

  function togglePlayer(id: string) {
    setSelectedPlayers((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  function parseReminderMinutes() {
    const values = reminderMinutes
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 10080);
    return Array.from(new Set(values.length ? values : [120, 10])).sort((a, b) => b - a);
  }

  async function deleteEvent(eventId: string) {
    if (!canWrite) return setMessage('Solo staff/coach/owner possono cancellare eventi.');
    if (!confirm('Cancellare questo evento e le convocazioni collegate?')) return;
    const { error } = await supabase.from('codm_events').delete().eq('id', eventId);
    if (error) return setMessage(error.message);
    setMessage('Evento cancellato.');
    await loadEvents();
  }

  async function createEvent() {
    if (!auth.clanId) return setMessage('Clan non trovato. Crea prima il clan/onboarding o controlla Supabase.');
    if (!canWrite) return setMessage('Solo owner, coach o staff possono creare eventi.');
    const startIso = new Date(startsAt).toISOString();
    const endIso = endsAt ? new Date(endsAt).toISOString() : null;
    const selected = players.filter((player) => selectedPlayers.includes(player.id));
    const convocationsText = selected.length ? selected.map((p) => `• ${p.nickname}`).join('\n') : '';
    const fullDescription = [description, eventNotes ? `\nNote interne:\n${eventNotes}` : '', convocationsText ? `\nConvocati:\n${convocationsText}` : ''].filter(Boolean).join('\n');
    const googleUrl = buildGoogleCalendarUrl({ title, description: fullDescription, location, startsAt: startIso, endsAt: endIso });

    const { data: created, error } = await supabase.from('codm_events').insert({
      clan_id: auth.clanId,
      title,
      description: fullDescription || null,
      location: location || null,
      event_type: eventType,
      starts_at: startIso,
      ends_at: endIso,
      telegram_enabled: telegramEnabled,
      reminder_minutes: parseReminderMinutes(),
      telegram_message_template: telegramTemplate || null,
      event_notes: eventNotes || null,
      google_calendar_url: googleUrl,
      convocations: selected.map((p) => ({ id: p.id, nickname: p.nickname })),
      convocations_text: convocationsText || null,
      created_by: auth.user?.id || null,
    }).select('id').single();
    if (error) return setMessage(error.message);

    if (created?.id && selected.length) {
      const rows = selected.map((player) => ({
        event_id: created.id,
        clan_id: auth.clanId,
        player_id: player.id,
        nickname: player.nickname,
        status: 'convocato'
      }));
      const { error: epError } = await supabase.from('codm_event_players').insert(rows);
      if (epError) setMessage(`Evento creato, ma errore convocati: ${epError.message}`);
      else setMessage('Evento creato con lista convocati. Telegram userà il promemoria automatico se configurato.');
    } else {
      setMessage('Evento creato. Se Telegram è configurato, partiranno reminder 2 ore e 10 minuti prima.');
    }
    setSelectedPlayers([]);
    await loadEvents();
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CodmEvent[]>();
    for (const event of events) {
      const key = new Date(event.starts_at).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) || []), event]);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const start = new Date(first);
    const mondayOffset = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { date: day, key, currentMonth: day.getMonth() === month - 1, events: eventsByDay.get(key) || [] };
    });
  }, [calendarMonth, eventsByDay]);

  const futureEvents = useMemo(() => events.filter((event) => new Date(event.starts_at).getTime() >= Date.now() - 60 * 60 * 1000), [events]);
  const pastEvents = useMemo(() => events.filter((event) => new Date(event.starts_at).getTime() < Date.now() - 60 * 60 * 1000).reverse(), [events]);
  const visibleEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    if (eventFilter === 'past') return pastEvents;
    return futureEvents;
  }, [events, eventFilter, futureEvents, pastEvents]);

  function convocatiForEvent(event: CodmEvent) {
    const fromJoin = eventPlayers.filter((row) => row.event_id === event.id).map((row) => row.nickname);
    if (fromJoin.length) return fromJoin;
    if (Array.isArray(event.convocations)) return event.convocations.map((row) => row.nickname);
    return [];
  }

  return (
    <main className="container wide ak-page-compact">
      <section className="card ak-section-head">
        <p className="eyebrow">📅 AK47DX calendario</p>
        <h1>Eventi, scrim e convocazioni</h1>
        <p className="muted">Crea eventi, evidenzia le date nel calendario, seleziona i player convocati, aggiungi a Google Calendar e invia promemoria Telegram.</p>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="grid grid-2 top-gap ak-event-layout">
        <div className="card">
          <div className="section-title"><h2>Vista calendario</h2><input className="input month-input" type="month" value={calendarMonth} onChange={(e) => setCalendarMonth(e.target.value)} /></div>
          <div className="ak-calendar-grid ak-calendar-weekdays">{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="ak-calendar-grid">
            {calendarDays.map((day) => (
              <div key={day.key} className={`ak-calendar-day ${day.currentMonth ? '' : 'muted-month'} ${day.events.length ? 'has-event' : ''}`}>
                <strong>{day.date.getDate()}</strong>
                {day.events.slice(0, 2).map((event) => <span key={event.id}>{event.title}</span>)}
                {day.events.length > 2 && <em>+{day.events.length - 2}</em>}
              </div>
            ))}
          </div>
        </div>

        {canWrite ? (
          <div className="card">
            <h2>Crea evento</h2>
            <div className="form top-gap">
              <div className="field"><label>Titolo</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></div>
              <div className="grid grid-2"><div className="field"><label>Tipo</label><select value={eventType} onChange={(e) => setEventType(e.target.value)} className="select"><option value="scrim">Scrim</option><option value="allenamento">Allenamento</option><option value="torneo">Torneo</option><option value="riunione">Riunione clan</option></select></div><div className="field"><label>Luogo/link</label><input value={location} onChange={(e) => setLocation(e.target.value)} className="input" /></div></div>
              <div className="grid grid-2"><div className="field"><label>Inizio</label><input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="input" /></div><div className="field"><label>Fine</label><input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="input" /></div></div>
              <label className="check-line ak-check-card"><input type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} /> Reminder Telegram attivo</label>
              <div className="field"><label>Reminder minuti prima</label><input value={reminderMinutes} onChange={(e) => setReminderMinutes(e.target.value)} className="input" placeholder="120,10 oppure 60,30,10" /><small className="muted">Puoi mettere più reminder separati da virgola: esempio 120,60,10.</small></div>
              <div className="field"><label>Descrizione</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={4} /></div>
              <div className="field"><label>Note evento</label><textarea value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} className="input" rows={3} placeholder="Note interne, regole, mappe da provare, presenza obbligatoria..." /></div>
              <div className="field"><label>Messaggio Telegram personalizzato</label><textarea value={telegramTemplate} onChange={(e) => setTelegramTemplate(e.target.value)} className="input" rows={5} /><small className="muted">Variabili disponibili: {'{title}'}, {'{minutes}'}, {'{date}'}, {'{location}'}, {'{description}'}, {'{convocati}'}.</small></div>
              <div className="field"><label>Convocati</label><div className="ak-player-pick-list">{players.length === 0 && <p className="muted">Nessun player nel roster.</p>}{players.map((player) => <label key={player.id} className="ak-player-pick"><input type="checkbox" checked={selectedPlayers.includes(player.id)} onChange={() => togglePlayer(player.id)} /> <span>{player.nickname}</span><small>{player.clan_name || auth.clanName}</small></label>)}</div></div>
              <button onClick={() => void createEvent()} className="btn">Crea evento e convocazioni</button>
            </div>
          </div>
        ) : (
          <div className="card"><h2>Creazione eventi riservata</h2><p className="muted">Solo Staff, Coach o Owner possono creare eventi e convocazioni.</p></div>
        )}
      </section>

      <section className="card top-gap">
        <div className="section-title">
          <div>
            <h2>Eventi</h2>
            <p className="muted">Caricati: {events.length} • futuri: {futureEvents.length} • passati: {pastEvents.length}</p>
          </div>
          <div className="ak-event-toolbar">
            <select className="select compact-select" value={eventFilter} onChange={(e) => setEventFilter(e.target.value as any)}>
              <option value="future">Solo futuri</option>
              <option value="all">Tutti</option>
              <option value="past">Passati</option>
            </select>
            <button className="btn secondary" onClick={() => void loadEvents()}>{eventsLoading ? 'Carico...' : 'Ricarica'}</button>
          </div>
        </div>
        <div className="ak-events-list top-gap">
          {visibleEvents.length === 0 && <p className="empty-state">Nessun evento da mostrare. Se hai appena creato un evento, premi Ricarica; se non compare, riesegui lo SQL V4.8 su Supabase.</p>}
          {visibleEvents.map((event) => {
            const googleUrl = event.google_calendar_url || buildGoogleCalendarUrl({ title: event.title, description: event.description, location: event.location, startsAt: event.starts_at, endsAt: event.ends_at });
            const convocati = convocatiForEvent(event);
            return (
              <article key={event.id} className="ak-event-card">
                <div>
                  <div className="eyebrow">{event.event_type || 'evento'}</div>
                  <h3>{event.title}</h3>
                  <p className="muted">{new Date(event.starts_at).toLocaleString('it-IT')} {event.location ? `• ${event.location}` : ''}</p>
                  {event.description && <p>{event.description}</p>}
                  {!!convocati.length && <p className="ak-convocati"><strong>Convocati:</strong> {convocati.join(', ')}</p>}
                  <p className="muted small-text">Telegram: {event.telegram_enabled ? 'attivo' : 'off'} • reminder: {(event.reminder_minutes || [120, 10]).join(', ')} min • ID {event.id.slice(0, 8)}</p>
                </div>
                <div className="ak-event-actions"><a href={googleUrl} target="_blank" rel="noreferrer" className="btn secondary">Google Calendar</a>{canWrite && <button className="btn danger secondary" onClick={() => void deleteEvent(event.id)}>Cancella</button>}</div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
