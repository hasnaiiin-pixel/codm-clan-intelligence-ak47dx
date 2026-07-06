'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';
import { buildGoogleCalendarUrl } from '@/lib/googleCalendar';

type MatchRound = {
  n: number;
  mode: string;
  map: string;
  scoreType: string;
  target: string;
  players: string;
  reserves: string;
  lobbyOpen: string;
  meetingTime: string;
  startTime: string;
  bans: string;
  status?: string;
  result: string;
  ourScore: string;
  opponentScore: string;
  mvp: string;
};

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
  rounds: MatchRound[];
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
  convocations?: Array<{ id: string; nickname: string; role?: string }> | null;
  convocations_text?: string | null;
  reminder_minutes?: number[] | null;
  telegram_message_template?: string | null;
  event_notes?: string | null;
  event_plan?: MatchPlan | null;
};

type PlayerRow = { id: string; nickname: string; clan_name?: string | null; status?: string | null };
type EventPlayerRow = { event_id: string; player_id: string | null; nickname: string; status?: string | null };

type ModeOption = { value: string; label: string; icon: string; help: string };

const PLAN_MARKER = 'AK_EVENT_PLAN_V6_4::';
const OLD_PLAN_MARKERS = ['AK_EVENT_PLAN_V6_3::', 'AK_EVENT_PLAN_V6_2::'];
const matchStatuses = ['Da giocare', 'Giocata', 'Risultato caricato'];
const resultLabels = ['Vinto', 'Perso', 'Pareggiato'];
const modeOptions: ModeOption[] = [
  { value: 'CED', label: '🎯 Cerca e Distruggi', icon: '🎯', help: 'S&D / round' },
  { value: 'POSTAZIONE', label: '🔥 Postazione', icon: '🔥', help: 'Hardpoint' },
  { value: 'DOMINIO', label: '🏳️ Dominio', icon: '🏳️', help: 'Bandiera e controllo punti' },
  { value: 'CONTROL', label: '🛡️ Control', icon: '🛡️', help: 'Attacco / difesa zone' },
  { value: 'DM DEATH MATCH', label: '⚔️ Death Match', icon: '⚔️', help: 'Death match' },
  { value: 'PRIMA LINEA', label: '🚩 Prima linea', icon: '🚩', help: 'Frontline' },
  { value: 'TDM', label: '💀 TDM', icon: '💀', help: 'Team Deathmatch' },
  { value: 'BR', label: '🪂 Battle Royale', icon: '🪂', help: 'Battle Royale' },
  { value: 'SCRIM', label: '🎮 Scrim libero', icon: '🎮', help: 'Modalità scrim' },
];
const eventTypes = [
  { value: 'scrim', label: '⚔️ Scrim' },
  { value: 'torneo', label: '🏆 Torneo' },
  { value: 'allenamento', label: '🎯 Allenamento' },
  { value: 'ranked', label: '💎 Ranked' },
];
const DEFAULT_TELEGRAM_TEMPLATE = '🎮 <b>AK47DX Evento</b>\n\n<b>{title}</b>\n⏱️ Mancano {minutes} minuti\n🕒 {date}\n📍 {location}\n\n<b>Dettaglio partite:</b>\n{match_details}\n\n<b>Convocati:</b>\n{convocati}\n\n{description}';

function toLocalInputValue(date = new Date(Date.now() + 24 * 60 * 60 * 1000)) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function modeMeta(value: string) { return modeOptions.find((mode) => mode.value === value) || modeOptions[0]; }
function emptyRound(n = 1): MatchRound {
  return { n, mode: 'CED', map: '', scoreType: 'Punteggio round', target: '', players: '', reserves: '', lobbyOpen: '', meetingTime: '', startTime: '', bans: '', status: 'Da giocare', result: '', ourScore: '', opponentScore: '', mvp: '' };
}
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
    rounds: [emptyRound(1)]
  };
}
function sanitizeRound(raw: Partial<MatchRound>, index: number): MatchRound {
  const base = emptyRound(index + 1);
  return { ...base, ...raw, n: index + 1, status: getMatchStatus({ ...base, ...raw, n: index + 1 } as MatchRound) };
}
function readPlan(event: CodmEvent): MatchPlan {
  if (event.event_plan && typeof event.event_plan === 'object') {
    const plan = event.event_plan as MatchPlan;
    return { ...emptyPlan('AK47DX'), ...plan, rounds: (plan.rounds || [emptyRound(1)]).map(sanitizeRound) };
  }
  const note = event.event_notes || '';
  const marker = [PLAN_MARKER, ...OLD_PLAN_MARKERS].find((item) => note.includes(item));
  if (marker) {
    const idx = note.indexOf(marker);
    try {
      const parsed = JSON.parse(note.slice(idx + marker.length));
      return { ...emptyPlan('AK47DX'), ...parsed, rounds: (parsed.rounds || [emptyRound(1)]).map(sanitizeRound) };
    } catch {}
  }
  return emptyPlan('AK47DX');
}
function stripOldPlan(notes: string) {
  const markers = [PLAN_MARKER, ...OLD_PLAN_MARKERS];
  let output = notes || '';
  for (const marker of markers) {
    const idx = output.indexOf(marker);
    if (idx >= 0) output = output.slice(0, idx).trim();
  }
  return output.trim();
}
function planNote(plan: MatchPlan, notes: string) {
  return `${stripOldPlan(notes)}\n\n${PLAN_MARKER}${JSON.stringify(plan)}`.trim();
}
function listFromText(value: string) {
  return String(value || '').split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}
