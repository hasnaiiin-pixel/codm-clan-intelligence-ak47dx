'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';

type TournamentStatus = 'Bozza' | 'Iscrizioni aperte' | 'Iscrizioni chiuse' | 'In corso' | 'Finito' | 'Archiviato';
type TournamentRow = {
  id: string;
  name: string;
  description?: string | null;
  cover_url?: string | null;
  tournament_date?: string | null;
  start_time?: string | null;
  lobby_time?: string | null;
  max_teams?: number | null;
  format?: string | null;
  type?: string | null;
  status?: TournamentStatus | string | null;
  rules?: any;
  bans?: any;
  winner?: string | null;
  created_at?: string;
};
type TeamRow = { id: string; tournament_id: string; name: string; captain?: string | null; status?: string | null; logo_url?: string | null; players?: string[] | null; reserves?: string[] | null };
type RegistrationRow = { id: string; tournament_id: string; user_id?: string | null; team_id?: string | null; nickname?: string | null; status?: string | null; note?: string | null; created_at?: string };
type MatchRow = { id: string; tournament_id: string; team_a?: string | null; team_b?: string | null; phase?: string | null; group_name?: string | null; match_time?: string | null; lobby_time?: string | null; map_name?: string | null; mode?: string | null; status?: string | null; score_a?: number | null; score_b?: number | null; winner?: string | null; mvp?: string | null; notes?: string | null };

const statuses: TournamentStatus[] = ['Bozza', 'Iscrizioni aperte', 'Iscrizioni chiuse', 'In corso', 'Finito', 'Archiviato'];
const tournamentTypes = ['Da decidere dopo iscrizioni', 'A squadre', 'Singolo player', 'A gruppi', 'A girone', 'Eliminazione diretta', 'Girone + eliminazione finale'];
const formats = ['Da decidere dopo iscrizioni', '1v1', '2v2', '3v3', '4v4', '5v5', 'Custom'];
const codmMaps = ['Standoff', 'Raid', 'Firing Range', 'Summit', 'Slums', 'Hacienda', 'Takeoff', 'Meltdown', 'Crash', 'Crossfire', 'Nuketown', 'Hijacked', 'Shoot House', 'Shipment', 'Rust', 'Terminal', 'Highrise', 'Tunisia', 'Coastal', 'Express', 'Dome'];
const codmModes = ['CED', 'POSTAZIONE', 'DOMINIO', 'CONTROL', 'TDM', 'PRIMA_LINEA', 'KILL_CONFIRMED'];
const allowedWeaponPresets = ['Tutte le armi standard CODM', 'Solo AR/SMG/Sniper consentiti', 'No shotgun / no launcher', 'Regole CDL-like', 'Custom'];

function splitLines(value: string) { return value.split(/\n|,/).map((x) => x.trim()).filter(Boolean); }
function listText(value: unknown) { return Array.isArray(value) ? value.join('\n') : String(value || ''); }
function teamCompleteness(team: TeamRow, format = '5v5') {
  const expected = Number(String(format).replace(/v.*/i, '')) || 5;
  const count = Array.isArray(team.players) ? team.players.length : 0;
  if (team.status === 'Eliminata') return '🔴 Eliminata';
  if (count >= expected) return '🟢 Completa';
  if (count > 0) return '🟡 Incompleta';
  return '⚪ Vuota';
}
function registrationBadge(status?: string | null) {
  if (status === 'Confermata') return '🟢 Confermata';
  if (status === 'Rifiutata') return '🔴 Rifiutata';
  if (status === 'Riserva') return '🔵 Riserva';
  if (status === 'Ritirata') return '⚫ Ritirata';
  return '🟡 In attesa';
}

