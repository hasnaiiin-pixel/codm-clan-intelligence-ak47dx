'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { kdRatio, winRate } from '@/lib/statistics';

type ClanRow = { id: string; name?: string | null; tag?: string | null; logo_url?: string | null; description?: string | null };
type MatchRow = { id: string; result?: string | null; mode?: string | null; match_type?: string | null };
type EventRow = { id: string; title: string; starts_at: string; event_type?: string | null; location?: string | null; event_plan?: any | null; event_notes?: string | null };
type StatRow = { kills?: number | null; deaths?: number | null; assists?: number | null };
type ScoreRow = { nickname_resolved?: string | null; nickname_raw?: string | null; team_rank?: number | null; mvp_type?: string | null; assists?: number | null; players?: { nickname?: string | null; clan_name?: string | null } | null };

export default function HomePage() {
  const [clan, setClan] = useState<ClanRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setMessage('');
    const { data: clanData } = await supabase.from('clans').select('*').order('created_at', { ascending: true }).limit(1);
    const activeClan = (clanData || [])[0] as ClanRow | undefined;
    let localProfile: any = null;
    try { localProfile = JSON.parse(window.localStorage.getItem('codm_clan_hq_profile_v2_0') || 'null'); } catch {}
    setClan({ ...(activeClan || { id: '', name: 'AK47DX', tag: 'AK47DX' }), name: localProfile?.clan_name || activeClan?.name || 'AK47DX', tag: localProfile?.tag || activeClan?.tag || 'AK47DX', logo_url: localProfile?.logo_url || activeClan?.logo_url || '/assets/ak47dx-logo.jpeg', description: localProfile?.motto || activeClan?.description || undefined });

    const { data: matchData, error: matchError } = await supabase.from('matches').select('id,result,mode,match_type').order('match_date', { ascending: false }).limit(500);
    const { data: statData } = await supabase.from('match_player_stats').select('kills,deaths,assists').limit(5000);
    const { data: rowData } = await supabase.from('match_scoreboard_rows').select('nickname_resolved,nickname_raw,team_rank,mvp_type,assists,players(nickname,clan_name)').limit(5000);
    const { data: eventData } = await supabase.from('codm_events').select('id,title,starts_at,event_type,location,event_plan,event_notes').gte('starts_at', new Date(Date.now() - 60*60*1000).toISOString()).order('starts_at', { ascending: true }).limit(6);
    if (matchError) setMessage(matchError.message);
    setMatches((matchData || []) as MatchRow[]);
    setStats((statData || []) as StatRow[]);
    setScoreRows((rowData || []) as ScoreRow[]);
    setEvents((eventData || []) as EventRow[]);
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
      <section className="card gaming-panel home-clan-hero">
        <div className="home-clan-left">
          <p className="eyebrow">🐺 Clan Manager</p>
          <h1>{clanName}</h1>
          <p className="clan-motto">{clan?.description || 'Dashboard ufficiale clan: risultati, statistiche, eventi, convocazioni e storico partite.'}</p>
          {message && <div className="notice top-gap">{message}</div>}
          <div className="hero-actions">
            <a className="btn import-main-btn" href="/import/match">⚡ Importa risultato</a>
            <a className="btn secondary" href="/events">📅 Eventi e scrim</a>
            <a className="btn secondary" href="/matches">🎮 Consulta partite</a>
          </div>
        </div>
        <div className="home-clan-logo-card">
          <img src={clan?.logo_url || '/assets/ak47dx-logo.jpeg'} alt={`Logo ${clanName}`} />
          <span>Clan HQ</span>
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
            {topMvp.map((p, index) => (
              <div className="player-mini" key={`${p.clan}-${p.name}`}>
                <div className="avatar-placeholder small-avatar">{index + 1}</div>
                <div style={{ flex: 1 }}><b>{p.name}</b><br /><small className="muted">{p.clan}</small></div>
                <span className="rank-medal medal-gold">🥇 {p.mvp}</span>
                <span className="rank-medal medal-silver">🤝 {p.assists}</span>
              </div>
            ))}
            {!topMvp.length && <div className="empty-state">Nessun MVP salvato: importa la prima partita per vedere la classifica.</div>}
          </div>
        </div>
        <div className="card">
          <h2>📅 Eventi futuri / Scrim</h2>
          <div className="player-mini-list top-gap">
            {events.map((event) => <div className="player-mini" key={event.id}><div className="avatar-placeholder small-avatar">📅</div><div style={{ flex: 1 }}><b>{event.title}</b><br /><small className="muted">{new Date(event.starts_at).toLocaleString('it-IT')} · {event.event_type || 'evento'} {event.location ? `· ${event.location}` : ''}</small></div><a className="btn small secondary" href="/events">Apri</a></div>)}
            {!events.length && <div className="empty-state">Nessun evento futuro programmato.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}
