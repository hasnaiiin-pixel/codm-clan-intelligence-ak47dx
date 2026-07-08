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
type MatchRow = { id: string; tournament_id: string; team_a?: string | null; team_b?: string | null; phase?: string | null; group_name?: string | null; match_time?: string | null; lobby_time?: string | null; map_name?: string | null; mode?: string | null; status?: string | null; score_a?: number | null; score_b?: number | null; winner?: string | null; mvp?: string | null; screenshot_url?: string | null; notes?: string | null };

type Participant = { name: string; seed: number; source: 'team' | 'registration' };

const statuses: TournamentStatus[] = ['Bozza', 'Iscrizioni aperte', 'Iscrizioni chiuse', 'In corso', 'Finito', 'Archiviato'];
const tournamentTypes = ['Da decidere dopo iscrizioni', 'Eliminazione diretta', 'A gruppi', 'A girone', 'Girone + eliminazione finale'];
const formats = ['Da decidere dopo iscrizioni', '1v1', '2v2', '3v3', '4v4', '5v5', 'Custom'];
const codmMaps = ['Standoff', 'Raid', 'Firing Range', 'Summit', 'Slums', 'Hacienda', 'Takeoff', 'Meltdown', 'Crash', 'Crossfire', 'Nuketown', 'Nuketown Russia', 'Hijacked', 'Shoot House', 'Shipment', 'Rust', 'Terminal', 'Highrise', 'Hackney Yard', 'Tunisia', 'Coastal', 'Express', 'Dome', 'Vacant', 'Scrapyard', 'Monastery'];
const codmModes = ['CED', 'POSTAZIONE', 'DOMINIO', 'CONTROL', 'TDM', 'PRIMA_LINEA', 'KILL_CONFIRMED'];
const allowedWeaponPresets = ['Regole CODM competitive', 'AR / SMG / Sniper consentiti', 'Solo armi standard CODM', 'No shotgun / no launcher', 'Regole CDL-like', 'Custom'];
const phasesOrder = ['Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale', 'Vincitore'];