export default function TournamentPage() {
  const auth = useCodmAuth();
  const canWrite = auth.canWrite;
  const [active, setActive] = useState('dashboard');
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', coverUrl: '', date: '', start: '', lobby: '', maxTeams: '8', format: 'Da decidere dopo iscrizioni', type: 'Da decidere dopo iscrizioni', status: 'Bozza', allowedPreset: 'Tutte le armi standard CODM', allowedWeapons: '', bans: '', rules: '' });
  const [registrationNote, setRegistrationNote] = useState('');
  const [teamForm, setTeamForm] = useState({ name: '', captain: '', players: '', reserves: '', status: 'Incompleta' });
  const [matchForm, setMatchForm] = useState({ teamA: '', teamB: '', phase: 'Girone', group: 'A', date: '', lobby: '', map: 'Standoff', mode: 'CED', scoreA: '', scoreB: '', winner: '', mvp: '', status: 'Da giocare', notes: '' });

  const selected = tournaments.find((t) => t.id === selectedId) || tournaments[0] || null;
  const activeTournament = tournaments.find((t) => !['Finito', 'Archiviato'].includes(String(t.status || ''))) || selected;
  const upcomingMatch = matches.find((m) => !['Finita', 'Annullata'].includes(String(m.status || '')));
  const myRegistration = registrations.find((r) => r.user_id === auth.user?.id);
  const confirmedRegistrations = registrations.filter((r) => r.status === 'Confermata');

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (selected?.id) void loadDetails(selected.id); }, [selected?.id]);
  useEffect(() => { if (selected) syncFormFromSelected(selected); }, [selected?.id]);

  function syncFormFromSelected(t: TournamentRow) {
    const rules = t.rules || {};
    const bans = t.bans || {};
    setForm({
      name: t.name || '',
      description: t.description || '',
      coverUrl: t.cover_url || '',
      date: t.tournament_date || '',
      start: String(t.start_time || '').slice(0, 5),
      lobby: String(t.lobby_time || '').slice(0, 5),
      maxTeams: String(t.max_teams || 8),
      format: t.format || 'Da decidere dopo iscrizioni',
      type: t.type || 'Da decidere dopo iscrizioni',
      status: String(t.status || 'Bozza'),
      allowedPreset: rules.allowed_preset || 'Tutte le armi standard CODM',
      allowedWeapons: listText(rules.allowed_weapons),
      bans: listText(bans.weapons || bans.items || bans.text),
      rules: rules.text || ''
    });
  }

  async function load() {
    setLoading(true); setMessage('');
    try {
      const { data, error } = await supabase.from('codm_tournaments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as TournamentRow[];
      setTournaments(rows);
      if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? `Torneo non disponibile: ${error.message}. Esegui supabase/FINAL_SCHEMA_CLAN_MANAGER.sql.` : 'Errore tornei.');
    } finally { setLoading(false); }
  }

  async function loadDetails(tournamentId: string) {
    const [teamResult, matchResult, registrationResult] = await Promise.all([
      supabase.from('codm_tournament_teams').select('*').eq('tournament_id', tournamentId).order('name'),
      supabase.from('codm_tournament_matches').select('*').eq('tournament_id', tournamentId).order('match_time', { ascending: true }),
      supabase.from('codm_tournament_registrations').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false })
    ]);
    if (!teamResult.error) setTeams((teamResult.data || []) as TeamRow[]);
    if (!matchResult.error) setMatches((matchResult.data || []) as MatchRow[]);
    if (!registrationResult.error) setRegistrations((registrationResult.data || []) as RegistrationRow[]);
  }

  async function saveTournament() {
    if (!canWrite) return setMessage('Solo Staff, Coach o Owner possono salvare tornei.');
    if (!form.name.trim()) return setMessage('Inserisci nome torneo.');
    const payload = {
      name: form.name.trim(), cover_url: form.coverUrl.trim() || null, description: form.description.trim() || null, tournament_date: form.date || null,
      start_time: form.start || null, lobby_time: form.lobby || null, max_teams: Number(form.maxTeams) || 8,
      format: form.format, type: form.type, status: form.status,
      rules: { text: form.rules, bo: 'BO3', screenshot_required: true, mvp_required: true, allowed_preset: form.allowedPreset, allowed_weapons: splitLines(form.allowedWeapons) },
      bans: { text: form.bans, weapons: splitLines(form.bans) }
    };
    const query = selected?.id
      ? supabase.from('codm_tournaments').update(payload).eq('id', selected.id).select('*').single()
      : supabase.from('codm_tournaments').insert(payload).select('*').single();
    const { data, error } = await query;
    if (error) return setMessage(error.message);
    setMessage(selected?.id ? 'Torneo aggiornato. Puoi cambiare formato/tipo anche dopo le iscrizioni.' : 'Torneo creato. Apri iscrizioni e lascia iscrivere i player dal profilo.');
    await load();
    if (data?.id) setSelectedId(data.id);
  }

  async function registerMe() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!auth.user) return setMessage('Accedi con il tuo profilo per iscriverti.');
    if (selected.status !== 'Iscrizioni aperte') return setMessage('Le iscrizioni non sono aperte per questo torneo.');
    const nickname = String(auth.user.user_metadata?.player_nickname || auth.user.user_metadata?.codm_nickname || auth.user.user_metadata?.display_name || auth.user.email || 'Player');
    const payload = { tournament_id: selected.id, user_id: auth.user.id, nickname, note: registrationNote || null, status: 'In attesa' };
    const existing = registrations.find((r) => r.user_id === auth.user?.id);
    const { error } = existing
      ? await supabase.from('codm_tournament_registrations').update({ nickname, note: registrationNote || null, status: existing.status === 'Ritirata' ? 'In attesa' : existing.status }).eq('id', existing.id)
      : await supabase.from('codm_tournament_registrations').insert(payload);
    if (error) return setMessage(error.message);
    setMessage('Iscrizione inviata. Ora lo staff può confermarla o metterti come riserva.');
    setRegistrationNote('');
    await loadDetails(selected.id);
  }

  async function updateRegistrationStatus(id: string, status: string) {
    if (!canWrite) return setMessage('Solo staff può gestire iscrizioni.');
    const { error } = await supabase.from('codm_tournament_registrations').update({ status }).eq('id', id);
    if (error) return setMessage(error.message);
    if (selected?.id) await loadDetails(selected.id);
  }

  function fillTeamFromRegistrations() {
    const names = confirmedRegistrations.map((r) => r.nickname).filter(Boolean).slice(0, Number(String(form.format).replace(/v.*/i, '')) || 5).join('\n');
    setTeamForm((current) => ({ ...current, players: names, captain: confirmedRegistrations[0]?.nickname || current.captain }));
    setActive('teams');
    setMessage('Titolari preparati dalle iscrizioni confermate. Puoi modificare prima di creare la squadra.');
  }

  async function saveTeam() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!canWrite) return setMessage('Solo staff può modificare squadre.');
    if (!teamForm.name.trim()) return setMessage('Inserisci nome squadra.');
    const payload = { tournament_id: selected.id, name: teamForm.name.trim(), captain: teamForm.captain.trim() || null, players: splitLines(teamForm.players), reserves: splitLines(teamForm.reserves), status: teamForm.status };
    const { error } = await supabase.from('codm_tournament_teams').insert(payload);
    if (error) return setMessage(error.message);
    setTeamForm({ name: '', captain: '', players: '', reserves: '', status: 'Incompleta' });
    setMessage('Squadra salvata. Le squadre vengono create dopo le iscrizioni, come richiesto.');
    await loadDetails(selected.id);
  }

  async function generateMatches() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!canWrite) return setMessage('Solo staff può generare partite.');
    if (teams.length < 2) return setMessage('Servono almeno 2 squadre/player.');
    const generated: any[] = [];
    if (String(selected.type || '').toLowerCase().includes('eliminazione')) {
      for (let i = 0; i < teams.length; i += 2) {
        if (!teams[i + 1]) break;
        generated.push({ tournament_id: selected.id, team_a: teams[i].name, team_b: teams[i + 1].name, phase: 'Eliminazione diretta', group_name: 'Bracket', map_name: codmMaps[0], mode: codmModes[0], status: 'Da giocare', notes: `Armi permesse: ${(selected.rules?.allowed_weapons || []).join(', ') || selected.rules?.allowed_preset || 'standard'}. Ban: ${(selected.bans?.weapons || []).join(', ') || '-'}` });
      }
    } else {
      for (let i = 0; i < teams.length; i += 1) {
        for (let j = i + 1; j < teams.length; j += 1) {
          generated.push({ tournament_id: selected.id, team_a: teams[i].name, team_b: teams[j].name, phase: 'Girone', group_name: 'A', map_name: codmMaps[(i + j) % codmMaps.length], mode: codmModes[(i + j) % codmModes.length], status: 'Da giocare', notes: `Armi permesse: ${(selected.rules?.allowed_weapons || []).join(', ') || selected.rules?.allowed_preset || 'standard'}. Ban: ${(selected.bans?.weapons || []).join(', ') || '-'}` });
        }
      }
    }
    if (!generated.length) return setMessage('Nessuna partita generata.');
    const { error } = await supabase.from('codm_tournament_matches').insert(generated);
    if (error) return setMessage(error.message);
    setMessage(`Generate ${generated.length} partite per ${selected.name}.`);
    await loadDetails(selected.id);
    setActive('matches');
  }

  async function saveMatch() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!canWrite) return setMessage('Solo staff può salvare partite torneo.');
    const scoreA = matchForm.scoreA === '' ? null : Number(matchForm.scoreA);
    const scoreB = matchForm.scoreB === '' ? null : Number(matchForm.scoreB);
    const winner = matchForm.winner || (scoreA !== null && scoreB !== null ? (scoreA > scoreB ? matchForm.teamA : scoreB > scoreA ? matchForm.teamB : 'Pareggio') : null);
    const { error } = await supabase.from('codm_tournament_matches').insert({
      tournament_id: selected.id, team_a: matchForm.teamA, team_b: matchForm.teamB, phase: matchForm.phase, group_name: matchForm.group,
      match_time: matchForm.date || null, lobby_time: matchForm.lobby || null, map_name: matchForm.map, mode: matchForm.mode, status: matchForm.status,
      score_a: scoreA, score_b: scoreB, winner, mvp: matchForm.mvp || null,
      notes: `${matchForm.notes || ''}\nArmi permesse: ${splitLines(form.allowedWeapons).join(', ') || form.allowedPreset}. Ban: ${splitLines(form.bans).join(', ') || '-'}`.trim()
    });
    if (error) return setMessage(error.message);
    setMessage('Partita torneo salvata. Le statistiche torneo restano nella pagina Torneo, separate dalle statistiche generali.');
    await loadDetails(selected.id);
  }

  const standings = useMemo(() => {
    const map = new Map<string, { team: string; played: number; wins: number; draws: number; losses: number; points: number; diff: number; status: string }>();
    for (const t of teams) map.set(t.name, { team: t.name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, diff: 0, status: t.status || 'In attesa' });
    for (const m of matches) {
      if (m.score_a == null || m.score_b == null || !m.team_a || !m.team_b) continue;
      const a = map.get(m.team_a) || { team: m.team_a, played: 0, wins: 0, draws: 0, losses: 0, points: 0, diff: 0, status: 'In attesa' };
      const b = map.get(m.team_b) || { team: m.team_b, played: 0, wins: 0, draws: 0, losses: 0, points: 0, diff: 0, status: 'In attesa' };
      a.played += 1; b.played += 1; a.diff += (m.score_a - m.score_b); b.diff += (m.score_b - m.score_a);
      if (m.score_a > m.score_b) { a.wins++; b.losses++; a.points += 3; }
      else if (m.score_b > m.score_a) { b.wins++; a.losses++; b.points += 3; }
      else { a.draws++; b.draws++; a.points++; b.points++; }
      map.set(a.team, a); map.set(b.team, b);
    }
    return Array.from(map.values()).sort((a,b) => b.points-a.points || b.diff-a.diff || a.team.localeCompare(b.team));
  }, [teams, matches]);

  const tournamentStats = useMemo(() => {
    const finished = matches.filter((m) => m.score_a != null && m.score_b != null);
    const mvp = new Map<string, number>();
    for (const m of finished) if (m.mvp) mvp.set(m.mvp, (mvp.get(m.mvp) || 0) + 1);
    return { played: finished.length, pending: matches.length - finished.length, registrations: registrations.length, teams: teams.length, topMvp: Array.from(mvp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }, [matches, registrations, teams]);

  const tabs = [
    ['dashboard', '📌 Dashboard'], ['manage', '🛠️ Crea / Gestisci'], ['registrations', '📝 Iscrizioni'], ['teams', '👥 Squadre / Player'],
    ['rules', '📜 Regolamento'], ['bracket', '📊 Tabellone / Classifica'], ['matches', '🎮 Partite'], ['archive', '🗂️ Archivio']
  ];

  return (
    <main className="container wide tournament-page tournament-pro-page">
      <section className="card ak-section-head tournament-head">
        <p className="eyebrow">🏆 TORNEO</p>
        <h1>Gestione torneo separata</h1>
        <p className="muted">Iscrizioni prima, squadre dopo. Formato e tipo torneo restano modificabili anche dopo la creazione, in base al numero di iscritti.</p>
        <div className="tournament-tabs">{tabs.map(([id, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>{label}</button>)}</div>
        <div className="top-gap grid grid-2"><div className="field"><label>Torneo selezionato</label><select className="select pro-select" value={selected?.id || ''} onChange={(e)=>setSelectedId(e.target.value)}><option value="">Nessun torneo</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.status}</option>)}</select></div><div className="notice">{message || (loading ? 'Caricamento tornei...' : 'Pronto.')}</div></div>
      </section>

      {active === 'dashboard' && <section className="grid grid-4 top-gap"><div className="kpi"><span>Torneo attivo</span><strong>{activeTournament?.name || '-'}</strong></div><div className="kpi"><span>Iscrizioni</span><strong>{tournamentStats.registrations}</strong></div><div className="kpi"><span>Squadre</span><strong>{tournamentStats.teams}</strong></div><div className="kpi"><span>Partite finite/da giocare</span><strong>{tournamentStats.played}/{tournamentStats.pending}</strong></div><div className="card grid-span-2"><h2>Regole armi torneo</h2><p><b>Permesse:</b> {selected?.rules?.allowed_weapons?.length ? selected.rules.allowed_weapons.join(', ') : selected?.rules?.allowed_preset || 'Da definire'}</p><p><b>Vietate:</b> {selected?.bans?.weapons?.length ? selected.bans.weapons.join(', ') : '-'}</p></div><div className="card grid-span-2"><h2>Statistiche torneo</h2><p className="muted">Restano qui dentro, separate dalle statistiche generali della app.</p><div className="tournament-team-list">{tournamentStats.topMvp.length ? tournamentStats.topMvp.map(([name, count]) => <span className="pill-chip" key={name}>🏅 {name}: {count} MVP</span>) : <span className="muted">MVP torneo non ancora disponibili.</span>}</div></div></section>}

      {active === 'manage' && <section className="card top-gap"><h2>Crea / modifica torneo</h2><div className="notice">Puoi creare il torneo in bozza, aprire iscrizioni, poi cambiare tipo e formato dopo aver visto quanti player si sono iscritti.</div><div className="grid grid-3 top-gap"><div className="field"><label>Nome torneo</label><input className="input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></div><div className="field"><label>Data torneo</label><input className="input" type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}/></div><div className="field"><label>Stato</label><select className="select pro-select" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Orario inizio</label><input className="input" type="time" value={form.start} onChange={(e)=>setForm({...form,start:e.target.value})}/></div><div className="field"><label>Apertura lobby</label><input className="input" type="time" value={form.lobby} onChange={(e)=>setForm({...form,lobby:e.target.value})}/></div><div className="field"><label>Numero squadre/player</label><input className="input" inputMode="numeric" value={form.maxTeams} onChange={(e)=>setForm({...form,maxTeams:e.target.value})}/></div><div className="field"><label>Formato</label><select className="select pro-select" value={form.format} onChange={(e)=>setForm({...form,format:e.target.value})}>{formats.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Tipo torneo</label><select className="select pro-select" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}>{tournamentTypes.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Cover torneo/link immagine</label><input className="input" value={form.coverUrl} onChange={(e)=>setForm({...form,coverUrl:e.target.value})}/></div><div className="field grid-span-3"><label>Descrizione breve</label><input className="input" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></div></div><button className="btn top-gap" onClick={saveTournament}>💾 {selected?.id ? 'Aggiorna torneo selezionato' : 'Crea torneo'}</button></section>}

      {active === 'registrations' && <section className="grid grid-2 top-gap"><div className="card"><h2>Iscriviti con il tuo profilo</h2><p className="muted">Le squadre si creano dopo. Prima raccogliamo iscrizioni player, poi lo staff decide 1v1, 2v2, 5v5 o altro.</p><div className="notice"><b>Stato tuo profilo:</b> {myRegistration ? registrationBadge(myRegistration.status) : 'Non iscritto'}</div><textarea className="textarea top-gap" value={registrationNote} onChange={(e)=>setRegistrationNote(e.target.value)} placeholder="Note iscrizione: ruolo, orari, preferenze squadra..." /><button className="btn top-gap" onClick={registerMe} disabled={!auth.user || selected?.status !== 'Iscrizioni aperte'}>📝 Iscriviti / conferma iscrizione</button>{selected?.status !== 'Iscrizioni aperte' && <small className="muted">Lo staff deve mettere il torneo in “Iscrizioni aperte”.</small>}</div><div className="card"><div className="section-title"><div><h2>Lista iscrizioni</h2><p className="muted">Gestione separata dal resto della app.</p></div>{canWrite && <button className="btn small secondary" type="button" onClick={fillTeamFromRegistrations}>Crea squadra dagli iscritti confermati</button>}</div><div className="tournament-team-list top-gap">{registrations.map((r)=><article key={r.id} className="compact-card"><b>{r.nickname || 'Player'}</b><span>{registrationBadge(r.status)}</span><small>{r.note || '-'}</small>{canWrite && <div className="cal-buttons top-gap"><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Confermata')}>Conferma</button><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Riserva')}>Riserva</button><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Rifiutata')}>Rifiuta</button></div>}</article>)}{!registrations.length && <div className="empty-state">Nessuna iscrizione ancora.</div>}</div></div></section>}

      {active === 'teams' && <section className="card top-gap"><h2>Squadre / Player</h2><p className="muted">Le squadre vengono create dopo le iscrizioni confermate. Puoi cambiare formato torneo prima di generare il tabellone.</p><div className="grid grid-3"><div className="field"><label>Nome squadra</label><input className="input" value={teamForm.name} onChange={(e)=>setTeamForm({...teamForm,name:e.target.value})}/></div><div className="field"><label>Capitano</label><input className="input" value={teamForm.captain} onChange={(e)=>setTeamForm({...teamForm,captain:e.target.value})}/></div><div className="field"><label>Stato squadra</label><select className="select pro-select" value={teamForm.status} onChange={(e)=>setTeamForm({...teamForm,status:e.target.value})}>{['Incompleta','Completa','Confermata','Eliminata'].map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Titolari</label><textarea className="textarea" value={teamForm.players} onChange={(e)=>setTeamForm({...teamForm,players:e.target.value})} placeholder="uno per riga" /></div><div className="field"><label>Riserve</label><textarea className="textarea" value={teamForm.reserves} onChange={(e)=>setTeamForm({...teamForm,reserves:e.target.value})} placeholder="opzionali" /></div><div className="field"><label>Azione</label><button className="btn" onClick={saveTeam}>➕ Aggiungi squadra</button></div></div><div className="tournament-team-list top-gap">{teams.map(t=><article key={t.id} className="compact-card"><b>{t.name}</b><span>{teamCompleteness(t, selected?.format || '5v5')}</span><small>Capitano: {t.captain || '-'} · Titolari: {t.players?.length || 0} · Riserve: {t.reserves?.length || 0}</small></article>)}</div></section>}

      {active === 'rules' && <section className="card top-gap"><h2>Regolamento e armi</h2><div className="grid grid-2"><div className="field"><label>Tipologia armi permesse</label><select className="select pro-select" value={form.allowedPreset} onChange={(e)=>setForm({...form,allowedPreset:e.target.value})}>{allowedWeaponPresets.map((w)=><option key={w}>{w}</option>)}</select><textarea className="textarea top-gap" value={form.allowedWeapons} onChange={(e)=>setForm({...form,allowedWeapons:e.target.value})} placeholder="Esempio: AR, SMG, Sniper, Pistol..." /></div><div className="field"><label>🚫 Armi / oggetti vietati</label><textarea className="textarea" value={form.bans} onChange={(e)=>setForm({...form,bans:e.target.value})} placeholder="NA45, Persistence, Martirio..." /></div><div className="field grid-span-2"><label>Regole generali</label><textarea className="textarea" value={form.rules} onChange={(e)=>setForm({...form,rules:e.target.value})} placeholder="BO3, ritardo massimo, screenshot obbligatorio, MVP..." /></div></div><button className="btn top-gap" onClick={saveTournament}>💾 Salva regolamento nel torneo selezionato</button></section>}

      {active === 'bracket' && <section className="card top-gap"><div className="section-title"><div><h2>Tabellone / Classifica</h2><p className="muted">Classifica e statistiche torneo sono qui, non nella pagina statistiche generale.</p></div><button className="btn small secondary" type="button" onClick={generateMatches}>⚡ Genera partite</button></div><div className="table-scroll"><table className="table compact pro-table"><thead><tr><th>Pos.</th><th>Squadra/player</th><th>G</th><th>V</th><th>P</th><th>S</th><th>Pt</th><th>Diff</th><th>Stato</th></tr></thead><tbody>{standings.map((s,i)=><tr key={s.team}><td>{i+1}</td><td>{s.team}</td><td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td><td>{s.points}</td><td>{s.diff}</td><td>{i < 4 ? '🟢 Qualificato' : s.status}</td></tr>)}</tbody></table></div><div className="bracket-preview top-gap"><div>Quarti</div><div>Semifinali</div><div>Finale</div><div>🏆 Vincitore</div></div></section>}

      {active === 'matches' && <section className="card top-gap"><div className="section-title"><div><h2>Partite torneo</h2><p className="muted">Ogni partita mostra armi permesse e ban attivi nel dettaglio/note.</p></div><button className="btn small secondary" type="button" onClick={generateMatches}>⚡ Genera partite</button></div><div className="grid grid-4"><div className="field"><label>Team A</label><input className="input" value={matchForm.teamA} onChange={(e)=>setMatchForm({...matchForm,teamA:e.target.value})}/></div><div className="field"><label>Team B</label><input className="input" value={matchForm.teamB} onChange={(e)=>setMatchForm({...matchForm,teamB:e.target.value})}/></div><div className="field"><label>Fase</label><input className="input" value={matchForm.phase} onChange={(e)=>setMatchForm({...matchForm,phase:e.target.value})}/></div><div className="field"><label>Gruppo/Turno</label><input className="input" value={matchForm.group} onChange={(e)=>setMatchForm({...matchForm,group:e.target.value})}/></div><div className="field"><label>Orario match</label><input className="input" type="datetime-local" value={matchForm.date} onChange={(e)=>setMatchForm({...matchForm,date:e.target.value})}/></div><div className="field"><label>Mappa</label><select className="select pro-select" value={matchForm.map} onChange={(e)=>setMatchForm({...matchForm,map:e.target.value})}>{codmMaps.map(m=><option key={m}>{m}</option>)}</select></div><div className="field"><label>Modalità</label><select className="select pro-select" value={matchForm.mode} onChange={(e)=>setMatchForm({...matchForm,mode:e.target.value})}>{codmModes.map(m=><option key={m}>{m}</option>)}</select></div><div className="field"><label>Risultato</label><div className="score-inline"><input className="input" value={matchForm.scoreA} onChange={(e)=>setMatchForm({...matchForm,scoreA:e.target.value.replace(/[^0-9]/g,'')})}/><span>:</span><input className="input" value={matchForm.scoreB} onChange={(e)=>setMatchForm({...matchForm,scoreB:e.target.value.replace(/[^0-9]/g,'')})}/></div></div><div className="field"><label>MVP</label><input className="input" value={matchForm.mvp} onChange={(e)=>setMatchForm({...matchForm,mvp:e.target.value})}/></div></div><button className="btn top-gap" onClick={saveMatch}>💾 Salva partita torneo</button><div className="tournament-team-list top-gap">{matches.map(m=><article key={m.id} className="compact-card"><b>{m.team_a || '-'} vs {m.team_b || '-'}</b><span>{m.status || 'Da giocare'} · {m.score_a ?? '-'}:{m.score_b ?? '-'}</span><small>{m.phase} · {m.group_name} · {m.map_name} · {m.mode} · MVP {m.mvp || '-'}</small><small>Regole: {m.notes || 'armi/ban da regolamento torneo'}</small></article>)}</div></section>}

      {active === 'archive' && <section className="card top-gap"><h2>Archivio tornei</h2><div className="tournament-team-list">{tournaments.filter(t=>['Finito','Archiviato'].includes(String(t.status))).map(t=><article key={t.id} className="compact-card"><b>{t.name}</b><span>{t.status}</span><small>Vincitore: {t.winner || 'da definire'} · statistiche finali sempre nella pagina Torneo.</small></article>)}</div></section>}
    </main>
  );
}
