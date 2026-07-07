'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { average, kdRatio, winRate } from '@/lib/statistics';
import type { Match, MatchPlayerStat, Player } from '@/lib/types';

type RowWithPlayer = MatchPlayerStat & {
  players?: { nickname: string; clan_name?: string | null; avatar_url?: string | null } | null;
  matches?: { mode: string; result: string; map_name: string | null; match_date: string } | null;
  team_rank?: number | null;
  rank_position?: number | null;
  rank_medal?: string | null;
  mvp_type?: string | null;
  nickname_resolved?: string | null;
  nickname_raw?: string | null;
};

type ScoreboardRow = {
  id: string;
  match_id: string;
  nickname_raw: string | null;
  nickname_resolved: string | null;
  team_color: 'blue' | 'red';
  team_rank: number | null;
  rank_position?: number | null;
  kills: number;
  deaths: number;
  assists: number;
  mvp_type: string | null;
  rank_medal?: string | null;
  needs_review?: boolean;
  players?: { nickname: string; clan_name?: string | null } | null;
};

function medalLabel(rank?: number | null) {
  if (rank === 1) return '🥇 Oro / MVP';
  if (rank === 2) return '🥈 Argento';
  if (rank === 3) return '🥉 Bronzo';
  if (rank === 4) return '🪵 Legno';
  if (rank === 5) return '🏛️ Olimpico';
  if (rank === 4) return '4°';
  if (rank === 5) return '5°';
  return '-';
}

