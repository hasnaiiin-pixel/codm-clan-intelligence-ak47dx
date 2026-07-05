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
  telegram_enabled: boolean | null;
  reminder_2h_sent_at: string | null;
  reminder_10m_sent_at: string | null;
  created_at: string;
};

function toLocalInputValue(date = new Date(Date.now() + 24 * 60 * 60 * 1000)) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function EventsPage() {
  const auth = useCodmAuth();
  const [events, setEvents] = useState<CodmEvent[]>([]);
  const [title, setTitle] = useState('Scrim / Allenamento AK47DX');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('CODM');
  const [eventType, setEventType] = useState('scrim');
  const [startsAt, setStartsAt] = useState(toLocalInputValue());
  const [endsAt, setEndsAt] = useState(toLocalInputValue(new Date(Date.now() + 25 * 60 * 60 * 1000)));
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const canWrite = auth.canWrite;

  async function loadEvents() {
    const { data, error } = await supabase
      .from('codm_events')
      .select('*')
      .order('starts_at', { ascending: true })
      .limit(100);
    if (error) {
      setMessage(error.message);
      return;
    }
    setEvents((data || []) as CodmEvent[]);
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  async function createEvent() {
    if (!auth.clanId) return setMessage('Clan non trovato. Fai onboarding o controlla Supabase.');
    if (!canWrite) return setMessage('Solo owner, coach o staff possono creare eventi.');
    const startIso = new Date(startsAt).toISOString();
    const endIso = endsAt ? new Date(endsAt).toISOString() : null;
    const googleUrl = buildGoogleCalendarUrl({ title, description, location, startsAt: startIso, endsAt: endIso });
    const { error } = await supabase.from('codm_events').insert({
      clan_id: auth.clanId,
      title,
      description: description || null,
      location: location || null,
      event_type: eventType,
      starts_at: startIso,
      ends_at: endIso,
      telegram_enabled: telegramEnabled,
      google_calendar_url: googleUrl,
      created_by: auth.user?.id || null,
    });
    if (error) return setMessage(error.message);
    setMessage('Evento creato. Se Telegram è configurato, partiranno reminder 2 ore e 10 minuti prima.');
    await loadEvents();
  }

  const upcoming = useMemo(() => events.filter((event) => new Date(event.starts_at).getTime() >= Date.now() - 60 * 60 * 1000), [events]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-cyan-400/20 bg-slate-900/80 p-6">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">AK47DX calendario</div>
          <h1 className="mt-2 text-3xl font-black">Eventi, scrim e promemoria</h1>
          <p className="mt-2 text-slate-300">Crea eventi clan, aggiungili a Google Calendar e abilita reminder Telegram automatici 2 ore e 10 minuti prima.</p>
          {message && <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">{message}</div>}
        </div>

        {canWrite && (
          <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Titolo<input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" /></label>
            <label className="grid gap-2 text-sm font-bold">Tipo<select value={eventType} onChange={(e) => setEventType(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"><option value="scrim">Scrim</option><option value="allenamento">Allenamento</option><option value="torneo">Torneo</option><option value="riunione">Riunione clan</option></select></label>
            <label className="grid gap-2 text-sm font-bold">Inizio<input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" /></label>
            <label className="grid gap-2 text-sm font-bold">Fine<input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" /></label>
            <label className="grid gap-2 text-sm font-bold">Luogo<input value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" /></label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold"><input type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} /> Reminder Telegram 2h + 10m</label>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">Descrizione<textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" /></label>
            <button onClick={() => void createEvent()} className="rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 md:col-span-2">Crea evento</button>
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-2xl font-black">Prossimi eventi</h2>
          <div className="mt-4 grid gap-3">
            {upcoming.length === 0 && <p className="rounded-2xl border border-white/10 p-4 text-slate-300">Nessun evento programmato.</p>}
            {upcoming.map((event) => {
              const googleUrl = event.google_calendar_url || buildGoogleCalendarUrl({ title: event.title, description: event.description, location: event.location, startsAt: event.starts_at, endsAt: event.ends_at });
              return (
                <article key={event.id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">{event.event_type || 'evento'}</div>
                      <h3 className="mt-1 text-xl font-black">{event.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">{new Date(event.starts_at).toLocaleString('it-IT')} {event.location ? `• ${event.location}` : ''}</p>
                      {event.description && <p className="mt-3 text-slate-300">{event.description}</p>}
                    </div>
                    <a href={googleUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-400 px-4 py-2 font-black text-slate-950">Aggiungi a Google Calendar</a>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">Telegram: {event.telegram_enabled ? 'attivo' : 'off'} • 2h: {event.reminder_2h_sent_at ? 'inviato' : 'pending'} • 10m: {event.reminder_10m_sent_at ? 'inviato' : 'pending'}</div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