function splitLines(value: string) { return value.split(/\n|,/).map((x) => x.trim()).filter(Boolean); }
function listText(value: unknown) { return Array.isArray(value) ? value.join('\n') : String(value || ''); }
function nicknameFromUser(user: any) { return String(user?.user_metadata?.player_nickname || user?.user_metadata?.codm_nickname || user?.user_metadata?.display_name || user?.email || 'Player'); }
function registrationBadge(status?: string | null) {
  if (status === 'Confermata') return '🟢 Confermata';
  if (status === 'Rifiutata') return '🔴 Rifiutata';
  if (status === 'Riserva') return '🔵 Riserva';
  if (status === 'Ritirata') return '⚫ Ritirata';
  return '🟡 In attesa';
}
function teamCompleteness(team: TeamRow, format = '5v5') {
  const expected = Number(String(format).replace(/v.*/i, '')) || 5;
  const count = Array.isArray(team.players) ? team.players.length : 0;
  if (team.status === 'Eliminata') return '🔴 Eliminata';
  if (count >= expected) return '🟢 Completa';
  if (count > 0) return '🟡 Incompleta';
  return '⚪ Vuota';
}
function nextPowerOfTwo(n: number) { let p = 1; while (p < Math.max(2, n)) p *= 2; return p; }
function phaseForSize(size: number) {
  if (size >= 32) return 'Sedicesimi';
  if (size >= 16) return 'Ottavi';
  if (size >= 8) return 'Quarti';
  if (size >= 4) return 'Semifinale';
  return 'Finale';
}
function nextPhase(phase?: string | null) {
  const idx = phasesOrder.indexOf(String(phase || ''));
  if (idx < 0 || idx >= phasesOrder.length - 1) return null;
  return phasesOrder[idx + 1];
}
function resultClass(match: MatchRow, name?: string | null) {
  if (!match.winner || !name) return '';
  if (match.winner === name) return 'winner';
  if ((match.team_a === name || match.team_b === name) && match.winner !== name && match.winner !== 'Pareggio') return 'eliminated';
  return '';
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
  const [form, setForm] = useState({ name: '', description: '', coverUrl: '', date: '', start: '', lobby: '', maxTeams: '8', format: 'Da decidere dopo iscrizioni', type: 'Da decidere dopo iscrizioni', status: 'Bozza', allowedPreset: 'Regole CODM competitive', allowedWeapons: '', bans: '', rules: '' });
  const [registrationNote, setRegistrationNote] = useState('');
  const [teamForm, setTeamForm] = useState({ name: '', captain: '', players: '', reserves: '', status: 'Incompleta' });
  const [matchForm, setMatchForm] = useState({ id: '', teamA: '', teamB: '', phase: 'Girone', group: 'A', date: '', lobby: '', map: 'Standoff', mode: 'CED', scoreA: '', scoreB: '', winner: '', mvp: '', status: 'Da giocare', screenshotUrl: '', notes: '' });
  const [generationMode, setGenerationMode] = useState('auto');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = tournaments.find((t) => t.id === selectedId) || tournaments[0] || null;
  const activeTournament = tournaments.find((t) => !['Finito', 'Archiviato'].includes(String(t.status || ''))) || selected;
  const myRegistration = registrations.find((r) => r.user_id === auth.user?.id);
  const confirmedRegistrations = registrations.filter((r) => r.status === 'Confermata');
  const participants: Participant[] = useMemo(() => {
    if (teams.length) return teams.map((team, index) => ({ name: team.name, seed: index + 1, source: 'team' as const }));
    return confirmedRegistrations.map((registration, index) => ({ name: registration.nickname || `Player ${index + 1}`, seed: index + 1, source: 'registration' as const }));
  }, [teams, confirmedRegistrations]);
  const recommended = useMemo(() => recommendTournament(participants.length), [participants.length]);

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (selected?.id) void loadDetails(selected.id); }, [selected?.id]);
  useEffect(() => { if (selected) syncFormFromSelected(selected); }, [selected?.id]);

  function syncFormFromSelected(t: TournamentRow) {
    const rules = t.rules || {};
    const bans = t.bans || {};
    setForm({
      name: t.name || '', description: t.description || '', coverUrl: t.cover_url || '', date: t.tournament_date || '',
      start: String(t.start_time || '').slice(0, 5), lobby: String(t.lobby_time || '').slice(0, 5), maxTeams: String(t.max_teams || 8),
      format: t.format || 'Da decidere dopo iscrizioni', type: t.type || 'Da decidere dopo iscrizioni', status: String(t.status || 'Bozza'),
      allowedPreset: rules.allowed_preset || 'Regole CODM competitive', allowedWeapons: listText(rules.allowed_weapons), bans: listText(bans.weapons || bans.items || bans.text), rules: rules.text || ''
    });
  }

  function recommendTournament(count: number) {
    if (count < 2) return { title: 'Servono almeno 2 iscritti', details: 'Apri iscrizioni e lascia iscrivere i player dal profilo.' };
    if (count <= 8) return { title: 'Consigliato: eliminazione diretta con eventuali bye', details: `${count} iscritti → tabellone da ${nextPowerOfTwo(count)} slot. Gestione veloce, stile torneo CODM.` };
    if (count <= 16) return { title: 'Consigliato: gruppi oppure eliminazione diretta', details: `${count} iscritti → 4 gruppi o ottavi/quarti in base al tempo disponibile.` };
    if (count <= 32) return { title: 'Consigliato: bracket 32 slot', details: 'Sedicesimi → Ottavi → Quarti → Semifinale → Finale.' };
    return { title: 'Consigliato: gruppi + finale', details: 'Tanti iscritti: meglio gruppi, top qualificati e bracket finale.' };
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
      supabase.from('codm_tournament_matches').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: true }),
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
      start_time: form.start || null, lobby_time: form.lobby || null, max_teams: Number(form.maxTeams) || Math.max(8, participants.length || 8),
      format: form.format, type: form.type, status: form.status,
      rules: { text: form.rules, bo: 'BO3', screenshot_required: true, mvp_required: true, allowed_preset: form.allowedPreset, allowed_weapons: splitLines(form.allowedWeapons) },
      bans: { text: form.bans, weapons: splitLines(form.bans) }
    };
    const query = selected?.id
      ? supabase.from('codm_tournaments').update(payload).eq('id', selected.id).select('*').single()
      : supabase.from('codm_tournaments').insert(payload).select('*').single();
    const { data, error } = await query;
    if (error) return setMessage(error.message);
    setMessage(selected?.id ? 'Torneo aggiornato. Puoi cambiare formato e tipo anche dopo le iscrizioni.' : 'Torneo creato. Ora apri iscrizioni: i player si iscrivono dal profilo, le squadre si creano dopo.');
    await load();
    if (data?.id) setSelectedId(data.id);
  }

  async function deleteTournament() {
    if (!selected?.id) return;
    if (!canWrite) return setMessage('Solo staff può eliminare il torneo.');
    if (!confirmDelete) { setConfirmDelete(true); return setMessage('Premi di nuovo ELIMINA TORNEO per confermare. Verranno eliminate iscrizioni, squadre, partite e file collegati.'); }
    const { error } = await supabase.from('codm_tournaments').delete().eq('id', selected.id);
    if (error) return setMessage(error.message);
    setConfirmDelete(false);
    setSelectedId('');
    setMessage('Torneo eliminato con dati collegati.');
    await load();
  }

  async function registerMe() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!auth.user) return setMessage('Accedi con il tuo profilo per iscriverti.');
    if (selected.status !== 'Iscrizioni aperte') return setMessage('Le iscrizioni non sono aperte per questo torneo.');
    const nickname = nicknameFromUser(auth.user);
    const payload = { tournament_id: selected.id, user_id: auth.user.id, nickname, note: registrationNote || null, status: 'In attesa' };
    const existing = registrations.find((r) => r.user_id === auth.user?.id);
    const { error } = existing
      ? await supabase.from('codm_tournament_registrations').update({ nickname, note: registrationNote || null, status: existing.status === 'Ritirata' ? 'In attesa' : existing.status }).eq('id', existing.id)
      : await supabase.from('codm_tournament_registrations').insert(payload);
    if (error) return setMessage(error.message);
    setMessage('Iscrizione inviata/confermata. Ora lo staff può confermare, mettere riserva o rifiutare.');
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
    const expected = Number(String(form.format).replace(/v.*/i, '')) || 5;
    const names = confirmedRegistrations.map((r) => r.nickname).filter(Boolean).slice(0, expected).join('\n');
    setTeamForm((current) => ({ ...current, players: names, captain: confirmedRegistrations[0]?.nickname || current.captain, name: current.name || `Team ${teams.length + 1}` }));
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

  function buildGeneratedMatches() {
    const list = participants.map((p) => p.name).filter(Boolean);
    if (list.length < 2 || !selected?.id) return [] as any[];
    const type = generationMode === 'auto' ? String(form.type || selected.type || recommended.title).toLowerCase() : generationMode.toLowerCase();
    const generated: any[] = [];
    if (type.includes('grupp') || type.includes('girone')) {
      const groupCount = list.length >= 16 ? 4 : list.length >= 8 ? 2 : 1;
      const groups = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
      const buckets = groups.map(() => [] as string[]);
      list.forEach((name, i) => buckets[i % groupCount].push(name));
      for (let g = 0; g < buckets.length; g += 1) {
        for (let i = 0; i < buckets[g].length; i += 1) {
          for (let j = i + 1; j < buckets[g].length; j += 1) {
            generated.push(matchPayload(buckets[g][i], buckets[g][j], 'Girone', groups[g], generated.length));
          }
        }
      }
      return generated;
    }
    const size = nextPowerOfTwo(list.length);
    const phase = phaseForSize(size);
    const padded = [...list, ...Array.from({ length: size - list.length }, () => 'BYE')];
    for (let i = 0; i < padded.length; i += 2) {
      const a = padded[i]; const b = padded[i + 1];
      generated.push({ ...matchPayload(a, b, phase, 'Bracket', generated.length), status: a === 'BYE' || b === 'BYE' ? 'Finita' : 'Da giocare', winner: a === 'BYE' ? b : b === 'BYE' ? a : null, notes: `${rulesSummary()}${a === 'BYE' || b === 'BYE' ? '\nBye automatico.' : ''}` });
    }
    return generated;
  }

  function matchPayload(teamA: string, teamB: string, phase: string, group: string, index: number) {
    return { tournament_id: selected?.id, team_a: teamA, team_b: teamB, phase, group_name: group, map_name: codmMaps[index % codmMaps.length], mode: codmModes[index % codmModes.length], status: 'Da giocare', notes: rulesSummary() };
  }

  function rulesSummary() {
    return `Armi permesse: ${splitLines(form.allowedWeapons).join(', ') || form.allowedPreset}. Ban: ${splitLines(form.bans).join(', ') || '-'}`;
  }

  async function generateMatches() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!canWrite) return setMessage('Solo staff può generare tabellone.');
    const generated = buildGeneratedMatches();
    if (!generated.length) return setMessage('Servono almeno 2 iscritti confermati o 2 squadre.');
    if (matches.length && !window.confirm('Sostituire il tabellone/partite esistenti del torneo?')) return;
    if (matches.length) await supabase.from('codm_tournament_matches').delete().eq('tournament_id', selected.id);
    const { error } = await supabase.from('codm_tournament_matches').insert(generated);
    if (error) return setMessage(error.message);
    setMessage(`Generate ${generated.length} partite. Clicca una partita per inserire o modificare risultato.`);
    await loadDetails(selected.id);
    setActive('bracket');
  }

  function editMatch(match: MatchRow) {
    setMatchForm({ id: match.id, teamA: match.team_a || '', teamB: match.team_b || '', phase: match.phase || 'Girone', group: match.group_name || 'A', date: match.match_time ? String(match.match_time).slice(0, 16) : '', lobby: match.lobby_time ? String(match.lobby_time).slice(0, 16) : '', map: match.map_name || 'Standoff', mode: match.mode || 'CED', scoreA: match.score_a == null ? '' : String(match.score_a), scoreB: match.score_b == null ? '' : String(match.score_b), winner: match.winner || '', mvp: match.mvp || '', status: match.status || 'Da giocare', screenshotUrl: match.screenshot_url || '', notes: match.notes || '' });
    setActive('matches');
    setMessage(`Modifica partita: ${match.team_a || '-'} vs ${match.team_b || '-'}.`);
  }

  async function saveMatch() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!canWrite) return setMessage('Solo staff può salvare partite torneo.');
    const scoreA = matchForm.scoreA === '' ? null : Number(matchForm.scoreA);
    const scoreB = matchForm.scoreB === '' ? null : Number(matchForm.scoreB);
    const winner = matchForm.winner || (scoreA !== null && scoreB !== null ? (scoreA > scoreB ? matchForm.teamA : scoreB > scoreA ? matchForm.teamB : 'Pareggio') : null);
    const payload = { tournament_id: selected.id, team_a: matchForm.teamA, team_b: matchForm.teamB, phase: matchForm.phase, group_name: matchForm.group, match_time: matchForm.date || null, lobby_time: matchForm.lobby || null, map_name: matchForm.map, mode: matchForm.mode, status: scoreA !== null && scoreB !== null ? 'Finita' : matchForm.status, score_a: scoreA, score_b: scoreB, winner, mvp: matchForm.mvp || null, screenshot_url: matchForm.screenshotUrl || null, notes: `${matchForm.notes || ''}\n${rulesSummary()}`.trim() };
    const query = matchForm.id ? supabase.from('codm_tournament_matches').update(payload).eq('id', matchForm.id) : supabase.from('codm_tournament_matches').insert(payload);
    const { error } = await query;
    if (error) return setMessage(error.message);
    if (winner && winner !== 'Pareggio' && matchForm.id) await advanceWinner(matchForm, winner);
    setMessage(matchForm.id ? 'Risultato aggiornato. Vincitore verde, eliminato rosso nel tabellone.' : 'Partita torneo salvata.');
    setMatchForm((m) => ({ ...m, id: '' }));
    await loadDetails(selected.id);
  }

  async function advanceWinner(current: typeof matchForm, winner: string) {
    const np = nextPhase(current.phase);
    if (!np || np === 'Vincitore') return;
    const nextMatch = matches.find((m) => m.phase === np && (!m.team_a || !m.team_b || String(m.team_a).startsWith('Vincitore') || String(m.team_b).startsWith('Vincitore')));
    if (!nextMatch) return;
    const patch = !nextMatch.team_a || String(nextMatch.team_a).startsWith('Vincitore') ? { team_a: winner } : { team_b: winner };
    await supabase.from('codm_tournament_matches').update(patch).eq('id', nextMatch.id);
  }

  const standings = useMemo(() => {
    const map = new Map<string, { team: string; played: number; wins: number; draws: number; losses: number; points: number; diff: number; status: string }>();
    participants.forEach((p) => map.set(p.name, { team: p.name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, diff: 0, status: 'In attesa' }));
    for (const m of matches) {
      if (m.score_a == null || m.score_b == null || !m.team_a || !m.team_b || m.team_a === 'BYE' || m.team_b === 'BYE') continue;
      const a = map.get(m.team_a) || { team: m.team_a, played: 0, wins: 0, draws: 0, losses: 0, points: 0, diff: 0, status: 'In attesa' };
      const b = map.get(m.team_b) || { team: m.team_b, played: 0, wins: 0, draws: 0, losses: 0, points: 0, diff: 0, status: 'In attesa' };
      a.played += 1; b.played += 1; a.diff += (m.score_a - m.score_b); b.diff += (m.score_b - m.score_a);
      if (m.score_a > m.score_b) { a.wins++; b.losses++; a.points += 3; }
      else if (m.score_b > m.score_a) { b.wins++; a.losses++; b.points += 3; }
      else { a.draws++; b.draws++; a.points++; b.points++; }
      map.set(a.team, a); map.set(b.team, b);
    }
    return Array.from(map.values()).sort((a,b) => b.points-a.points || b.diff-a.diff || a.team.localeCompare(b.team));
  }, [participants, matches]);

  const groupedMatches = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of matches) {
      const key = m.phase || 'Partite';
      map.set(key, [...(map.get(key) || []), m]);
    }
    return Array.from(map.entries()).sort((a,b) => phasesOrder.indexOf(a[0]) - phasesOrder.indexOf(b[0]));
  }, [matches]);

  const tournamentStats = useMemo(() => ({ played: matches.filter((m) => m.score_a != null && m.score_b != null).length, pending: matches.filter((m) => m.score_a == null || m.score_b == null).length, registrations: registrations.length, confirmed: confirmedRegistrations.length, participants: participants.length }), [matches, registrations, confirmedRegistrations, participants]);

  const tabs = [['dashboard', '📌 Dashboard'], ['manage', '🛠️ Crea / Gestisci'], ['registrations', '📝 Iscrizioni'], ['teams', '👥 Squadre dopo iscrizioni'], ['rules', '📜 Regole / Armi'], ['bracket', '📊 Tabellone'], ['matches', '🎮 Partita / Risultato'], ['archive', '🗂️ Archivio']];

  return (
    <main className="container wide tournament-page tournament-pro-page tournament-v11-page">
      <section className="card ak-section-head tournament-head">
        <p className="eyebrow">🏆 TORNEO PRO</p>
        <h1>Gestione torneo CODM guidata</h1>
        <p className="muted">Prima apri iscrizioni, poi decidi formato, generi tabellone/classifica e clicchi la partita per inserire risultato. Le statistiche torneo restano solo qui.</p>
        <div className="tournament-tabs">{tabs.map(([id, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>{label}</button>)}</div>
        <div className="top-gap grid grid-2"><div className="field"><label>Torneo selezionato</label><select className="select pro-select" value={selected?.id || ''} onChange={(e)=>setSelectedId(e.target.value)}><option value="">Nessun torneo</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.status}</option>)}</select></div><div className="notice">{message || (loading ? 'Caricamento tornei...' : 'Pronto.')}</div></div>
      </section>

      {active === 'dashboard' && <section className="grid grid-4 top-gap"><div className="kpi"><span>Torneo attivo</span><strong>{activeTournament?.name || '-'}</strong></div><div className="kpi"><span>Iscritti confermati</span><strong>{tournamentStats.confirmed}/{tournamentStats.registrations}</strong></div><div className="kpi"><span>Partecipanti tabellone</span><strong>{tournamentStats.participants}</strong></div><div className="kpi"><span>Partite finite/aperte</span><strong>{tournamentStats.played}/{tournamentStats.pending}</strong></div><div className="card grid-span-2"><h2>Flusso semplice</h2><ol className="pro-steps"><li>Crea torneo e apri iscrizioni</li><li>Player clicca Iscriviti dal profilo</li><li>Admin conferma iscritti</li><li>Admin sceglie formato/tipo e genera tabellone</li><li>Clic partita → inserisci risultato → vincitore verde</li></ol></div><div className="card grid-span-2"><h2>Consiglio automatico</h2><p><b>{recommended.title}</b></p><p className="muted">{recommended.details}</p><button className="btn small secondary" onClick={() => setActive('bracket')}>Apri tabellone</button></div></section>}

      {active === 'manage' && <section className="card top-gap"><div className="section-title"><div><h2>Crea / modifica torneo</h2><p className="muted">Tipo e formato si possono cambiare anche dopo aver raccolto iscrizioni.</p></div>{selected?.id && <button className="btn danger" onClick={deleteTournament}>🗑️ {confirmDelete ? 'CONFERMA ELIMINA TORNEO' : 'Elimina torneo'}</button>}</div><div className="grid grid-3 top-gap"><div className="field"><label>Nome torneo</label><input className="input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></div><div className="field"><label>Data torneo</label><input className="input" type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}/></div><div className="field"><label>Stato</label><select className="select pro-select" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Orario inizio</label><input className="input" type="time" value={form.start} onChange={(e)=>setForm({...form,start:e.target.value})}/></div><div className="field"><label>Apertura lobby</label><input className="input" type="time" value={form.lobby} onChange={(e)=>setForm({...form,lobby:e.target.value})}/></div><div className="field"><label>Numero previsto</label><input className="input" inputMode="numeric" value={form.maxTeams} onChange={(e)=>setForm({...form,maxTeams:e.target.value})}/></div><div className="field"><label>Formato</label><select className="select pro-select" value={form.format} onChange={(e)=>setForm({...form,format:e.target.value})}>{formats.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Tipo torneo</label><select className="select pro-select" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}>{tournamentTypes.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Cover torneo/link immagine</label><input className="input" value={form.coverUrl} onChange={(e)=>setForm({...form,coverUrl:e.target.value})}/></div><div className="field grid-span-3"><label>Descrizione breve</label><input className="input" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></div></div><button className="btn top-gap" onClick={saveTournament}>💾 {selected?.id ? 'Aggiorna torneo selezionato' : 'Crea torneo'}</button></section>}

      {active === 'registrations' && <section className="grid grid-2 top-gap"><div className="card"><h2>Iscrizione dal profilo</h2><p className="muted">Le squadre si creano dopo. Qui il player si iscrive come profilo singolo.</p><div className="notice"><b>Stato tuo profilo:</b> {myRegistration ? registrationBadge(myRegistration.status) : 'Non iscritto'}</div><textarea className="textarea top-gap" value={registrationNote} onChange={(e)=>setRegistrationNote(e.target.value)} placeholder="Note iscrizione: ruolo, orari, preferenze squadra..." /><button className="btn top-gap" onClick={registerMe} disabled={!auth.user || selected?.status !== 'Iscrizioni aperte'}>📝 Iscriviti / conferma iscrizione</button>{selected?.status !== 'Iscrizioni aperte' && <small className="muted">Metti il torneo in “Iscrizioni aperte”.</small>}</div><div className="card"><div className="section-title"><div><h2>Lista iscrizioni</h2><p className="muted">Dopo conferma puoi generare torneo o creare squadre.</p></div>{canWrite && <button className="btn small secondary" type="button" onClick={fillTeamFromRegistrations}>Crea squadra dagli iscritti</button>}</div><div className="tournament-team-list top-gap">{registrations.map((r)=><article key={r.id} className="compact-card"><b>{r.nickname || 'Player'}</b><span>{registrationBadge(r.status)}</span><small>{r.note || '-'}</small>{canWrite && <div className="cal-buttons top-gap"><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Confermata')}>Conferma</button><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Riserva')}>Riserva</button><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Rifiutata')}>Rifiuta</button></div>}</article>)}{!registrations.length && <div className="empty-state">Nessuna iscrizione ancora.</div>}</div></div></section>}

      {active === 'teams' && <section className="card top-gap"><h2>Squadre dopo iscrizioni</h2><p className="muted">Per 1v1 puoi anche non creare squadre: il tabellone usa gli iscritti confermati. Per 2v2/5v5 crea squadre dagli iscritti.</p><div className="grid grid-3"><div className="field"><label>Nome squadra</label><input className="input" value={teamForm.name} onChange={(e)=>setTeamForm({...teamForm,name:e.target.value})}/></div><div className="field"><label>Capitano</label><input className="input" value={teamForm.captain} onChange={(e)=>setTeamForm({...teamForm,captain:e.target.value})}/></div><div className="field"><label>Stato squadra</label><select className="select pro-select" value={teamForm.status} onChange={(e)=>setTeamForm({...teamForm,status:e.target.value})}>{['Incompleta','Completa','Confermata','Eliminata'].map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Titolari</label><textarea className="textarea" value={teamForm.players} onChange={(e)=>setTeamForm({...teamForm,players:e.target.value})} /></div><div className="field"><label>Riserve</label><textarea className="textarea" value={teamForm.reserves} onChange={(e)=>setTeamForm({...teamForm,reserves:e.target.value})} /></div><div className="field"><label>Azione</label><button className="btn" onClick={saveTeam}>➕ Aggiungi squadra</button></div></div><div className="tournament-team-list top-gap">{teams.map(t=><article key={t.id} className="compact-card"><b>{t.name}</b><span>{teamCompleteness(t, form.format || '5v5')}</span><small>Capitano: {t.captain || '-'} · Titolari: {t.players?.length || 0} · Riserve: {t.reserves?.length || 0}</small></article>)}</div></section>}

      {active === 'rules' && <section className="card top-gap"><h2>Regolamento, armi permesse e ban</h2><div className="grid grid-2"><div className="field"><label>Tipologia armi permesse</label><select className="select pro-select" value={form.allowedPreset} onChange={(e)=>setForm({...form,allowedPreset:e.target.value})}>{allowedWeaponPresets.map((w)=><option key={w}>{w}</option>)}</select><textarea className="textarea top-gap" value={form.allowedWeapons} onChange={(e)=>setForm({...form,allowedWeapons:e.target.value})} placeholder="Esempio: AR, SMG, Sniper, Pistol..." /></div><div className="field"><label>🚫 Armi / oggetti vietati</label><textarea className="textarea" value={form.bans} onChange={(e)=>setForm({...form,bans:e.target.value})} placeholder="NA45, Persistence, Martirio..." /></div><div className="field grid-span-2"><label>Regole generali</label><textarea className="textarea" value={form.rules} onChange={(e)=>setForm({...form,rules:e.target.value})} placeholder="BO3, ritardo massimo, screenshot obbligatorio, MVP..." /></div></div><button className="btn top-gap" onClick={saveTournament}>💾 Salva regolamento</button></section>}

      {active === 'bracket' && <section className="card top-gap"><div className="section-title"><div><h2>Tabellone / Classifica</h2><p className="muted">Partecipanti attuali: {participants.length}. {recommended.title} — {recommended.details}</p></div><div className="cal-buttons"><select className="select pro-select" value={generationMode} onChange={(e)=>setGenerationMode(e.target.value)}><option value="auto">Auto consigliato</option><option value="Eliminazione diretta">Eliminazione diretta</option><option value="A gruppi">Gruppi/Girone</option></select><button className="btn small secondary" type="button" onClick={generateMatches}>⚡ Genera torneo</button></div></div><div className="tournament-bracket-board top-gap">{groupedMatches.map(([phase, rows])=><div className="bracket-column" key={phase}><h3>{phase}</h3>{rows.map((m)=><button key={m.id} className="bracket-match" onClick={()=>editMatch(m)}><span className={resultClass(m, m.team_a)}>{m.team_a || 'Da definire'}</span><b>{m.score_a ?? '-'}</b><span className={resultClass(m, m.team_b)}>{m.team_b || 'Da definire'}</span><b>{m.score_b ?? '-'}</b><small>{m.map_name || '-'} · {m.mode || '-'}</small></button>)}</div>)}{!matches.length && <div className="empty-state">Genera il torneo dopo le iscrizioni per vedere qui il tabellone grafico.</div>}</div><h3 className="top-gap">Classifica gironi/gruppi</h3><div className="table-scroll"><table className="table compact pro-table"><thead><tr><th>Pos.</th><th>Squadra/player</th><th>G</th><th>V</th><th>P</th><th>S</th><th>Pt</th><th>Diff</th><th>Stato</th></tr></thead><tbody>{standings.map((s,i)=><tr key={s.team}><td>{i+1}</td><td>{s.team}</td><td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td><td>{s.points}</td><td>{s.diff}</td><td>{i < 4 ? '🟢 Qualificato' : '🔴 Eliminato'}</td></tr>)}</tbody></table></div></section>}

      {active === 'matches' && <section className="card top-gap"><div className="section-title"><div><h2>{matchForm.id ? 'Modifica risultato partita' : 'Partita torneo'}</h2><p className="muted">Clicca una partita dal tabellone oppure crea una partita manuale. Vincitore verde, eliminato rosso.</p></div><button className="btn small secondary" type="button" onClick={() => setActive('bracket')}>Apri tabellone</button></div><div className="grid grid-4"><div className="field"><label>Team A</label><input className="input" value={matchForm.teamA} onChange={(e)=>setMatchForm({...matchForm,teamA:e.target.value})}/></div><div className="field"><label>Team B</label><input className="input" value={matchForm.teamB} onChange={(e)=>setMatchForm({...matchForm,teamB:e.target.value})}/></div><div className="field"><label>Fase</label><select className="select pro-select" value={matchForm.phase} onChange={(e)=>setMatchForm({...matchForm,phase:e.target.value})}>{['Girone', ...phasesOrder].map((p)=><option key={p}>{p}</option>)}</select></div><div className="field"><label>Gruppo/Turno</label><input className="input" value={matchForm.group} onChange={(e)=>setMatchForm({...matchForm,group:e.target.value})}/></div><div className="field"><label>Orario match</label><input className="input" type="datetime-local" value={matchForm.date} onChange={(e)=>setMatchForm({...matchForm,date:e.target.value})}/></div><div className="field"><label>Mappa</label><select className="select pro-select" value={matchForm.map} onChange={(e)=>setMatchForm({...matchForm,map:e.target.value})}>{codmMaps.map(m=><option key={m}>{m}</option>)}</select></div><div className="field"><label>Modalità</label><select className="select pro-select" value={matchForm.mode} onChange={(e)=>setMatchForm({...matchForm,mode:e.target.value})}>{codmModes.map(m=><option key={m}>{m}</option>)}</select></div><div className="field"><label>Risultato</label><div className="score-inline"><input className="input" value={matchForm.scoreA} onChange={(e)=>setMatchForm({...matchForm,scoreA:e.target.value.replace(/[^0-9]/g,'')})}/><span>:</span><input className="input" value={matchForm.scoreB} onChange={(e)=>setMatchForm({...matchForm,scoreB:e.target.value.replace(/[^0-9]/g,'')})}/></div></div><div className="field"><label>MVP</label><input className="input" value={matchForm.mvp} onChange={(e)=>setMatchForm({...matchForm,mvp:e.target.value})}/></div><div className="field"><label>Screenshot prova/link</label><input className="input" value={matchForm.screenshotUrl} onChange={(e)=>setMatchForm({...matchForm,screenshotUrl:e.target.value})}/></div><div className="field grid-span-2"><label>Note</label><input className="input" value={matchForm.notes} onChange={(e)=>setMatchForm({...matchForm,notes:e.target.value})}/></div></div><div className="notice top-gap"><b>Regole partita:</b> {rulesSummary()}</div><button className="btn top-gap" onClick={saveMatch}>💾 {matchForm.id ? 'Aggiorna risultato partita' : 'Salva partita torneo'}</button><div className="tournament-team-list top-gap">{matches.map(m=><article key={m.id} className="compact-card clickable-card" onClick={()=>editMatch(m)}><b>{m.team_a || '-'} vs {m.team_b || '-'}</b><span>{m.status || 'Da giocare'} · {m.score_a ?? '-'}:{m.score_b ?? '-'}</span><small>{m.phase} · {m.group_name} · {m.map_name} · {m.mode} · MVP {m.mvp || '-'}</small></article>)}</div></section>}

      {active === 'archive' && <section className="card top-gap"><h2>Archivio tornei</h2><div className="tournament-team-list">{tournaments.filter(t=>['Finito','Archiviato'].includes(String(t.status))).map(t=><article key={t.id} className="compact-card"><b>{t.name}</b><span>{t.status}</span><small>Vincitore: {t.winner || 'da definire'} · statistiche finali sempre nella pagina Torneo.</small></article>)}</div></section>}
    </main>
  );
}
