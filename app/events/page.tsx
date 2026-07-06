'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';
import { buildGoogleCalendarUrl } from '@/lib/googleCalendar';

type MatchPlan = {
  teamAName: string;
  teamBName: string;
  teamALogo: string;
  teamBLogo: string;
  coverImage: string;
  totalMatches: number;
  lobbyTime: string;
  discordLink: string;
  lobbyLink: string;
  roomNumber: string;
  rounds: Array<{ n: number; mode: string; map: string; scoreType: string; target: string; players: string; reserves: string; lobbyOpen: string; meetingTime: string; startTime: string; bans: string; result: string; ourScore: string; opponentScore: string; mvp: string }>;
};

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
  created_at: string;
  convocations?: Array<{ id: string; nickname: string }> | null;
  convocations_text?: string | null;
  reminder_minutes?: number[] | null;
  telegram_message_template?: string | null;
  event_notes?: string | null;
  event_plan?: MatchPlan | null;
};

type PlayerRow = { id: string; nickname: string; clan_name?: string | null; status?: string | null };
type EventPlayerRow = { event_id: string; player_id: string | null; nickname: string; status?: string | null };

const modes = ['CED', 'POSTAZIONE', 'DOMINIO', 'DM DEATH MATCH', 'PRIMA LINEA', 'TDM', 'BR'];

function toLocalInputValue(date = new Date(Date.now() + 24 * 60 * 60 * 1000)) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function emptyPlan(clanName = 'AK47DX'): MatchPlan {
  return {
    teamAName: clanName,
    teamBName: 'Clan avversario',
    teamALogo: '/assets/ak47dx-logo.jpeg',
    teamBLogo: '',
    coverImage: '',
    totalMatches: 1,
    lobbyTime: '',
    discordLink: '',
    lobbyLink: '',
    roomNumber: '',
    rounds: [{ n: 1, mode: 'CED', map: '', scoreType: 'Punteggio round', target: '', players: '', reserves: '', lobbyOpen: '', meetingTime: '', startTime: '', bans: '', result: 'Da giocare', ourScore: '', opponentScore: '', mvp: '' }]
  };
}
function readPlan(event: CodmEvent): MatchPlan {
  if (event.event_plan && typeof event.event_plan === 'object') return event.event_plan as MatchPlan;
  const note = event.event_notes || '';
  const marker = 'AK_EVENT_PLAN_V6_2::';
  const idx = note.indexOf(marker);
  if (idx >= 0) {
    try { return JSON.parse(note.slice(idx + marker.length)); } catch {}
  }
  return emptyPlan('AK47DX');
}
function planNote(plan: MatchPlan, notes: string) {
  return `${notes || ''}\n\nAK_EVENT_PLAN_V6_2::${JSON.stringify(plan)}`.trim();
}

