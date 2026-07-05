'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { kdRatio, winRate } from '@/lib/statistics';
import type { Match, MatchPlayerStat, Player } from '@/lib/types';

type StatRow = MatchPlayerStat & {
  players?: { nickname: string; clan_name?: string | null } | null;
  matches?: { mode: string; result: string; map_name: string | null; match_date: string } | null;
};

type ScoreboardRow = {
  id: string;
  match_id: string;
  player_id: string | null;
  nickname_raw: string | null;
  nickname_resolved: string | null;
  team_color: 'blue' | 'red';
  team_side: 'ALLY' | 'ENEMY';
  team_rank: number | null;
  kills: number;
  deaths: number;
  assists: number;
  mvp_type: string | null;
  players?: { nickname: string; clan_name?: string | null } | null;
};

type PieSlice = { label: string; value: number; percent: number };

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function pieGradient(slices: PieSlice[]) {
  const colors = ['var(--ok)', 'var(--accent)', 'var(--accent2)', 'var(--warning)', '#a78bfa', '#22d3ee', '#f97316'];
  let start = 0;
  const parts = slices.map((slice, index) => {
    const end = start + slice.percent;
    const part = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return part;
  });
  if (!parts.length || start === 0) return 'linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.03))';
  if (start < 100) parts.push(`rgba(255,255,255,.08) ${start}% 100%`);
  return `conic-gradient(${parts.join(', ')})`;
}

function groupPie(rows: Array<{ key: string }>, fallback = 'Sconosciuto'): PieSlice[] {
  const grouped = new Map<string, number>();
  for (const row of rows) grouped.set(row.key || fallback, (grouped.get(row.key || fallback) || 0) + 1);
  const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value, percent: pct(value, total) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
}