function teamResult(match: Match) {
  if (match.winning_team === 'blue') return 'Squadra blu - Vittoria';
  if (match.winning_team === 'red') return 'Squadra rossa - Vittoria';
  if (match.result === 'WIN') return match.our_team === 'red' ? 'Squadra rossa - Vittoria' : 'Squadra blu - Vittoria';
  if (match.result === 'LOSE') return match.our_team === 'red' ? 'Squadra blu - Vittoria' : 'Squadra rossa - Vittoria';
  return 'Pareggio / da confermare';
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<RowWithPlayer[]>([]);
  const [scoreRows, setScoreRows] = useState<ScoreboardRow[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const { data: matchData, error: matchError } = await supabase.from('matches').select('*').order('match_date', { ascending: false }).limit(50);
      const { data: playerData } = await supabase.from('players').select('*').order('nickname').limit(300);
      const { data: statData } = await supabase.from('match_player_stats').select('*, players(nickname,clan_name,avatar_url), matches(mode,result,map_name,match_date)').limit(1000);
      const { data: rowData } = await supabase.from('match_scoreboard_rows').select('*, players(nickname,clan_name)').order('team_rank', { ascending: true }).limit(1000);
      if (matchError) setMessage(matchError.message);
      const loadedMatches = (matchData || []) as Match[];
      setMatches(loadedMatches);
      setPlayers((playerData || []) as Player[]);
      setStats((statData || []) as RowWithPlayer[]);
      setScoreRows((rowData || []) as ScoreboardRow[]);
      if (!selectedMatchId && loadedMatches[0]?.id) setSelectedMatchId(loadedMatches[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore caricamento dashboard.');
    } finally {
      setLoading(false);
    }
  }

  const selectedMatch = matches.find((m) => m.id === selectedMatchId) || matches[0] || null;
  const selectedRows = selectedMatch ? scoreRows.filter((r) => r.match_id === selectedMatch.id).sort((a, b) => (a.team_color === b.team_color ? (a.team_rank || 99) - (b.team_rank || 99) : a.team_color.localeCompare(b.team_color))) : [];

  const summary = useMemo(() => {
    const wins = matches.filter((m) => m.result === 'WIN').length;
    const losses = matches.filter((m) => m.result === 'LOSE').length;
    const kills = stats.reduce((sum, s) => sum + (s.kills || 0), 0);
    const deaths = stats.reduce((sum, s) => sum + (s.deaths || 0), 0);
    const assists = stats.reduce((sum, s) => sum + (s.assists || 0), 0);
    const mvp = scoreRows.filter((r) => r.team_rank === 1 || r.mvp_type).length;
    const clanSet = new Set(players.map((p) => p.clan_name || 'Senza clan'));
    return { wins, losses, matches: matches.length, players: players.length, mvp, clans: clanSet.size, wr: winRate(wins, matches.length), kills, deaths, assists, kd: kdRatio(kills, deaths) };
  }, [matches, players, stats, scoreRows]);

  const topPlayers = useMemo(() => {
    const map = new Map<string, { name: string; clan: string; kills: number; deaths: number; assists: number; matches: number; ranks: number[]; gold: number; silver: number; bronze: number }>();
    const source = scoreRows.length ? scoreRows : (stats as unknown as ScoreboardRow[]);
    for (const r of source) {
      const name = r.players?.nickname || r.nickname_resolved || r.nickname_raw || 'Player manuale';
      const clan = r.players?.clan_name || 'Senza clan';
      const key = `${clan}::${name}`;
      const item = map.get(key) || { name, clan, kills: 0, deaths: 0, assists: 0, matches: 0, ranks: [], gold: 0, silver: 0, bronze: 0 };
      item.kills += Number(r.kills || 0);
      item.deaths += Number(r.deaths || 0);
      item.assists += Number(r.assists || 0);
      item.matches += 1;
      const rank = Number(r.team_rank || r.rank_position || 0);
      if (rank) item.ranks.push(rank);
      if (rank === 1) item.gold += 1;
      if (rank === 2) item.silver += 1;
      if (rank === 3) item.bronze += 1;
      map.set(key, item);
    }
    return Array.from(map.values()).map((x) => ({ ...x, kd: kdRatio(x.kills, x.deaths), avgRank: x.ranks.length ? average(x.ranks.reduce((a, b) => a + b, 0), x.ranks.length) : '-' })).sort((a, b) => b.gold - a.gold || b.assists - a.assists || b.kills - a.kills).slice(0, 8);
  }, [scoreRows, stats]);

  return (
    <main className="container wide dashboard-2-0">
      <section className="card dashboard-clean-head">
        <p className="eyebrow">📊 Dashboard</p>
        <h1>CLAN MANAGER</h1>
      </section>

      {loading && <div className="notice top-gap">Caricamento dashboard in corso…</div>}
      {message && <div className="notice top-gap">{message}</div>}

      <section className="grid grid-5 top-gap">
        <div className="kpi kpi-glow"><span>Partite</span><strong>{summary.matches}</strong></div>
        <div className="kpi kpi-glow"><span>Win Rate</span><strong>{summary.wr}%</strong></div>
        <div className="kpi kpi-glow"><span>Giocatori</span><strong>{summary.players}</strong></div>
        <div className="kpi kpi-glow"><span>MVP / Oro</span><strong>{summary.mvp}</strong></div>
        <div className="kpi kpi-glow"><span>K/D Clan</span><strong>{summary.kd}</strong></div>
      </section>

      <section className="grid grid-2 top-gap action-layout-2-0">
        <div className="card action-panel-card">
          <div className="section-title">
            <div><p className="eyebrow">🎞️ Action Panel</p><h2>Screenshot partita visibile qui</h2></div>
            <select className="select mini" value={selectedMatch?.id || ''} onChange={(e) => setSelectedMatchId(e.target.value)}>
              {matches.map((m) => <option key={m.id} value={m.id}>{new Date(m.match_date).toLocaleDateString('it-IT')} · {m.mode} · {m.map_name || '-'}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="dashboard-skeleton-stack">
              <div className="dashboard-skeleton-block large" />
              <div className="dashboard-skeleton-line" />
              <div className="dashboard-skeleton-line short" />
            </div>
          ) : !selectedMatch ? <div className="empty-state">Nessuna partita salvata. Importa un risultato per vedere la prova qui.</div> : (
            <div className="grid grid-2 action-panel-grid">
              <div>
                {selectedMatch.screenshot_url ? (
                  <img className="action-screenshot" src={selectedMatch.screenshot_url} alt="Screenshot prova partita" />
                ) : (
                  <div className="screenshot-placeholder">🖼️ Screenshot prova non allegato</div>
                )}
                <small className="muted">Lo screenshot rimane dentro Action Panel. Non apre nuova pagina.</small>
              </div>
              <div className="form">
                <div className="badge win">{teamResult(selectedMatch)}</div>
                <div className="grid grid-2">
                  <div className="kpi"><span>Modalità</span><strong>{selectedMatch.mode}</strong></div>
                  <div className="kpi"><span>Mappa</span><strong>{selectedMatch.map_name || '-'}</strong></div>
                  <div className="kpi"><span>Score blu/rosso</span><strong>{selectedMatch.team_score ?? '-'}:{selectedMatch.enemy_score ?? '-'}</strong></div>
                  <div className="kpi"><span>Nostro team</span><strong>{selectedMatch.our_team || '-'}</strong></div>
                </div>
                <div className="notice"><b>Note partita:</b><br />{selectedMatch.match_notes || selectedMatch.notes || 'Nessuna nota inserita.'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <p className="eyebrow">🏆 Top player</p>
          <h2>Ranking Oro / Argento / Bronzo / Legno / Olimpico</h2>
          <div className="player-mini-list">
            {loading ? (
              <div className="dashboard-skeleton-stack compact">
                {Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="dashboard-skeleton-row" />)}
              </div>
            ) : topPlayers.length ? topPlayers.map((p, idx) => (
              <div className="player-mini" key={`${p.clan}-${p.name}`}>
                <div className="avatar-placeholder small-avatar">{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <b>{p.name}</b><br /><small className="muted">{p.clan} · Pos. media {p.avgRank}</small>
                </div>
                <span className="rank-medal medal-gold">🥇 {p.gold}</span>
                <span className="rank-medal medal-silver">🥈 {p.silver}</span>
                <span className="rank-medal medal-bronze">🥉 {p.bronze}</span>
              </div>
            )) : <div className="empty-state">Nessun ranking disponibile.</div>}
          </div>
        </div>
      </section>

      <section className="grid grid-3 top-gap">
        <div className="card stat-pie-card"><h2>Distribuzione risultati</h2><div className="big-pie" style={{ background: `conic-gradient(var(--ok) 0 ${summary.wr}%, var(--accent) ${summary.wr}% 100%)` }} /><p className="muted">Vittorie {summary.wins} · Sconfitte {summary.losses}</p></div>
        <div className="card"><h2>Kill / Death / Assist</h2><div className="grid grid-3"><div className="kpi"><span>Kill</span><strong>{summary.kills}</strong></div><div className="kpi"><span>Death</span><strong>{summary.deaths}</strong></div><div className="kpi"><span>Assist</span><strong>{summary.assists}</strong></div></div></div>
        <div className="card"><h2>Clan</h2><div className="kpi"><span>Giocatori registrati</span><strong>{summary.players}</strong></div></div>
      </section>
    </main>
  );
}