export default function EventsPage() {
  const auth = useCodmAuth();
  const [events, setEvents] = useState<CodmEvent[]>([]);
  const [eventPlayers, setEventPlayers] = useState<EventPlayerRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [message, setMessage] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(monthKey(new Date()));
  const [eventFilter, setEventFilter] = useState<'future' | 'all' | 'past'>('future');
  const [eventsLoading, setEventsLoading] = useState(false);

  const [title, setTitle] = useState('Scrim AK47DX vs Clan avversario');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('CODM room');
  const [eventType, setEventType] = useState('scrim');
  const [startsAt, setStartsAt] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(new Date(Date.now() + 3 * 60 * 60 * 1000)));
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState('120,60,30,10');
  const [telegramTemplate, setTelegramTemplate] = useState('🎮 <b>AK47DX Reminder</b>\n\n<b>{title}</b>\n⏱️ Mancano {minutes} minuti\n🕒 {date}\n📍 {location}\n\n{description}\n\n<b>Convocati:</b>\n{convocati}');
  const [eventNotes, setEventNotes] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [reservePlayers, setReservePlayers] = useState<string[]>([]);
  const [plan, setPlan] = useState<MatchPlan>(() => emptyPlan('AK47DX'));

  const canWrite = auth.canWrite;

  useEffect(() => { void loadEvents(); void loadPlayers(); }, []);
  useEffect(() => { if (auth.clanName) setPlan((p) => ({ ...p, teamAName: p.teamAName === 'AK47DX' ? auth.clanName : p.teamAName })); }, [auth.clanName]);

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('id,nickname,clan_name,status').order('nickname');
    setPlayers((data || []) as PlayerRow[]);
  }
  async function loadEvents() {
    setEventsLoading(true); setMessage('');
    const { data, error } = await supabase.from('codm_events').select('*').order('starts_at', { ascending: true }).limit(300);
    if (error) { setMessage(`Errore caricamento eventi: ${error.message}`); setEventsLoading(false); return; }
    const rows = (data || []) as CodmEvent[];
    setEvents(rows);
    const ids = rows.map((e) => e.id).filter(Boolean);
    if (ids.length) {
      const { data: epRows } = await supabase.from('codm_event_players').select('event_id,player_id,nickname,status').in('event_id', ids);
      setEventPlayers((epRows || []) as EventPlayerRow[]);
    } else setEventPlayers([]);
    setEventsLoading(false);
  }

  function parseReminderMinutes() {
    const values = reminderMinutes.split(',').map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0 && n <= 10080);
    return Array.from(new Set(values.length ? values : [120, 10])).sort((a, b) => b - a);
  }
  function toggle(setter: (fn: (current: string[]) => string[]) => void, id: string) {
    setter((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }
  function updateRound(index: number, patch: Partial<MatchPlan['rounds'][number]>) {
    setPlan((current) => ({ ...current, rounds: current.rounds.map((round, i) => i === index ? { ...round, ...patch } : round) }));
  }
  function addRound() {
    setPlan((current) => {
      const n = current.rounds.length + 1;
      const round = { n, mode: 'CED', map: '', scoreType: 'Punteggio round', target: '', players: '', reserves: '', lobbyOpen: '', meetingTime: '', startTime: '', bans: '', result: 'Da giocare', ourScore: '', opponentScore: '', mvp: '' };
      return { ...current, totalMatches: n, rounds: [...current.rounds, round] };
    });
  }
  function removeRound(index: number) {
    setPlan((current) => {
      const next = current.rounds.filter((_, i) => i !== index).map((r, i) => ({ ...r, n: i + 1 }));
      return { ...current, totalMatches: Math.max(1, next.length), rounds: next.length ? next : [{ n: 1, mode: 'CED', map: '', scoreType: 'Punteggio round', target: '', players: '', reserves: '', lobbyOpen: '', meetingTime: '', startTime: '', bans: '', result: 'Da giocare', ourScore: '', opponentScore: '', mvp: '' }] };
    });
  }
  function readImage(file: File | null | undefined, cb: (url: string) => void) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  async function createEvent() {
    if (!auth.clanId) return setMessage('Clan non trovato. Crea prima il clan o controlla Supabase.');
    if (!canWrite) return setMessage('Solo owner, coach o staff possono creare eventi.');
    const startIso = new Date(startsAt).toISOString();
    const endIso = endsAt ? new Date(endsAt).toISOString() : null;
    const convocati = players.filter((p) => selectedPlayers.includes(p.id));
    const reserves = players.filter((p) => reservePlayers.includes(p.id));
    const convocationsText = [
      convocati.length ? `Titolari:\n${convocati.map((p) => `• ${p.nickname}`).join('\n')}` : '',
      reserves.length ? `Riserve:\n${reserves.map((p) => `• ${p.nickname}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
    const effectivePlan = { ...plan, totalMatches: Number(plan.totalMatches || 1), rounds: plan.rounds.slice(0, Number(plan.totalMatches || 1)) };
    const fullDescription = [description, convocationsText].filter(Boolean).join('\n\n');
    const googleUrl = buildGoogleCalendarUrl({ title, description: fullDescription, location, startsAt: startIso, endsAt: endIso });
    const basePayload: Record<string, any> = {
      clan_id: auth.clanId, title, description: fullDescription || null, location: location || null, event_type: eventType,
      starts_at: startIso, ends_at: endIso, telegram_enabled: telegramEnabled, reminder_minutes: parseReminderMinutes(),
      telegram_message_template: telegramTemplate || null, event_notes: planNote(effectivePlan, eventNotes), google_calendar_url: googleUrl,
      convocations: convocati.map((p) => ({ id: p.id, nickname: p.nickname, role: 'titolare' })).concat(reserves.map((p) => ({ id: p.id, nickname: p.nickname, role: 'riserva' }))),
      convocations_text: convocationsText || null, created_by: auth.user?.id || null,
    };
    const payloadWithPlan = { ...basePayload, event_plan: effectivePlan };
    let { data: created, error } = await supabase.from('codm_events').insert(payloadWithPlan).select('id').single();
    if (error && /event_plan|column/i.test(error.message)) {
      const retry = await supabase.from('codm_events').insert(basePayload).select('id').single();
      created = retry.data; error = retry.error;
    }
    if (error) return setMessage(error.message);
    if (created?.id) {
      const rows = [
        ...convocati.map((p) => ({ event_id: created!.id, clan_id: auth.clanId, player_id: p.id, nickname: p.nickname, status: 'titolare' })),
        ...reserves.map((p) => ({ event_id: created!.id, clan_id: auth.clanId, player_id: p.id, nickname: p.nickname, status: 'riserva' })),
      ];
      if (rows.length) await supabase.from('codm_event_players').insert(rows);
    }
    setMessage('Evento creato con presentazione match, round, titolari e riserve.');
    setSelectedPlayers([]); setReservePlayers([]);
    await loadEvents();
  }
  async function deleteEvent(id: string) {
    if (!canWrite) return setMessage('Solo staff/coach/owner possono cancellare eventi.');
    if (!confirm('Cancellare evento e convocazioni?')) return;
    const { error } = await supabase.from('codm_events').delete().eq('id', id);
    if (error) return setMessage(error.message);
    setMessage('Evento cancellato.'); await loadEvents();
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CodmEvent[]>();
    for (const event of events) { const key = new Date(event.starts_at).toISOString().slice(0, 10); map.set(key, [...(map.get(key) || []), event]); }
    return map;
  }, [events]);
  const calendarDays = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); const key = day.toISOString().slice(0, 10); return { date: day, key, currentMonth: day.getMonth() === month - 1, events: eventsByDay.get(key) || [] }; });
  }, [calendarMonth, eventsByDay]);
  const futureEvents = useMemo(() => events.filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 60 * 60 * 1000), [events]);
  const pastEvents = useMemo(() => events.filter((e) => new Date(e.starts_at).getTime() < Date.now() - 60 * 60 * 1000).reverse(), [events]);
  const visibleEvents = eventFilter === 'all' ? events : eventFilter === 'past' ? pastEvents : futureEvents;
  function playersFor(event: CodmEvent, status?: string) {
    const rows = eventPlayers.filter((r) => r.event_id === event.id && (!status || r.status === status));
    if (rows.length) return rows.map((r) => r.nickname);
    return (event.convocations || []).filter((r: any) => !status || r.role === status).map((r) => r.nickname);
  }

  return (
    <main className="container wide ak-page-compact events-v62">
      <section className="card ak-section-head">
        <p className="eyebrow">📅 AK47DX Event Center</p>
        <h1>Calendario, presentazione partita e convocazioni</h1>
        <p className="muted">Crea eventi in stile presentazione: Team A vs Team B, loghi clan, round da giocare, modalità, punteggio, titolari, riserve, Discord, lobby e numero stanza.</p>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="grid grid-2 top-gap ak-event-layout">
        <div className="card">
          <div className="section-title"><h2>Vista calendario</h2><input className="input month-input" type="month" value={calendarMonth} onChange={(e) => setCalendarMonth(e.target.value)} /></div>
          <div className="ak-calendar-grid ak-calendar-weekdays">{['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="ak-calendar-grid">{calendarDays.map((day) => <div key={day.key} className={`ak-calendar-day ${day.currentMonth ? '' : 'muted-month'} ${day.events.length ? 'has-event' : ''}`}><strong>{day.date.getDate()}</strong>{day.events.slice(0, 2).map((event) => <span key={event.id}>{event.title}</span>)}</div>)}</div>
        </div>

        {canWrite ? <div className="card event-create-v62">
          <h2>Crea presentazione match</h2>
          <div className="form top-gap">
            <div className="field"><label>Titolo evento</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="grid grid-2"><div className="field"><label>Inizio</label><input type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div><div className="field"><label>Fine</label><input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div></div>
            <div className="grid grid-2"><div className="field"><label>Team A</label><input className="input" value={plan.teamAName} onChange={(e) => setPlan((p) => ({ ...p, teamAName: e.target.value }))} /></div><div className="field"><label>Team B</label><input className="input" value={plan.teamBName} onChange={(e) => setPlan((p) => ({ ...p, teamBName: e.target.value }))} /></div></div>
            <div className="grid grid-3"><div className="field"><label>Logo Team A</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => setPlan((p) => ({ ...p, teamALogo: url })))} /><small className="muted">Seleziona file logo.</small></div><div className="field"><label>Logo Team B</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => setPlan((p) => ({ ...p, teamBLogo: url })))} /><small className="muted">Seleziona file logo avversario.</small></div><div className="field"><label>Cover presentazione</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => setPlan((p) => ({ ...p, coverImage: url })))} /><small className="muted">Immagine grande evento.</small></div></div>
            <div className="grid grid-4"><div className="field"><label>Partite da giocare</label><div className="cal-buttons"><button className="btn small secondary" type="button" onClick={addRound}>+ Aggiungi</button><button className="btn small secondary" type="button" onClick={() => removeRound(plan.rounds.length - 1)}>- Togli</button></div><small className="muted">Default 1. Puoi aggiungere/togliere.</small></div><div className="field"><label>Tempo lobby generale</label><input className="input" value={plan.lobbyTime} onChange={(e) => setPlan((p) => ({ ...p, lobbyTime: e.target.value }))} placeholder="es. 21:45" /></div><div className="field"><label>Numero stanza</label><input className="input" value={plan.roomNumber} onChange={(e) => setPlan((p) => ({ ...p, roomNumber: e.target.value }))} /></div><div className="field"><label>Tipo evento</label><select className="select" value={eventType} onChange={(e) => setEventType(e.target.value)}><option value="scrim">Scrim</option><option value="torneo">Torneo</option><option value="allenamento">Allenamento</option></select></div></div>
            <div className="grid grid-2"><div className="field"><label>Link Discord</label><input className="input" value={plan.discordLink} onChange={(e) => setPlan((p) => ({ ...p, discordLink: e.target.value }))} /></div><div className="field"><label>Link lobby</label><input className="input" value={plan.lobbyLink} onChange={(e) => setPlan((p) => ({ ...p, lobbyLink: e.target.value }))} /></div></div>
            <div className="round-plan-list">{plan.rounds.map((round, index) => <div className="round-plan-card event-round-editor" key={round.n}><div className="section-title"><strong>Partita {round.n}</strong><button className="btn small secondary" type="button" onClick={() => removeRound(index)}>Togli</button></div><div className="grid grid-4"><select className="select" value={round.mode} onChange={(e) => updateRound(index, { mode: e.target.value })}>{modes.map((m) => <option key={m} value={m}>{m}</option>)}</select><input className="input" value={round.map} onChange={(e) => updateRound(index, { map: e.target.value })} placeholder="Mappa" /><input className="input" value={round.scoreType} onChange={(e) => updateRound(index, { scoreType: e.target.value })} placeholder="Punteggio/Kill" /><input className="input" value={round.target} onChange={(e) => updateRound(index, { target: e.target.value })} placeholder="Target es. 6 round / 250 punti" /></div><div className="grid grid-3 top-gap"><input className="input" value={round.meetingTime} onChange={(e) => updateRound(index, { meetingTime: e.target.value })} placeholder="Ritrovo es. 21:30" /><input className="input" value={round.lobbyOpen} onChange={(e) => updateRound(index, { lobbyOpen: e.target.value })} placeholder="Lobby aperta es. 21:45" /><input className="input" value={round.startTime} onChange={(e) => updateRound(index, { startTime: e.target.value })} placeholder="Orario partita" /></div><div className="grid grid-2 top-gap"><textarea className="input" rows={2} value={round.players} onChange={(e) => updateRound(index, { players: e.target.value })} placeholder="Formazione titolare per questa partita" /><textarea className="input" rows={2} value={round.reserves} onChange={(e) => updateRound(index, { reserves: e.target.value })} placeholder="Riserve per questa partita" /></div><div className="grid grid-4 top-gap"><input className="input" value={round.bans} onChange={(e) => updateRound(index, { bans: e.target.value })} placeholder="BAN: armi/perk vietati" /><select className="select" value={round.result} onChange={(e) => updateRound(index, { result: e.target.value })}><option>Da giocare</option><option>Vinto</option><option>Perso</option><option>Pareggiato</option></select><input className="input" value={round.ourScore} onChange={(e) => updateRound(index, { ourScore: e.target.value })} placeholder="Nostro score" /><input className="input" value={round.mvp} onChange={(e) => updateRound(index, { mvp: e.target.value })} placeholder="MVP partita" /></div></div>)}</div>
            <div className="field"><label>Descrizione pubblica</label><textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-2"><div className="field"><label>Luogo</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} /></div><div className="field"><label>Reminder minuti</label><input className="input" value={reminderMinutes} onChange={(e) => setReminderMinutes(e.target.value)} /></div></div>
            <label className="check-line ak-check-card"><input type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} /> Reminder Telegram attivo</label>
            <div className="field"><label>Messaggio Telegram</label><textarea className="input" rows={4} value={telegramTemplate} onChange={(e) => setTelegramTemplate(e.target.value)} /></div>
            <div className="grid grid-2"><PlayerPicker title="Titolari" players={players} selected={selectedPlayers} toggle={(id) => toggle(setSelectedPlayers, id)} /><PlayerPicker title="Riserve" players={players} selected={reservePlayers} toggle={(id) => toggle(setReservePlayers, id)} /></div>
            <div className="field"><label>Note interne</label><textarea className="input" rows={3} value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} /></div>
            <button className="btn" onClick={() => void createEvent()}>Crea evento completo</button>
          </div>
        </div> : <div className="card"><h2>Creazione eventi riservata</h2><p className="muted">Solo Staff, Coach o Owner possono creare eventi.</p></div>}
      </section>

      <section className="card top-gap">
        <div className="section-title"><h2>Prossimi eventi in programma</h2><button className="btn secondary small" onClick={() => void loadEvents()}>{eventsLoading ? 'Carico...' : 'Aggiorna'}</button></div>
        <div className="event-presentation-list top-gap">{futureEvents.slice(0, 5).map((event) => <EventPresentation key={event.id} event={event} plan={readPlan(event)} starters={playersFor(event, 'titolare')} reserves={playersFor(event, 'riserva')} canWrite={canWrite} onDelete={deleteEvent} />)}{!futureEvents.length && <p className="empty-state">Nessun evento futuro in programma.</p>}</div>
      </section>

      <section className="card top-gap">
        <div className="section-title"><div><h2>Archivio eventi</h2><p className="muted">Caricati: {events.length} • futuri: {futureEvents.length} • passati: {pastEvents.length}</p></div><select className="select compact-select" value={eventFilter} onChange={(e) => setEventFilter(e.target.value as any)}><option value="future">Solo futuri</option><option value="all">Tutti</option><option value="past">Passati</option></select></div>
        <div className="ak-events-list top-gap">{visibleEvents.map((event) => { const googleUrl = event.google_calendar_url || buildGoogleCalendarUrl({ title: event.title, description: event.description, location: event.location, startsAt: event.starts_at, endsAt: event.ends_at }); return <article key={event.id} className="ak-event-card"><div><div className="eyebrow">{event.event_type || 'evento'}</div><h3>{event.title}</h3><p className="muted">{new Date(event.starts_at).toLocaleString('it-IT')} {event.location ? `• ${event.location}` : ''}</p>{event.description && <p>{event.description}</p>}</div><div className="ak-event-actions"><a href={googleUrl} target="_blank" rel="noreferrer" className="btn secondary">Google Calendar</a>{canWrite && <button className="btn danger secondary" onClick={() => void deleteEvent(event.id)}>Cancella</button>}</div></article>; })}{!visibleEvents.length && <p className="empty-state">Nessun evento da mostrare.</p>}</div>
      </section>
    </main>
  );
}