export default function AnalyticsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [scoreboardRows, setScoreboardRows] = useState<ScoreboardRow[]>([]);
  const [filterClan, setFilterClan] = useState('ALL');
  const [filterMode, setFilterMode] = useState('ALL');
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: matchData, error: matchError } = await supabase.from('matches').select('*').order('match_date', { ascending: false });
    const { data: playerData } = await supabase.from('players').select('*').order('nickname');
    const { data: statData } = await supabase.from('match_player_stats').select('*, players(nickname,clan_name), matches(mode,result,map_name,match_date)').order('created_at', { ascending: false });
    const { data: boardData } = await supabase.from('match_scoreboard_rows').select('*, players(nickname,clan_name)').order('team_rank', { ascending: true });
    if (matchError) setMessage(matchError.message);
    setMatches((matchData || []) as Match[]);
    setPlayers((playerData || []) as Player[]);
    setStats((statData || []) as StatRow[]);
    setScoreboardRows((boardData || []) as ScoreboardRow[]);
  }

  const clanOptions = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => set.add(p.clan_name || 'Senza clan'));
    stats.forEach((s) => set.add(s.players?.clan_name || 'Senza clan'));
    scoreboardRows.forEach((r) => set.add(r.players?.clan_name || 'Senza clan'));
    return ['ALL', ...Array.from(set).sort()];
  }, [players, stats, scoreboardRows]);

  const modeOptions = useMemo(() => ['ALL', ...Array.from(new Set(matches.map((m) => m.mode))).sort()], [matches]);

  const filteredMatches = useMemo(() => matches.filter((m) => filterMode === 'ALL' || m.mode === filterMode), [matches, filterMode]);

  const filteredRows = useMemo(() => scoreboardRows.filter((r) => {
    const clan = r.players?.clan_name || 'Senza clan';
    if (filterClan !== 'ALL' && clan !== filterClan) return false;
    if (filterMode === 'ALL') return true;
    const match = matches.find((m) => m.id === r.match_id);
    return match?.mode === filterMode;
  }), [scoreboardRows, matches, filterClan, filterMode]);

  const filteredStats = useMemo(() => stats.filter((s) => {
    const clan = s.players?.clan_name || 'Senza clan';
    if (filterClan !== 'ALL' && clan !== filterClan) return false;
    if (filterMode === 'ALL') return true;
    return s.matches?.mode === filterMode;
  }), [stats, filterClan, filterMode]);

  const summary = useMemo(() => {
    const wins = filteredMatches.filter((m) => m.result === 'WIN').length;
    const losses = filteredMatches.filter((m) => m.result === 'LOSE').length;
    const draw = filteredMatches.filter((m) => m.result === 'DRAW').length;
    const kills = filteredRows.reduce((sum, r) => sum + (r.kills || 0), 0) || filteredStats.reduce((sum, s) => sum + (s.kills || 0), 0);
    const deaths = filteredRows.reduce((sum, r) => sum + (r.deaths || 0), 0) || filteredStats.reduce((sum, s) => sum + (s.deaths || 0), 0);
    const assists = filteredRows.reduce((sum, r) => sum + (r.assists || 0), 0) || filteredStats.reduce((sum, s) => sum + (s.assists || 0), 0);
    return { wins, losses, draw, total: filteredMatches.length, kills, deaths, assists, kd: kdRatio(kills, deaths), wr: winRate(wins, filteredMatches.length) };
  }, [filteredMatches, filteredRows, filteredStats]);

  const resultPie = useMemo(() => {
    const total = summary.total;
    return [
      { label: 'Vittorie', value: summary.wins, percent: pct(summary.wins, total) },
      { label: 'Sconfitte', value: summary.losses, percent: pct(summary.losses, total) },
      { label: 'Pareggi', value: summary.draw, percent: pct(summary.draw, total) },
    ].filter((x) => x.value > 0);
  }, [summary]);

  const modePie = useMemo(() => groupPie(filteredMatches.map((m) => ({ key: m.mode }))), [filteredMatches]);
  const mapPie = useMemo(() => groupPie(filteredMatches.map((m) => ({ key: m.map_name || 'Mappa non letta' }))), [filteredMatches]);
  const rankPie = useMemo(() => groupPie(filteredRows.map((r) => ({ key: r.team_rank ? `${r.team_rank}° posizione` : 'Non classificato' }))), [filteredRows]);
  const mvpPie = useMemo(() => groupPie(filteredRows.filter((r) => r.mvp_type).map((r) => ({ key: r.nickname_resolved || r.nickname_raw || r.players?.nickname || 'MVP non letto' }))), [filteredRows]);

  const clanSummary = useMemo(() => {
    const grouped = new Map<string, { clan: string; players: Set<string>; kills: number; deaths: number; assists: number; mvp: number; rows: number; gold: number; silver: number; bronze: number; rankSum: number; rankCount: number }>();
    for (const row of filteredRows) {
      const clan = row.players?.clan_name || 'Senza clan';
      const item = grouped.get(clan) || { clan, players: new Set<string>(), kills: 0, deaths: 0, assists: 0, mvp: 0, rows: 0, gold: 0, silver: 0, bronze: 0, rankSum: 0, rankCount: 0 };
      item.players.add(row.player_id || row.nickname_resolved || row.nickname_raw || row.id);
      item.kills += row.kills || 0;
      item.deaths += row.deaths || 0;
      item.assists += row.assists || 0;
      item.rows += 1;
      if (row.team_rank === 1) item.gold += 1;
      if (row.team_rank === 2) item.silver += 1;
      if (row.team_rank === 3) item.bronze += 1;
      if (row.team_rank) { item.rankSum += row.team_rank; item.rankCount += 1; }
      if (row.mvp_type) item.mvp += 1;
      grouped.set(clan, item);
    }
    return Array.from(grouped.values()).map((x) => ({ ...x, playerCount: x.players.size, kd: kdRatio(x.kills, x.deaths), avgRank: x.rankCount ? (x.rankSum / x.rankCount).toFixed(1) : '-' })).sort((a, b) => b.kills - a.kills);
  }, [filteredRows]);

  const topPlayers = useMemo(() => {
    const grouped = new Map<string, { name: string; clan: string; kills: number; deaths: number; assists: number; mvp: number; rows: number; rankSum: number; rankCount: number; gold: number; silver: number; bronze: number }>();
    for (const row of filteredRows) {
      const key = row.player_id || row.nickname_resolved || row.nickname_raw || row.id;
      const item = grouped.get(key) || { name: row.nickname_resolved || row.nickname_raw || row.players?.nickname || 'Player non letto', clan: row.players?.clan_name || 'Senza clan', kills: 0, deaths: 0, assists: 0, mvp: 0, rows: 0, rankSum: 0, rankCount: 0, gold: 0, silver: 0, bronze: 0 };
      item.kills += row.kills || 0;
      item.deaths += row.deaths || 0;
      item.assists += row.assists || 0;
      item.rows += 1;
      if (row.team_rank) { item.rankSum += row.team_rank; item.rankCount += 1; }
      if (row.team_rank === 1) item.gold += 1;
      if (row.team_rank === 2) item.silver += 1;
      if (row.team_rank === 3) item.bronze += 1;
      if (row.mvp_type) item.mvp += 1;
      grouped.set(key, item);
    }
    return Array.from(grouped.values()).map((x) => ({ ...x, kd: kdRatio(x.kills, x.deaths), avgRank: x.rankCount ? (x.rankSum / x.rankCount).toFixed(1) : '-' })).sort((a, b) => b.kills - a.kills).slice(0, 12);
  }, [filteredRows]);

  function PieCard({ title, slices }: { title: string; slices: PieSlice[] }) {
    return (
      <div className="card stat-pie-card">
        <h2>{title}</h2>
        <div className="big-pie" style={{ background: pieGradient(slices) }} />
        <div className="pie-legend">
          {slices.map((s) => <span key={s.label}><b>{s.percent}%</b> {s.label} <small>({s.value})</small></span>)}
          {!slices.length && <span className="muted">Nessun dato.</span>}
        </div>
      </div>
    );
  }

  return (
    <main className="container wide">
      <section className="card hero-compact gaming-panel">
        <p className="eyebrow">📊 Analytics 2.0</p>
        <h1>Statistiche clan e player</h1>
        <p className="muted">Grafici a torta, classifiche e filtri per clan, modalità, MVP, mappa, posizione e medaglie Oro/Argento/Bronzo/Legno/Olimpico. I player manuali restano visibili nelle statistiche anche senza profilo registrato.</p>
        {message && <div className="notice">{message}</div>}
        <div className="grid grid-2 top-gap">
          <div className="field"><label>Clan appartenenza</label><select className="select" value={filterClan} onChange={(e) => setFilterClan(e.target.value)}>{clanOptions.map((c) => <option key={c} value={c}>{c === 'ALL' ? 'Tutti i clan' : c}</option>)}</select></div>
          <div className="field"><label>Modalità</label><select className="select" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>{modeOptions.map((m) => <option key={m} value={m}>{m === 'ALL' ? 'Tutte le modalità' : m}</option>)}</select></div>
        </div>
      </section>

      <section className="grid grid-4 top-gap">
        <div className="kpi kpi-glow"><span>Partite</span><strong>{summary.total}</strong></div>
        <div className="kpi kpi-glow"><span>Win rate</span><strong>{summary.wr}%</strong></div>
        <div className="kpi kpi-glow"><span>K/D</span><strong>{summary.kd}</strong></div>
        <div className="kpi kpi-glow"><span>Kill / Death / Assist</span><strong>{summary.kills}/{summary.deaths}/{summary.assists}</strong></div>
      </section>

      <section className="grid grid-4 top-gap">
        <PieCard title="Vittorie / sconfitte" slices={resultPie} />
        <PieCard title="Tipologia modalità" slices={modePie} />
        <PieCard title="Mappe giocate" slices={mapPie} />
        <PieCard title="Ranking 1–5" slices={rankPie} />
      </section>

      <section className="grid grid-2 top-gap">
        <PieCard title="Distribuzione MVP" slices={mvpPie} />
        <div className="card">
          <h2>Statistiche per clan</h2>
          <div className="table-scroll">
            <table className="table compact"><thead><tr><th>Clan</th><th>Player</th><th>Righe</th><th>Kill</th><th>Death</th><th>Assist</th><th>K/D</th><th>🥇</th><th>🥈</th><th>🥉</th><th>Pos. media</th><th>MVP</th></tr></thead><tbody>{clanSummary.map((c) => <tr key={c.clan}><td>{c.clan}</td><td>{c.playerCount}</td><td>{c.rows}</td><td>{c.kills}</td><td>{c.deaths}</td><td>{c.assists}</td><td>{c.kd}</td><td>{c.gold}</td><td>{c.silver}</td><td>{c.bronze}</td><td>{c.avgRank}</td><td>{c.mvp}</td></tr>)}{!clanSummary.length && <tr><td colSpan={12} className="muted">Nessun dato clan.</td></tr>}</tbody></table>
          </div>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Top player filtrati</h2>
        <div className="table-scroll">
          <table className="table compact"><thead><tr><th>Player</th><th>Clan</th><th>Match/Righe</th><th>Kill</th><th>Death</th><th>Assist</th><th>K/D</th><th>🥇 Oro</th><th>🥈 Argento</th><th>🥉 Bronzo</th><th>MVP</th><th>Pos. media</th></tr></thead><tbody>{topPlayers.map((p) => <tr key={`${p.name}-${p.clan}`}><td>{p.name}</td><td>{p.clan}</td><td>{p.rows}</td><td>{p.kills}</td><td>{p.deaths}</td><td>{p.assists}</td><td>{p.kd}</td><td>{p.gold}</td><td>{p.silver}</td><td>{p.bronze}</td><td>{p.mvp}</td><td>{p.avgRank}</td></tr>)}{!topPlayers.length && <tr><td colSpan={12} className="muted">Nessun player trovato.</td></tr>}</tbody></table>
        </div>
      </section>
    </main>
  );
}
