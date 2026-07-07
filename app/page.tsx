'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { kdRatio, winRate } from '@/lib/statistics';

const HOME_QUERY_LIMIT = 6;

type ClanRow = { id: string; name?: string | null; tag?: string | null; logo_url?: string | null; description?: string | null };
type MatchRow = { id: string; result?: string | null; mode?: string | null; match_type?: string | null };
type EventRow = { id: string; title: string; starts_at: string; ends_at?: string | null; event_type?: string | null; location?: string | null; event_plan?: any | null; event_notes?: string | null };
type StatRow = { kills?: number | null; deaths?: number | null; assists?: number | null };
type ScoreRow = { nickname_resolved?: string | null; nickname_raw?: string | null; team_rank?: number | null; mvp_type?: string | null; assists?: number | null; players?: { nickname?: string | null; clan_name?: string | null } | null };

function eventEndTimestamp(event: EventRow) {
  const end = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
  if (Number.isFinite(end)) return end;
  const start = new Date(event.starts_at).getTime();
  return Number.isFinite(start) ? start : 0;
}

function normalizeHomeEvents(remoteRows: EventRow[]) {
  return remoteRows
    .filter((event) => eventEndTimestamp(event) > Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 6);
}

export default function HomePage() {
  const [clan, setClan] = useState<ClanRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const [clanResult, matchResult, statResult, rowResult] = await Promise.all([
        supabase.from('clans').select('*').order('created_at', { ascending: true }).limit(1),
        supabase.from('matches').select('id,result,mode,match_type').order('match_date', { ascending: false }).limit(500),
        supabase.from('match_player_stats').select('kills,deaths,assists').limit(5000),
        supabase.from('match_scoreboard_rows').select('nickname_resolved,nickname_raw,team_rank,mvp_type,assists,players(nickname,clan_name)').limit(5000)
      ]);

      const activeClan = (clanResult.data || [])[0] as ClanRow | undefined;
      setClan({
        ...(activeClan || { id: '', name: 'AK47DX', tag: 'AK47DX' }),
        name: activeClan?.name || 'AK47DX',
        tag: activeClan?.tag || 'AK47DX',
        logo_url: activeClan?.logo_url || '/assets/ak47dx-logo.jpeg',
        description: activeClan?.description || undefined
      });

      if (matchResult.error) setMessage(matchResult.error.message);
      setMatches((matchResult.data || []) as MatchRow[]);
      setStats((statResult.data || []) as StatRow[]);
      setScoreRows((rowResult.data || []) as ScoreRow[]);

      let dbEvents: EventRow[] = [];
      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const response = await fetch('/api/events/list', {
            method: 'GET',
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' }
          });
          const json = await response.json().catch(() => null);
          if (response.ok && json?.ok) dbEvents = (json.events || []) as EventRow[];
        }
      }
      setEvents(normalizeHomeEvents(dbEvents));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore caricamento home.');
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const played = matches.length;
    const wins = matches.filter((m) => String(m.result || '').toUpperCase() === 'WIN').length;
    const losses = matches.filter((m) => String(m.result || '').toUpperCase() === 'LOSE').length;
    const draws = matches.filter((m) => String(m.result || '').toUpperCase() === 'DRAW').length;
    const kills = stats.reduce((sum, row) => sum + Number(row.kills || 0), 0);
    const deaths = stats.reduce((sum, row) => sum + Number(row.deaths || 0), 0);
    const assists = stats.reduce((sum, row) => sum + Number(row.assists || 0), 0);
    return { played, wins, losses, draws, kills, deaths, assists, wr: winRate(wins, played), kd: kdRatio(kills, deaths) };
  }, [matches, stats]);

  const topMvp = useMemo(() => {
    const map = new Map<string, { name: string; clan: string; mvp: number; assists: number }>();
    for (const row of scoreRows) {
      const isMvp = row.team_rank === 1 || !!row.mvp_type;
      if (!isMvp) continue;
      const name = row.players?.nickname || row.nickname_resolved || row.nickname_raw || 'Player';
      const clanName = row.players?.clan_name || clan?.tag || clan?.name || 'AK47DX';
      const key = `${clanName}::${name}`;
      const item = map.get(key) || { name, clan: clanName, mvp: 0, assists: 0 };
      item.mvp += 1;
      item.assists += Number(row.assists || 0);
      map.set(key, item);
    }
    return Array.from(map.values()).sort((a, b) => b.mvp - a.mvp || b.assists - a.assists || a.name.localeCompare(b.name)).slice(0, 5);
  }, [scoreRows, clan?.name, clan?.tag]);

  const clanName = clan?.tag || clan?.name || 'AK47DX';

  return (
    <main className="container wide home-v62">
      <section className="card dashboard-clean-head">
        <div>
          <p className="eyebrow">📊 Dashboard</p>
          <h1>CLAN MANAGER</h1>
          {loading && <div className="notice top-gap">Caricamento dati…</div>}
          {message && <div className="notice top-gap">{message}</div>}
        </div>
      </section>

      <section className="grid grid-4 top-gap home-stat-grid">
        <div className="kpi kpi-glow"><span>Partite giocate</span><strong>{summary.played}</strong></div>
        <div className="kpi kpi-glow"><span>Vinte / Perse / Pareggiate</span><strong>{summary.wins} / {summary.losses} / {summary.draws}</strong></div>
        <div className="kpi kpi-glow"><span>Kill totali</span><strong>{summary.kills}</strong><small>K/D {summary.kd}</small></div>
        <div className="kpi kpi-glow"><span>Assist totali</span><strong>{summary.assists}</strong><small>Win rate {summary.wr}%</small></div>
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>🏆 MVP Top 5</h2>
          <p className="muted">Classifica ordinata per MVP; in caso di pari conta il numero di assist.</p>
          <div className="player-mini-list top-gap">
            {topMvp.length ? topMvp.map((p, index) => (
              <div className="player-mini" key={`${p.clan}-${p.name}`}>
                <div className="avatar-placeholder small-avatar">{index + 1}</div>
                <div style={{ flex: 1 }}><b>{p.name}</b><br /><small className="muted">{p.clan}</small></div>
                <span className="rank-medal medal-gold">🥇 {p.mvp}</span>
                <span className="rank-medal medal-silver">🤝 {p.assists}</span>
              </div>
            )) : <div className="empty-state">Nessun MVP salvato: importa la prima partita per vedere la classifica.</div>}
          </div>
        </div>
        <div className="card">
          <h2>📅 Eventi futuri / Scrim</h2>
          <div className="player-mini-list top-gap">
            {events.length ? events.map((event) => <div className="player-mini" key={event.id}><div className="avatar-placeholder small-avatar">📅</div><div style={{ flex: 1 }}><b>{event.title}</b><br /><small className="muted">{new Date(event.starts_at).toLocaleString('it-IT')} · {event.event_type || 'evento'} {event.location ? `· ${event.location}` : ''}</small></div><a className="btn small secondary" href="/events">Apri</a></div>) : <div className="empty-state">Nessun evento futuro programmato.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}