function PlayerPicker({ title, players, selected, toggle }: { title: string; players: PlayerRow[]; selected: string[]; toggle: (id: string) => void }) {
  return <div className="field"><label>{title}</label><div className="ak-player-pick-list">{players.map((player) => <label key={player.id} className="ak-player-pick"><input type="checkbox" checked={selected.includes(player.id)} onChange={() => toggle(player.id)} /><span>{player.nickname}</span><small>{player.clan_name || 'AK47DX'}</small></label>)}{!players.length && <p className="muted">Nessun player nel roster.</p>}</div></div>;
}
function EventPresentation({ event, plan, starters, reserves, canWrite, onDelete }: { event: CodmEvent; plan: MatchPlan; starters: string[]; reserves: string[]; canWrite: boolean; onDelete: (id: string) => Promise<void> }) {
  const rounds = plan.rounds.slice(0, Number(plan.totalMatches || plan.rounds.length || 1));
  return <article className="event-presentation-card">
    {plan.coverImage && <img className="event-cover-image" src={plan.coverImage} alt={`Cover ${event.title}`} />}
    <div className="event-versus"><TeamLogo name={plan.teamAName} logo={plan.teamALogo} /><div className="vs-block"><span>VS</span><strong>{new Date(event.starts_at).toLocaleString('it-IT')}</strong><small>{plan.lobbyTime ? `Lobby ${plan.lobbyTime}` : event.location || 'CODM'}</small></div><TeamLogo name={plan.teamBName} logo={plan.teamBLogo} /></div>
    <div className="event-meta-grid"><span>🎮 Partite: <b>{rounds.length}</b></span><span>🏠 Stanza: <b>{plan.roomNumber || '-'}</b></span><span>💬 Discord: <b>{plan.discordLink ? 'presente' : '-'}</b></span><span>🔗 Lobby: <b>{plan.lobbyLink ? 'presente' : '-'}</b></span></div>
    <div className="round-timeline event-rounds-detail">{rounds.map((round) => <div key={round.n} className="round-pill"><b>#{round.n}</b><span>{round.mode}</span><small>{round.map || 'Mappa da decidere'} · {round.scoreType}</small><small>Ritrovo {round.meetingTime || '-'} · Lobby {round.lobbyOpen || '-'} · Start {round.startTime || '-'}</small>{round.bans && <small className="ban-line">🚫 BAN: {round.bans}</small>}<small>{round.result || 'Da giocare'} {round.ourScore ? `· Score ${round.ourScore}` : ''} {round.mvp ? `· MVP ${round.mvp}` : ''}</small>{round.players && <small>Titolari: {round.players}</small>}{round.reserves && <small>Riserve: {round.reserves}</small>}<a className="btn small secondary" href={`/import/match?event=${event.id}&round=${round.n}`}>Importa risultato</a></div>)}</div>
    <div className="grid grid-2 top-gap"><div className="notice"><b>Titolari evento</b><br />{starters.length ? starters.join(', ') : 'Da scegliere'}</div><div className="notice"><b>Riserve evento</b><br />{reserves.length ? reserves.join(', ') : 'Da scegliere'}</div></div>{canWrite && <button className="btn danger secondary top-gap" onClick={() => void onDelete(event.id)}>Cancella evento</button>}
  </article>;
}
function TeamLogo({ name, logo }: { name: string; logo?: string }) {
  return <div className="team-logo-card">{logo ? <img src={logo} alt={name} /> : <div className="team-logo-placeholder">{name.slice(0, 2).toUpperCase()}</div>}<strong>{name}</strong></div>;
}
