'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { GameMode, Match, MatchResult, MatchType } from '@/lib/types';

const modes: Array<GameMode | 'ALL'> = ['ALL', 'CED', 'TDM', 'PRIMA_LINEA', 'DOMINIO', 'POSTAZIONE', 'KILL_CONFIRMED', 'BR_SOLO', 'BR_DUO', 'BR_SQUAD'];
const types: Array<MatchType | 'ALL'> = ['ALL', 'scrim', 'ranked', 'private', 'training', 'tournament', 'br'];
const results: Array<MatchResult | 'ALL'> = ['ALL', 'WIN', 'LOSE', 'DRAW'];

function rankMedal(rank?: number | null) {
  if (rank === 1) return { icon: '🥇', label: 'Gold / MVP', className: 'medal-gold' };
  if (rank === 2) return { icon: '🥈', label: 'Silver', className: 'medal-silver' };
  if (rank === 3) return { icon: '🥉', label: 'Bronze', className: 'medal-bronze' };
  if (rank === 4) return { icon: '4️⃣', label: '4°', className: 'medal-normal' };
  if (rank === 5) return { icon: '5️⃣', label: '5°', className: 'medal-normal' };
  return { icon: '•', label: '-', className: 'medal-normal' };
}

type ScoreboardRow = {
  id: string;
  match_id: string;
  player_id: string | null;
  nickname_raw: string | null;
  nickname_resolved: string | null;
  team_color: 'blue' | 'red';
  team_side: 'ALLY' | 'ENEMY';
  team_result: 'winner' | 'loser' | 'draw' | null;
  team_rank: number | null;
  kills: number;
  deaths: number;
  assists: number;
  mvp_type: string | null;
  needs_review: boolean;
  players?: { nickname: string; clan_name?: string | null } | null;
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rows, setRows] = useState<ScoreboardRow[]>([]);
  const [selected, setSelected] = useState<Match | null>(null);
  const [message, setMessage] = useState('');
  const [filterMode, setFilterMode] = useState<GameMode | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<MatchType | 'ALL'>('ALL');
  const [filterResult, setFilterResult] = useState<MatchResult | 'ALL'>('ALL');
  const [filterText, setFilterText] = useState('');
  const [filterMvp, setFilterMvp] = useState<'ALL' | 'MVP_WIN' | 'MVP_LOSE' | 'NO_MVP'>('ALL');
  const [filterClan, setFilterClan] = useState('ALL');
  const [filterRank, setFilterRank] = useState<'ALL' | '1' | '2' | '3' | '4' | '5'>('ALL');
  const [filterReview, setFilterReview] = useState<'ALL' | 'OK' | 'REVIEW'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setMessage('');
    const { data, error } = await supabase.from('matches').select('*').order('match_date', { ascending: false });
    const { data: rowData, error: rowError } = await supabase.from('match_scoreboard_rows').select('*, players(nickname,clan_name)').order('team_rank', { ascending: true });
    if (error || rowError) setMessage(error?.message || rowError?.message || 'Errore caricamento archivio.');
    setMatches((data || []) as Match[]);
    setRows((rowData || []) as ScoreboardRow[]);
  }

  async function deleteMatch(match: Match) {
    const ok = window.confirm(`Eliminare la partita ${match.mode} ${match.map_name || ''}? Verranno eliminate anche statistiche e righe collegate.`);
    if (!ok) return;
    const { error } = await supabase.from('matches').delete().eq('id', match.id);
    if (error) return setMessage(error.message);
    if (selected?.id === match.id) setSelected(null);
    setMessage('Partita eliminata.');
    load();
  }

  const clanOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.players?.clan_name || 'Senza clan'));
    return ['ALL', ...Array.from(set).sort()];
  }, [rows]);

  const filteredMatches = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return matches.filter((m) => {
      if (filterMode !== 'ALL' && m.mode !== filterMode) return false;
      if (filterType !== 'ALL' && m.match_type !== filterType) return false;
      if (filterResult !== 'ALL' && m.result !== filterResult) return false;
      const matchTime = new Date(m.match_date).getTime();
      if (fromTime && matchTime < fromTime) return false;
      if (toTime && matchTime > toTime) return false;
      const relatedRows = rows.filter((r) => r.match_id === m.id);
      if (filterMvp === 'MVP_WIN' && !relatedRows.some((r) => r.mvp_type === 'MVP_WIN')) return false;
      if (filterMvp === 'MVP_LOSE' && !relatedRows.some((r) => r.mvp_type === 'MVP_LOSE')) return false;
      if (filterMvp === 'NO_MVP' && relatedRows.some((r) => r.mvp_type)) return false;
      if (filterClan !== 'ALL' && !relatedRows.some((r) => (r.players?.clan_name || 'Senza clan') === filterClan)) return false;
      if (filterRank !== 'ALL' && !relatedRows.some((r) => String(r.team_rank) === filterRank)) return false;
      if (filterReview === 'REVIEW' && !relatedRows.some((r) => r.needs_review)) return false;
      if (filterReview === 'OK' && relatedRows.some((r) => r.needs_review)) return false;
      if (!q) return true;
      const rowText = relatedRows.map((r) => `${r.nickname_resolved || r.nickname_raw || ''} ${r.players?.clan_name || ''} ${r.mvp_type || ''} ${r.team_rank || ''}`).join(' ');
      return `${m.mode} ${m.map_name || ''} ${m.opponent || ''} ${m.notes || ''} ${m.match_notes || ''} ${rowText}`.toLowerCase().includes(q);
    });
  }, [matches, rows, filterMode, filterType, filterResult, filterText, filterMvp, filterClan, filterRank, filterReview, dateFrom, dateTo]);

  const selectedRows = selected ? rows.filter((r) => r.match_id === selected.id).sort((a, b) => (a.team_color === b.team_color ? (a.team_rank || 0) - (b.team_rank || 0) : a.team_color.localeCompare(b.team_color))) : [];

  const summary = useMemo(() => {
    const wins = filteredMatches.filter((m) => m.result === 'WIN').length;
    const losses = filteredMatches.filter((m) => m.result === 'LOSE').length;
    const draw = filteredMatches.filter((m) => m.result === 'DRAW').length;
    return { total: filteredMatches.length, wins, losses, draw, winPct: filteredMatches.length ? Math.round((wins / filteredMatches.length) * 100) : 0 };
  }, [filteredMatches]);

  function resetFilters() {
    setFilterMode('ALL'); setFilterType('ALL'); setFilterResult('ALL'); setFilterText(''); setFilterMvp('ALL'); setFilterClan('ALL'); setFilterRank('ALL'); setFilterReview('ALL'); setDateFrom(''); setDateTo('');
  }

  return (
    <main className="container wide">
      <section className="card gaming-panel">
        <p className="eyebrow">🎞️ Archivio partite 2.0</p>
        <h1>Storico partite + Action Panel</h1>
        <p className="muted">Apri una partita dall'elenco: lo screenshot prova rimane visibile nel pannello azione, insieme a note, MVP, ranking Gold/Silver/Bronze, classifica 1–5 e Kill / Death / Assist.</p>
        {message && <div className="notice">{message}</div>}
        <div className="grid grid-5 top-gap">
          <div className="field"><label>Da data</label><input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div className="field"><label>A data</label><input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <div className="field"><label>Modalità</label><select className="select" value={filterMode} onChange={(e) => setFilterMode(e.target.value as GameMode | 'ALL')}>{modes.map((m) => <option key={m} value={m}>{m === 'ALL' ? 'Tutte' : m}</option>)}</select></div>
          <div className="field"><label>Tipo</label><select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value as MatchType | 'ALL')}>{types.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'Tutti' : t}</option>)}</select></div>
          <div className="field"><label>Esito</label><select className="select" value={filterResult} onChange={(e) => setFilterResult(e.target.value as MatchResult | 'ALL')}>{results.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'Tutti' : r}</option>)}</select></div>
          <div className="field"><label>MVP</label><select className="select" value={filterMvp} onChange={(e) => setFilterMvp(e.target.value as 'ALL' | 'MVP_WIN' | 'MVP_LOSE' | 'NO_MVP')}><option value="ALL">Tutti</option><option value="MVP_WIN">MVP vincente</option><option value="MVP_LOSE">MVP perdente</option><option value="NO_MVP">Senza MVP</option></select></div>
          <div className="field"><label>Clan</label><select className="select" value={filterClan} onChange={(e) => setFilterClan(e.target.value)}>{clanOptions.map((c) => <option key={c} value={c}>{c === 'ALL' ? 'Tutti i clan' : c}</option>)}</select></div>
          <div className="field"><label>Posizione</label><select className="select" value={filterRank} onChange={(e) => setFilterRank(e.target.value as 'ALL' | '1' | '2' | '3' | '4' | '5')}><option value="ALL">Tutte</option><option value="1">1°</option><option value="2">2°</option><option value="3">3°</option><option value="4">4°</option><option value="5">5°</option></select></div>
          <div className="field"><label>Review</label><select className="select" value={filterReview} onChange={(e) => setFilterReview(e.target.value as 'ALL' | 'OK' | 'REVIEW')}><option value="ALL">Tutte</option><option value="OK">Solo OK</option><option value="REVIEW">Da controllare</option></select></div>
          <div className="field"><label>Cerca</label><input className="input" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="player, clan, mappa, note..." /></div>
        </div>
        <button className="btn small secondary top-gap" onClick={resetFilters}>♻️ Reset filtri</button>
      </section>

      <section className="grid grid-4 top-gap">
        <div className="kpi kpi-glow"><span>Partite filtrate</span><strong>{summary.total}</strong></div>
        <div className="kpi kpi-glow"><span>Vittorie</span><strong>{summary.wins}</strong></div>
        <div className="kpi kpi-glow"><span>Sconfitte</span><strong>{summary.losses}</strong></div>
        <div className="kpi kpi-glow"><span>Win rate</span><strong>{summary.winPct}%</strong></div>
      </section>

      <section className="grid grid-2 top-gap archive-layout">
        <div className="card">
          <h2>Elenco partite</h2>
          <div className="table-scroll">
            <table className="table compact">
              <thead><tr><th>Data</th><th>Mode</th><th>Mappa</th><th>Avversario</th><th>Score</th><th>Esito</th><th>Azioni</th></tr></thead>
              <tbody>
                {filteredMatches.map((m) => (
                  <tr key={m.id} className={selected?.id === m.id ? 'selected-row' : ''}>
                    <td>{new Date(m.match_date).toLocaleString('it-IT')}</td>
                    <td>{m.mode}</td>
                    <td>{m.map_name || '-'}</td>
                    <td>{m.opponent || '-'}</td>
                    <td>{m.team_score ?? '-'}:{m.enemy_score ?? '-'}</td>
                    <td><span className={`badge ${m.result === 'WIN' ? 'win' : m.result === 'LOSE' ? 'lose' : ''}`}>{m.result}</span></td>
                    <td><button className="btn small secondary" onClick={() => setSelected(m)}>Apri</button> <button className="btn small danger" onClick={() => deleteMatch(m)}>Cancella</button></td>
                  </tr>
                ))}
                {!filteredMatches.length && <tr><td colSpan={7} className="muted">Nessuna partita trovata.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">🎞️ Action Panel</p><h2>Dettaglio partita</h2>
          {!selected ? <div className="empty-state">Seleziona una partita dall'elenco.</div> : (
            <div className="form">
              <div className="grid grid-2">
                <div className="kpi"><span>Modalità</span><strong>{selected.mode}</strong></div>
                <div className="kpi"><span>Esito</span><strong>{selected.result}</strong></div>
              </div>
              <p><b>Mappa:</b> {selected.map_name || '-'} · <b>Avversario:</b> {selected.opponent || '-'} · <b>Score:</b> {selected.team_score ?? '-'}:{selected.enemy_score ?? '-'}</p>
              <p className="muted"><b>Note:</b> {selected.match_notes || selected.notes || '-'}</p>
              {selected.screenshot_url ? <div className="action-proof"><img className="action-screenshot" src={selected.screenshot_url} alt="Screenshot prova partita" /><small className="muted">Screenshot prova visibile in Action Panel, senza aprire nuova pagina.</small></div> : <div className="screenshot-placeholder">🖼️ Nessuno screenshot prova allegato.</div>}
              <div className="table-scroll">
                <table className="table compact">
                  <thead><tr><th>Team</th><th>Rank</th><th>Medaglia</th><th>Player</th><th>Clan</th><th>Kill</th><th>Death</th><th>Assist</th><th>MVP</th><th>Review</th></tr></thead>
                  <tbody>
                    {selectedRows.map((r) => <tr key={r.id}><td>{r.team_color}</td><td>{r.team_rank}</td><td><span className={`rank-medal ${rankMedal(r.team_rank).className}`}>{rankMedal(r.team_rank).icon} {rankMedal(r.team_rank).label}</span></td><td>{r.nickname_resolved || r.nickname_raw}</td><td>{r.players?.clan_name || '-'}</td><td>{r.kills}</td><td>{r.deaths}</td><td>{r.assists}</td><td>{r.mvp_type || '-'}</td><td>{r.needs_review ? <span className="badge warn">Controlla</span> : <span className="badge ok">OK</span>}</td></tr>)}
                    {!selectedRows.length && <tr><td colSpan={10} className="muted">Nessuna riga classifica salvata.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