function textFromList(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join(', ');
}
function scoreNumber(value: string) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
function getMatchOutcome(round: MatchRound) {
  const our = scoreNumber(round.ourScore);
  const opponent = scoreNumber(round.opponentScore);
  if (our !== null && opponent !== null) {
    if (our > opponent) return 'Vinto';
    if (our < opponent) return 'Perso';
    return 'Pareggiato';
  }
  if (resultLabels.includes(round.result)) return round.result;
  return '';
}
function getMatchStatus(round: MatchRound) {
  if (round.status && matchStatuses.includes(round.status)) return round.status;
  if (scoreNumber(round.ourScore) !== null && scoreNumber(round.opponentScore) !== null) return 'Risultato caricato';
  if (round.result && resultLabels.includes(round.result)) return 'Risultato caricato';
  if (round.result && matchStatuses.includes(round.result)) return round.result;
  return 'Da giocare';
}
function normalizePlan(plan: MatchPlan) {
  const total = Math.max(1, Number(plan.totalMatches || plan.rounds.length || 1));
  const rounds = plan.rounds.slice(0, total).map((round, index) => {
    const normalized = sanitizeRound(round, index);
    const outcome = getMatchOutcome(normalized);
    return { ...normalized, status: getMatchStatus(normalized), result: outcome };
  });
  return { ...plan, totalMatches: rounds.length, rounds };
}
function buildMatchDetails(plan: MatchPlan) {
  const normalized = normalizePlan(plan);
  return normalized.rounds.map((round) => {
    const mode = modeMeta(round.mode);
    const outcome = getMatchOutcome(round);
    return [
      `<b>Partita ${round.n}</b> ${mode.icon} ${mode.label.replace(/^\S+\s/, '')}`,
      `Mappa: ${round.map || 'Da decidere'}`,
      `Ritrovo: ${round.meetingTime || '-'} · Lobby: ${round.lobbyOpen || normalized.lobbyTime || '-'} · Start: ${round.startTime || '-'}`,
      `Stato: ${getMatchStatus(round)}${outcome ? ` · Esito: ${outcome}` : ''}`,
      round.players ? `Titolari: ${round.players}` : '',
      round.reserves ? `Riserve: ${round.reserves}` : '',
      round.bans ? `🚫 BAN: ${round.bans}` : '',
      round.mvp ? `MVP: ${round.mvp}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
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
  const [telegramTemplate, setTelegramTemplate] = useState(DEFAULT_TELEGRAM_TEMPLATE);
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
  function updateRound(index: number, patch: Partial<MatchRound>) {
    setPlan((current) => ({ ...current, rounds: current.rounds.map((round, i) => i === index ? { ...round, ...patch } : round) }));
  }
  function addRound() {
    setPlan((current) => {
      const n = current.rounds.length + 1;
      return { ...current, totalMatches: n, rounds: [...current.rounds, emptyRound(n)] };
    });
  }
  function removeRound(index: number) {
    setPlan((current) => {
      const next = current.rounds.filter((_, i) => i !== index).map((r, i) => ({ ...r, n: i + 1 }));
      return { ...current, totalMatches: Math.max(1, next.length), rounds: next.length ? next : [emptyRound(1)] };
    });
  }
  function toggleRoundRoster(index: number, field: 'players' | 'reserves', nickname: string) {
    setPlan((current) => ({
      ...current,
      rounds: current.rounds.map((round, i) => {
        if (i !== index) return round;
        const selected = new Set(listFromText(round[field]));
        const otherField = field === 'players' ? 'reserves' : 'players';
        const other = new Set(listFromText(round[otherField]));
        if (selected.has(nickname)) selected.delete(nickname);
        else { selected.add(nickname); other.delete(nickname); }
        return { ...round, [field]: textFromList(Array.from(selected)), [otherField]: textFromList(Array.from(other)) };
      })
    }));
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
    const effectivePlan = normalizePlan(plan);
    const matchDetailsText = buildMatchDetails(effectivePlan).replace(/<[^>]*>/g, '');
    const convocationsText = [
      convocati.length ? `Titolari evento:\n${convocati.map((p) => `• ${p.nickname}`).join('\n')}` : '',
      reserves.length ? `Riserve evento:\n${reserves.map((p) => `• ${p.nickname}`).join('\n')}` : '',
      matchDetailsText ? `Dettaglio partite:\n${matchDetailsText}` : '',
    ].filter(Boolean).join('\n\n');
    const fullDescription = [description, convocationsText].filter(Boolean).join('\n\n');
    const googleUrl = buildGoogleCalendarUrl({ title, description: fullDescription, location, startsAt: startIso, endsAt: endIso });
    const basePayload: Record<string, any> = {
      clan_id: auth.clanId, title, description: fullDescription || null, location: location || null, event_type: eventType,
      starts_at: startIso, ends_at: endIso, telegram_enabled: telegramEnabled, reminder_minutes: parseReminderMinutes(),
      telegram_message_template: telegramTemplate || DEFAULT_TELEGRAM_TEMPLATE, event_notes: planNote(effectivePlan, eventNotes), google_calendar_url: googleUrl,
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
    setMessage('Evento creato con partite ordinate, roster da app, stato automatico e dettaglio Telegram.');
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
  const telegramPreview = useMemo(() => buildMatchDetails(normalizePlan(plan)).replace(/<[^>]*>/g, ''), [plan]);

  function playersFor(event: CodmEvent, status?: string) {
    const rows = eventPlayers.filter((r) => r.event_id === event.id && (!status || r.status === status));
    if (rows.length) return rows.map((r) => r.nickname);
    return (event.convocations || []).filter((r: any) => !status || r.role === status).map((r) => r.nickname);
  }

  return (
    <main className="container wide ak-page-compact events-v64">
      <section className="card ak-section-head">
        <p className="eyebrow">📅 AK47DX Event Center</p>
        <h1>Eventi, calendario e partite CODM</h1>
        <p className="muted">Gli eventi da fare sono in alto. Le partite sono card ordinate: stato separato dall'esito, roster preso dai player registrati, BAN e dettaglio Telegram per ogni partita.</p>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="card top-gap ak-events-first">
        <div className="section-title"><div><h2>Eventi da fare</h2><p className="muted">Prossimi scrim, tornei e allenamenti. Il dettaglio partite rimane leggibile anche con più match.</p></div><button className="btn secondary small" onClick={() => void loadEvents()}>{eventsLoading ? 'Carico...' : 'Aggiorna'}</button></div>
        <div className="event-presentation-list top-gap">{futureEvents.slice(0, 5).map((event) => <EventPresentation key={event.id} event={event} plan={readPlan(event)} starters={playersFor(event, 'titolare')} reserves={playersFor(event, 'riserva')} canWrite={canWrite} onDelete={deleteEvent} />)}{!futureEvents.length && <p className="empty-state">Nessun evento futuro in programma.</p>}</div>
      </section>

      <section className="card top-gap">
        <div className="section-title"><h2>Calendario</h2><input className="input month-input" type="month" value={calendarMonth} onChange={(e) => setCalendarMonth(e.target.value)} /></div>
        <div className="ak-calendar-grid ak-calendar-weekdays">{['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="ak-calendar-grid">{calendarDays.map((day) => <div key={day.key} className={`ak-calendar-day ${day.currentMonth ? '' : 'muted-month'} ${day.events.length ? 'has-event' : ''}`}><strong>{day.date.getDate()}</strong>{day.events.slice(0, 2).map((event) => <span key={event.id}>{event.title}</span>)}{day.events.length > 2 && <em>+{day.events.length - 2}</em>}</div>)}</div>
      </section>

      <section className="top-gap">
        {canWrite ? <div className="card event-create-v64">
          <div className="section-title"><div><h2>Nuovo evento / Editor partite</h2><p className="muted">Aggiungi o togli partite dalla barra sotto. Ogni partita resta una card verticale, larga e lavorabile.</p></div><button className="btn small" type="button" onClick={addRound}>+ Aggiungi partita</button></div>
          <div className="match-count-toolbar top-gap"><span>Partite configurate: <b>{plan.rounds.length}</b></span><button className="btn small secondary" type="button" onClick={() => removeRound(plan.rounds.length - 1)} disabled={plan.rounds.length <= 1}>- Togli ultima partita</button><small>Default 1 partita. Puoi aggiungere, eliminare o compilare singolarmente.</small></div>

          <div className="form top-gap">
            <div className="field"><label>Titolo evento</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="grid grid-4"><div className="field"><label>Inizio</label><input type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div><div className="field"><label>Fine</label><input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div><div className="field"><label>Tipo evento</label><select className="select" value={eventType} onChange={(e) => setEventType(e.target.value)}>{eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div><div className="field"><label>Luogo</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} /></div></div>
            <div className="grid grid-2"><div className="field"><label>Team A</label><input className="input" value={plan.teamAName} onChange={(e) => setPlan((p) => ({ ...p, teamAName: e.target.value }))} /></div><div className="field"><label>Team B</label><input className="input" value={plan.teamBName} onChange={(e) => setPlan((p) => ({ ...p, teamBName: e.target.value }))} /></div></div>
            <div className="grid grid-3"><div className="field"><label>Logo Team A</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => setPlan((p) => ({ ...p, teamALogo: url })))} /><small className="muted">Seleziona file logo dal PC.</small></div><div className="field"><label>Logo Team B</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => setPlan((p) => ({ ...p, teamBLogo: url })))} /><small className="muted">Logo avversario.</small></div><div className="field"><label>Cover presentazione</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => setPlan((p) => ({ ...p, coverImage: url })))} /><small className="muted">Immagine grande evento.</small></div></div>
            <div className="grid grid-4"><div className="field"><label>Tempo lobby generale</label><input className="input" value={plan.lobbyTime} onChange={(e) => setPlan((p) => ({ ...p, lobbyTime: e.target.value }))} placeholder="es. 21:45" /></div><div className="field"><label>Numero stanza</label><input className="input" value={plan.roomNumber} onChange={(e) => setPlan((p) => ({ ...p, roomNumber: e.target.value }))} /></div><div className="field"><label>Link Discord</label><input className="input" value={plan.discordLink} onChange={(e) => setPlan((p) => ({ ...p, discordLink: e.target.value }))} /></div><div className="field"><label>Link lobby</label><input className="input" value={plan.lobbyLink} onChange={(e) => setPlan((p) => ({ ...p, lobbyLink: e.target.value }))} /></div></div>
          </div>

          <div className="round-plan-list top-gap">{plan.rounds.map((round, index) => <MatchRoundEditor key={round.n} round={round} index={index} players={players} updateRound={updateRound} removeRound={removeRound} toggleRoundRoster={toggleRoundRoster} />)}</div>

          <div className="form top-gap">
            <div className="field"><label>Descrizione pubblica</label><textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-2"><div className="field"><label>Reminder minuti</label><input className="input" value={reminderMinutes} onChange={(e) => setReminderMinutes(e.target.value)} /></div><label className="check-line ak-check-card"><input type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} /> Reminder Telegram attivo</label></div>
            <div className="field"><label>Messaggio Telegram</label><textarea className="input" rows={7} value={telegramTemplate} onChange={(e) => setTelegramTemplate(e.target.value)} /><small className="muted">Usa <b>{'{match_details}'}</b> per inviare Partita 1, Partita 2, ecc. con tutti i dettagli.</small></div>
            <details className="notice"><summary>Anteprima dettaglio partite Telegram</summary><pre className="telegram-preview-box">{telegramPreview || 'Nessuna partita compilata.'}</pre></details>
            <div className="grid grid-2"><PlayerPicker title="Titolari evento" players={players} selected={selectedPlayers} toggle={(id) => toggle(setSelectedPlayers, id)} /><PlayerPicker title="Riserve evento" players={players} selected={reservePlayers} toggle={(id) => toggle(setReservePlayers, id)} /></div>
            <div className="field"><label>Note interne</label><textarea className="input" rows={3} value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} /></div>
            <button className="btn" onClick={() => void createEvent()}>Crea evento completo</button>
          </div>
        </div> : <div className="card"><h2>Creazione eventi riservata</h2><p className="muted">Solo Staff, Coach o Owner possono creare eventi.</p></div>}
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
function RoundRosterPicker({ title, players, selected, opposite, onToggle }: { title: string; players: PlayerRow[]; selected: string[]; opposite: string[]; onToggle: (nickname: string) => void }) {
  return <div className="round-roster-box"><label>{title}</label><div className="round-roster-picks">{players.map((player) => { const isSelected = selected.includes(player.nickname); const isOpposite = opposite.includes(player.nickname); return <button key={player.id} type="button" className={`round-roster-chip ${isSelected ? 'active' : ''} ${isOpposite ? 'opposite' : ''}`} onClick={() => onToggle(player.nickname)} title={isOpposite ? 'Selezionando qui verrà rimosso dall’altro gruppo' : player.nickname}>{isSelected ? '✓ ' : ''}{player.nickname}</button>; })}{!players.length && <span className="muted">Nessun player registrato.</span>}</div></div>;
}
function MatchRoundEditor({ round, index, players, updateRound, removeRound, toggleRoundRoster }: { round: MatchRound; index: number; players: PlayerRow[]; updateRound: (index: number, patch: Partial<MatchRound>) => void; removeRound: (index: number) => void; toggleRoundRoster: (index: number, field: 'players' | 'reserves', nickname: string) => void }) {
  const meta = modeMeta(round.mode);
  const starters = listFromText(round.players);
  const reserves = listFromText(round.reserves);
  const outcome = getMatchOutcome(round);
  const status = getMatchStatus(round);
  return <article className="match-card-v64">
    <div className="match-card-head"><div><p className="eyebrow">{meta.icon} {meta.help}</p><h3>Partita {round.n}</h3></div><div className="match-head-actions"><span className={`match-status-pill ${status === 'Risultato caricato' ? 'loaded' : status === 'Giocata' ? 'played' : ''}`}>{status}</span>{outcome && <span className={`match-result-pill ${outcome.toLowerCase()}`}>{outcome}</span>}<button className="btn small secondary" type="button" onClick={() => removeRound(index)}>Elimina</button></div></div>
    <div className="grid grid-4"><div className="field"><label>Tipologia partita</label><select className="select codm-mode-select" value={round.mode} onChange={(e) => updateRound(index, { mode: e.target.value })}>{modeOptions.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></div><div className="field"><label>Mappa</label><input className="input" value={round.map} onChange={(e) => updateRound(index, { map: e.target.value })} placeholder="es. Standoff" /></div><div className="field"><label>Tipo punteggio</label><input className="input" value={round.scoreType} onChange={(e) => updateRound(index, { scoreType: e.target.value })} placeholder="Round / punti / kill" /></div><div className="field"><label>Target</label><input className="input" value={round.target} onChange={(e) => updateRound(index, { target: e.target.value })} placeholder="es. 6 round / 250 punti" /></div></div>
    <div className="grid grid-3 top-gap"><div className="field"><label>Orario ritrovo</label><input className="input" value={round.meetingTime} onChange={(e) => updateRound(index, { meetingTime: e.target.value })} placeholder="21:30" /></div><div className="field"><label>Apertura lobby</label><input className="input" value={round.lobbyOpen} onChange={(e) => updateRound(index, { lobbyOpen: e.target.value })} placeholder="21:45" /></div><div className="field"><label>Orario partita</label><input className="input" value={round.startTime} onChange={(e) => updateRound(index, { startTime: e.target.value })} placeholder="22:00" /></div></div>
    <div className="grid grid-2 top-gap"><RoundRosterPicker title="Formazione titolare da roster app" players={players} selected={starters} opposite={reserves} onToggle={(nickname) => toggleRoundRoster(index, 'players', nickname)} /><RoundRosterPicker title="Riserve da roster app" players={players} selected={reserves} opposite={starters} onToggle={(nickname) => toggleRoundRoster(index, 'reserves', nickname)} /></div>
    <div className="grid grid-4 top-gap"><div className="field"><label>🚫 BAN partita</label><input className="input" value={round.bans} onChange={(e) => updateRound(index, { bans: e.target.value })} placeholder="Armi / perk / scorestreak vietati" /></div><div className="field"><label>Stato partita</label><select className="select" value={status} onChange={(e) => updateRound(index, { status: e.target.value })}>{matchStatuses.map((entry) => <option key={entry}>{entry}</option>)}</select><small className="muted">Esito calcolato dal risultato.</small></div><div className="field"><label>Score {round.n ? 'AK47DX' : 'Team A'}</label><input className="input" value={round.ourScore} onChange={(e) => updateRound(index, { ourScore: e.target.value, status: scoreNumber(e.target.value) !== null && scoreNumber(round.opponentScore) !== null ? 'Risultato caricato' : round.status })} placeholder="Nostro score" /></div><div className="field"><label>Score avversario</label><input className="input" value={round.opponentScore} onChange={(e) => updateRound(index, { opponentScore: e.target.value, status: scoreNumber(round.ourScore) !== null && scoreNumber(e.target.value) !== null ? 'Risultato caricato' : round.status })} placeholder="Score avversario" /></div></div>
    <div className="grid grid-2 top-gap"><div className="notice"><strong>Esito automatico:</strong> {outcome || 'Da calcolare quando inserisci entrambi gli score.'}</div><div className="field"><label>MVP partita</label><input className="input" value={round.mvp} onChange={(e) => updateRound(index, { mvp: e.target.value })} placeholder="MVP" /></div></div>
  </article>;
}
function EventPresentation({ event, plan, starters, reserves, canWrite, onDelete }: { event: CodmEvent; plan: MatchPlan; starters: string[]; reserves: string[]; canWrite: boolean; onDelete: (id: string) => Promise<void> }) {
  const normalizedPlan = normalizePlan(plan);
  const rounds = normalizedPlan.rounds.slice(0, Number(normalizedPlan.totalMatches || normalizedPlan.rounds.length || 1));
  return <article className="event-presentation-card">
    {normalizedPlan.coverImage && <img className="event-cover-image" src={normalizedPlan.coverImage} alt={`Cover ${event.title}`} />}
    <div className="event-versus"><TeamLogo name={normalizedPlan.teamAName} logo={normalizedPlan.teamALogo} /><div className="vs-block"><span>VS</span><strong>{new Date(event.starts_at).toLocaleString('it-IT')}</strong><small>{normalizedPlan.lobbyTime ? `Lobby ${normalizedPlan.lobbyTime}` : event.location || 'CODM'}</small></div><TeamLogo name={normalizedPlan.teamBName} logo={normalizedPlan.teamBLogo} /></div>
    <div className="event-meta-grid"><span>🎮 Partite: <b>{rounds.length}</b></span><span>🏠 Stanza: <b>{normalizedPlan.roomNumber || '-'}</b></span><span>💬 Discord: <b>{normalizedPlan.discordLink ? 'presente' : '-'}</b></span><span>🔗 Lobby: <b>{normalizedPlan.lobbyLink ? 'presente' : '-'}</b></span></div>
    <div className="round-timeline event-rounds-detail">{rounds.map((round) => { const meta = modeMeta(round.mode); const outcome = getMatchOutcome(round); const status = getMatchStatus(round); return <div key={round.n} className="round-pill"><b>#{round.n}</b><span>{meta.icon} {meta.label.replace(/^\S+\s/, '')}</span><small>{round.map || 'Mappa da decidere'} · {round.scoreType}</small><small>Ritrovo {round.meetingTime || '-'} · Lobby {round.lobbyOpen || normalizedPlan.lobbyTime || '-'} · Start {round.startTime || '-'}</small>{round.bans && <small className="ban-line">🚫 BAN: {round.bans}</small>}<small>Stato: {status}{outcome ? ` · Esito: ${outcome}` : ''}{round.ourScore || round.opponentScore ? ` · Score ${round.ourScore || '-'}-${round.opponentScore || '-'}` : ''}{round.mvp ? ` · MVP ${round.mvp}` : ''}</small>{round.players && <small>Titolari: {round.players}</small>}{round.reserves && <small>Riserve: {round.reserves}</small>}<a className="btn small secondary" href={`/import/match?event=${event.id}&round=${round.n}`}>Importa risultato</a></div>; })}</div>
    <div className="grid grid-2 top-gap"><div className="notice"><b>Titolari evento</b><br />{starters.length ? starters.join(', ') : 'Da scegliere'}</div><div className="notice"><b>Riserve evento</b><br />{reserves.length ? reserves.join(', ') : 'Da scegliere'}</div></div>{canWrite && <button className="btn danger secondary top-gap" onClick={() => void onDelete(event.id)}>Cancella evento</button>}
  </article>;
}
function TeamLogo({ name, logo }: { name: string; logo?: string }) {
  return <div className="team-logo-card">{logo ? <img src={logo} alt={name} /> : <div className="team-logo-placeholder">{name.slice(0, 2).toUpperCase()}</div>}<strong>{name}</strong></div>;
}
