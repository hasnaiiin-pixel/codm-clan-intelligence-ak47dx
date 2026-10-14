'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth } from '@/lib/authRoles';
import { makeRepechageBuckets, roundRobinPairs } from '@/lib/tournamentRepechage';
import AdvancedBracketCenter from './AdvancedBracketCenter';
import AdvancedTournamentCalendar from './AdvancedTournamentCalendar';
import TournamentSignupAdmin, { type PublicSignup } from './TournamentSignupAdmin';
import TournamentExportCenter from './TournamentExportCenter';
import {qualificationSlots,resolvedQualificationNames} from '@/lib/tournamentQualification';
import { CODM_MULTIPLAYER_MAPS, CODM_WEAPONS } from '@/lib/codmTournamentCatalog';

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
  public_signup_privacy_url?: string | null;
  public_signup_limit?: number | null;
  public_signup_controller_name?: string | null;
};
type TeamRow = { id: string; tournament_id: string; name: string; captain?: string | null; status?: string | null; logo_url?: string | null; players?: string[] | null; reserves?: string[] | null };
type RegistrationRow = { id: string; tournament_id: string; user_id?: string | null; team_id?: string | null; nickname?: string | null; status?: string | null; note?: string | null; created_at?: string };
type MatchRow = { id: string; tournament_id: string; team_a?: string | null; team_b?: string | null; phase?: string | null; group_name?: string | null; match_time?: string | null; lobby_time?: string | null; map_name?: string | null; mode?: string | null; status?: string | null; score_a?: number | null; score_b?: number | null; winner?: string | null; mvp?: string | null; screenshot_url?: string | null; notes?: string | null; lobby_name?: string | null; referee?: string | null; bracket_order?: number | null; score_limit?: number | null; next_match_id?: string | null };

type Participant = { name: string; seed: number; source: 'team' | 'registration' };

const statuses: TournamentStatus[] = ['Bozza', 'Iscrizioni aperte', 'Iscrizioni chiuse', 'In corso', 'Finito', 'Archiviato'];
const tournamentTypes = ['Da decidere dopo iscrizioni', 'Eliminazione diretta', 'A gruppi', 'A girone', 'Girone + eliminazione finale'];
const formats = ['Da decidere dopo iscrizioni', '1v1', '2v2', '3v3', '4v4', '5v5', 'Custom'];
const codmMaps: string[] = [...CODM_MULTIPLAYER_MAPS]; // FIX18: un catalogo condiviso per tutte le schermate tornei
const codmModes = ['CED', 'POSTAZIONE', 'DOMINIO', 'CONTROL', 'TDM', 'PRIMA_LINEA', 'KILL_CONFIRMED'];
const defaultScoreLimits:Record<string,number> = { CED:7, POSTAZIONE:250, DOMINIO:150, CONTROL:3, TDM:50, PRIMA_LINEA:50, KILL_CONFIRMED:40 };
const tournamentModeLabel=(m:string)=>m==='CONTROL'?'Controllo':m==='CED'?'CED / Cerca e Distruggi':m;
function dateLabel(value?:string|null){if(!value)return 'Data e ora da assegnare';const d=new Date(value);return Number.isNaN(d.valueOf())?'Data e ora da assegnare':d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function datetimeInput(value?:string|null){if(!value)return '';const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}


const allowedWeaponPresets = ['Regole CODM competitive', 'AR / SMG / Sniper consentiti', 'Solo armi standard CODM', 'No shotgun / no launcher', 'Regole CDL-like', 'Custom'];
const phasesOrder = ['Sedicesimi', 'Ottavi', 'Quarti', 'Semifinale', 'Finale', 'Vincitore'];


function readableDbError(error:unknown):string {
  if (error instanceof Error) return error.message;
  if(error && typeof error==='object') {
    const e=error as Record<string,unknown>;
    const fields=[e.code&&`[${e.code}]`,e.message,e.details&&`Dettagli: ${e.details}`,e.hint&&`Suggerimento: ${e.hint}`].filter(Boolean);
    if(fields.length)return fields.join(' — ');
    try {return JSON.stringify(error);}catch {return 'Errore database non serializzabile';}
  }
  return String(error);
}

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

function assignedWeaponFromNotes(notes?: string | null) {
  const text = String(notes || '');
  const match = text.match(/Arma sorteggiata:\s*([^\r\n]+)/i) || text.match(/Arma:\s*([^\r\n]+)/i);
  return match?.[1]?.trim() || '';
}
function scoreLabel(match: MatchRow) {
  return `${match.score_a ?? '–'} : ${match.score_b ?? '–'}`;
}

export default function TournamentPage() {
  const auth = useCodmAuth();
  const canWrite = auth.canWrite;
  const [active, setActive] = useState('dashboard');
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [publicSignups,setPublicSignups] = useState<PublicSignup[]>([]);
  const [rosterOptions,setRosterOptions]=useState<Array<{nickname:string}>>([]);
  const [rosterSearch,setRosterSearch]=useState('');
  const [rosterLoading,setRosterLoading]=useState(false);
  const [rosterNotice,setRosterNotice]=useState('');
  const [manualNick,setManualNick]=useState('');
  const [editingTeamId,setEditingTeamId]=useState('');
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [message, setMessage] = useState('');
  const [mapSearch, setMapSearch] = useState('');
  const [weaponCategory, setWeaponCategory] = useState('Fucili d’assalto (AR)');
  const [cloneIncludeTeams, setCloneIncludeTeams] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', coverUrl: '', date: '', start: '', lobby: '', maxTeams: '8', format: 'Da decidere dopo iscrizioni', type: 'Da decidere dopo iscrizioni', status: 'Bozza', allowedPreset: 'Regole CODM competitive', allowedWeapons: '', bans: '', rules: '', signupPrivacyUrl: '/privacy', signupLimit: '', signupControllerName: '' });
  const [registrationNote, setRegistrationNote] = useState('');
  const [teamForm, setTeamForm] = useState({ name: '', captain: '', players: '', reserves: '', status: 'Incompleta' });
  const [matchForm, setMatchForm] = useState({ id: '', teamA: '', teamB: '', phase: 'Girone', group: 'A', date: '', lobby: '', map: 'Standoff', mode: 'CED', scoreLimit:'7', scoreA: '', scoreB: '', winner: '', mvp: '', status: 'Da giocare', screenshotUrl: '', notes: '', lobbyName: '', referee: '' });
  const [generationMode, setGenerationMode] = useState('auto');
  const [groupCount,setGroupCount]=useState(3);
  const [qualifiersPerGroup,setQualifiersPerGroup]=useState(2);
  const [secondChance,setSecondChance]=useState(false);
  const [secondChancePending,setSecondChancePending]=useState(false);
  const [secondChanceFormat,setSecondChanceFormat]=useState<'groups'|'knockout'>('knockout');
  const [secondChanceSlots,setSecondChanceSlots]=useState(1);
  const [tournamentBusy,setTournamentBusy]=useState(false);
  const [selectedModes,setSelectedModes]=useState<string[]>(['CED','POSTAZIONE','DOMINIO','CONTROL']);
  const [selectedMaps,setSelectedMaps]=useState<string[]>(['Standoff','Raid','Firing Range','Tunisia','Crash']);
  const [scoreLimits,setScoreLimits]=useState<Record<string,number>>({...defaultScoreLimits});
  const [lobbyCount,setLobbyCount]=useState(2);
  const [slotMinutes,setSlotMinutes]=useState(30);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = tournaments.find((t) => t.id === selectedId) || (!selectedId?tournaments[0]:null) || null;
  const selectedRef = useRef('');
  const detailsSeq = useRef(0);
  selectedRef.current = selected?.id || '';
  const [updatedAt,setUpdatedAt]=useState('');
  const activeTournament = selected;
  const myRegistration = registrations.find((r) => r.user_id === auth.user?.id);
  const confirmedRegistrations = registrations.filter((r) => r.status === 'Confermata');
  const participants: Participant[] = useMemo(() => {
    if (teams.length) return teams.map((team, index) => ({ name: team.name, seed: index + 1, source: 'team' as const }));
    if (!/^1v1$/i.test(String(selected?.format||form.format))) return [];
    return confirmedRegistrations.map((registration, index) => ({ name: registration.nickname || `Player ${index + 1}`, seed: index + 1, source: 'registration' as const }));
  }, [teams, confirmedRegistrations, selected?.format, form.format]);
  const recommended = useMemo(() => recommendTournament(participants.length), [participants.length]);
  const teamLabel=(name?:string|null)=>name||'Da definire';
  const teamPlayers=(name?:string|null)=>(teams.find(t=>t.name===name)?.players||[]).join(' · ');
  function toggleChoice(value:string,current:string[],setter:(next:string[])=>void){setter(current.includes(value)?current.filter(x=>x!==value):[...current,value]);}

  // FIX26: soltanto le iscrizioni confermate del torneo corrente entrano nelle scelte operative.
  const filteredRosterOptions = useMemo(() => confirmedRegistrations.filter(p=>(p.nickname||'').toLocaleLowerCase('it-IT').includes(rosterSearch.trim().toLocaleLowerCase('it-IT'))).map(p=>({nickname:p.nickname||''})).slice(0,200),[confirmedRegistrations,rosterSearch]);

  useEffect(() => { void load(); }, []);
  // Il roster può contenere giocatori da anagrafica, importazioni precedenti e iscrizioni.
  // Ricarica dopo il login: una query anonima (RLS) potrebbe restituire zero righe.
  // FIX26: niente import automatico dallo storico globale dei giocatori nella pagina del torneo.
  // Il roster globale resta disponibile nelle funzioni clan, non nelle iscrizioni del torneo.

  async function loadRosterOptions() {
    setRosterLoading(true);
    setRosterNotice('');
    const names = new Map<string, string>();
    const errors: string[] = [];
    const addName = (value: unknown) => {
      const name = String(value || '').trim();
      if (name && name.length <= 80 && !/^player(?:\s+non\s+letto|\s+\d+)?$/i.test(name)) {
        const key = name.toLocaleLowerCase('it-IT');
        if (!names.has(key)) names.set(key, name);
      }
    };
    // Paginazione: Supabase limita normalmente una richiesta a 1000 record.
    async function collect(table: string, columns: string, read: (row: any) => void, allyOnly = false) {
      for (let offset = 0; offset < 10000; offset += 1000) {
        const query = supabase.from(table).select(columns).order('id').range(offset, offset + 999);
        const { data, error } = await query;
        if (error) { errors.push(`${table}: ${error.message}`); break; }
        // La selezione delle colonne è dinamica: Supabase non può inferire il tipo
        // della riga e genera GenericStringError a compile-time. Validiamo che
        // il risultato sia un array e leggiamo team_side come campo opzionale.
        const rows = Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : [];
        for (const row of rows) {
          if (!allyOnly || String(row['team_side'] ?? '').toUpperCase() !== 'ENEMY') read(row);
        }
        if (rows.length < 1000) break;
      }
    }
    try {
      await collect('players', 'nickname', row => addName(row.nickname));
      await collect('match_scoreboard_rows', 'nickname_resolved,nickname_raw,team_side', row => addName(row.nickname_resolved || row.nickname_raw), true);
      await collect('codm_tournament_registrations', 'nickname', row => addName(row.nickname));
      setRosterOptions(Array.from(names.values()).sort((a,b) => a.localeCompare(b,'it')).map(nickname => ({nickname})));
      if (errors.length) setRosterNotice(`Alcune fonti non sono disponibili (${errors.join('; ')}). Puoi comunque inserire nomi manualmente.`);
      else if (!names.size) setRosterNotice('Nessun giocatore trovato: controlla accesso, permessi Supabase oppure aggiungi nomi manualmente.');
    } catch (error) {
      setRosterNotice(error instanceof Error ? error.message : 'Errore nel caricamento del roster.');
    } finally { setRosterLoading(false); }
  }

  useEffect(() => {
    // Svuota sempre il torneo precedente prima di caricare il successivo.
    detailsSeq.current += 1;
    setTeams([]);setMatches([]);setRegistrations([]);setPublicSignups([]);
    setEditingTeamId('');setManualNick('');setRosterSearch('');setMessage('');
    if (selected?.id) void loadDetails(selected.id);
  }, [selected?.id, auth.canWrite]);
  useEffect(() => {
    const id=selected?.id;
    if(!id)return;
    // Realtime richiede la publication Supabase; il polling ripristina l'aggiornamento
    // anche quando il realtime non e' abilitato dal provider o l'app riapre dalla PWA.
    const refresh=()=>{if(document.visibilityState==='visible'){void loadDetails(id);void refreshList();}};
    const interval=window.setInterval(refresh,20000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    const channel=supabase.channel(`ak26-tournament-${id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_teams',filter:`tournament_id=eq.${id}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_registrations',filter:`tournament_id=eq.${id}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_matches',filter:`tournament_id=eq.${id}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_public_signups',filter:`tournament_id=eq.${id}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournaments',filter:`id=eq.${id}`},refresh)
      .subscribe();
    return()=>{window.clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);void supabase.removeChannel(channel);};
  },[selected?.id,auth.canWrite]);
  useEffect(() => { if (selected) syncFormFromSelected(selected); }, [selected?.id]);

  function syncFormFromSelected(t: TournamentRow) {
    const rules = t.rules || {};
    const bans = t.bans || {};
    setForm({
      name: t.name || '', description: t.description || '', coverUrl: t.cover_url || '', date: t.tournament_date || '',
      start: String(t.start_time || '').slice(0, 5), lobby: String(t.lobby_time || '').slice(0, 5), maxTeams: String(t.max_teams || 8),
      format: t.format || 'Da decidere dopo iscrizioni', type: t.type || 'Da decidere dopo iscrizioni', status: String(t.status || 'Bozza'),
      allowedPreset: rules.allowed_preset || 'Regole CODM competitive', allowedWeapons: listText(rules.allowed_weapons), bans: listText(bans.weapons || bans.items || bans.text), rules: rules.text || '', signupPrivacyUrl:t.public_signup_privacy_url||'/privacy',signupLimit:String(t.public_signup_limit||''),signupControllerName:t.public_signup_controller_name||''
    });
    setSelectedModes(Array.isArray(rules.allowed_modes)&&rules.allowed_modes.length?rules.allowed_modes.filter((x:string)=>codmModes.includes(x)):['CED','POSTAZIONE','DOMINIO','CONTROL']);
    setSelectedMaps(Array.isArray(rules.allowed_maps)&&rules.allowed_maps.length?rules.allowed_maps.filter((x:string)=>typeof x==='string'&&x.trim()):['Standoff','Raid','Firing Range','Tunisia','Crash']);
    setScoreLimits({...defaultScoreLimits,...(rules.score_limits&&typeof rules.score_limits==='object'?rules.score_limits:{})});
    setLobbyCount(Math.min(4,Math.max(1,Number(rules.lobby_count)||2)));
    setSlotMinutes(Math.min(180,Math.max(10,Number(rules.slot_minutes)||30)));
    setGenerationMode(['auto','A gruppi','Eliminazione diretta'].includes(String(rules.generation_mode))?String(rules.generation_mode):'auto');
    setGroupCount(Math.min(16,Math.max(1,Number(rules.group_count)||3)));
    setQualifiersPerGroup(Math.min(16,Math.max(1,Number(rules.qualifiers_per_group)||2)));
    setSecondChance(Boolean(rules.second_chance));
    setSecondChancePending(Boolean(rules.second_chance_pending));
    setSecondChanceFormat(rules.second_chance_format==='groups'?'groups':'knockout');
    setSecondChanceSlots(Math.min(32,Math.max(1,Number(rules.second_chance_slots)||1)));
  }

  // Per rigenerare tutto non cancelliamo i risultati: creiamo una nuova edizione dagli iscritti.
  // Le vecchie iscrizioni/partite/statistiche e il vecchio tabellone rimangono intatti.
  async function regenerateFromRegistrations() {
    if (!selected?.id || !canWrite || tournamentBusy) return;
    if (!registrations.length) return setMessage('Non ci sono iscritti da cui ripartire.');
    const confirmation = window.prompt(`Creare una NUOVA edizione di «${selected.name}» con ${registrations.length} iscritti${cloneIncludeTeams?` e ${teams.length} squadre`:''}? Il torneo originale con tutti i risultati restera intatto. Scrivi RIGENERA per continuare.`);
    if (confirmation !== 'RIGENERA') return setMessage('Operazione annullata. Nessun dato modificato.');
    setTournamentBusy(true);
    try {
      const clonedRules = { ...(selected.rules && typeof selected.rules === 'object' ? selected.rules : {}) };
      delete clonedRules.advanced_bracket_v2;
      const { data: newTournament, error: tError } = await supabase.from('codm_tournaments').insert({
        name: `${selected.name} · Nuova edizione`, clan_id: (selected as any).clan_id || null,
        cover_url: selected.cover_url || null, description: selected.description || null,
        tournament_date: selected.tournament_date || null, start_time: selected.start_time || null,
        lobby_time: selected.lobby_time || null, max_teams: selected.max_teams || 64,
        format: selected.format || 'Da decidere dopo iscrizioni', type: selected.type || 'Da decidere dopo iscrizioni',
        status: 'Bozza', rules: clonedRules, bans: selected.bans || {}, winner: null
      }).select('id').single();
      if (tError || !newTournament?.id) throw tError || new Error('Creazione nuova edizione non riuscita.');
      const newId = newTournament.id as string;
      const newTeamIds = new Map<string,string>();
      if (cloneIncludeTeams && teams.length) {
        const { data: clonedTeams, error: teamError } = await supabase.from('codm_tournament_teams').insert(teams.map(t=>({
          tournament_id:newId,name:t.name,captain:t.captain||null,players:t.players||[],reserves:t.reserves||[],logo_url:t.logo_url||null,
          status: t.status === 'Eliminata' ? 'Completa' : (t.status || 'Incompleta')
        }))).select('id,name');
        if (teamError) throw new Error(`Nuova edizione creata ma copia squadre non riuscita: ${teamError.message}`);
        (clonedTeams||[]).forEach(t=>{const old=teams.find(x=>x.name===t.name);if(old)newTeamIds.set(old.id,t.id);});
      }
      const copy = registrations.map(r=>({
        tournament_id:newId,user_id:r.user_id||null,team_id:cloneIncludeTeams&&r.team_id?newTeamIds.get(r.team_id)||null:null,
        nickname:r.nickname||null,status:r.status||'In attesa',note:r.note||null
      }));
      const { error: rError } = await supabase.from('codm_tournament_registrations').insert(copy);
      if (rError) throw new Error(`Nuova edizione creata ma copia iscrizioni non riuscita: ${rError.message}. Apri la nuova edizione e completa il trasferimento prima di procedere.`);
      await load();
      setSelectedId(newId);
      setActive('registrations');
      setMessage(`Nuova edizione creata: ${registrations.length} iscritti copiati${cloneIncludeTeams?` e ${teams.length} squadre`:''}. Ora puoi rifare squadre, gironi e tabellone. L'originale è conservato.`);
    } catch (error) {
      setMessage(`Rigenerazione non completata: ${error instanceof Error?error.message:String(error)}. Il torneo originale è intatto; controlla se esiste una nuova edizione parziale.`);
      await load();
    } finally {setTournamentBusy(false);}
  }

  function recommendTournament(count: number) {
    if (count < 2) return { title: 'Servono almeno 2 iscritti', details: 'Apri iscrizioni e lascia iscrivere i player dal profilo.' };
    if (count <= 8) return { title: 'Consigliato: eliminazione diretta con eventuali bye', details: `${count} iscritti → tabellone da ${nextPowerOfTwo(count)} slot. Gestione veloce, stile torneo CODM.` };
    if (count <= 16) return { title: 'Consigliato: gruppi oppure eliminazione diretta', details: `${count} iscritti → 4 gruppi o ottavi/quarti in base al tempo disponibile.` };
    if (count <= 32) return { title: 'Consigliato: bracket 32 slot', details: 'Sedicesimi → Ottavi → Quarti → Semifinale → Finale.' };
    return { title: 'Consigliato: gruppi + finale', details: 'Tanti iscritti: meglio gruppi, top qualificati e bracket finale.' };
  }

  async function refreshList(){
    const {data,error}=await supabase.from('codm_tournaments').select('*').order('created_at',{ascending:false});
    if(!error)setTournaments((data||[]) as TournamentRow[]);
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
    const seq=++detailsSeq.current;
    const [teamResult, matchResult, registrationResult, publicResult] = await Promise.all([
      supabase.from('codm_tournament_teams').select('*').eq('tournament_id', tournamentId).order('name'),
      supabase.from('codm_tournament_matches').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: true }),
      supabase.from('codm_tournament_registrations').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false }),
      auth.canWrite ? supabase.from('codm_tournament_public_signups').select('id,tournament_id,surname,given_name,nickname,uid,status,consent_at,created_at,registration_id').eq('tournament_id', tournamentId).order('created_at', { ascending: false }):Promise.resolve({data:[],error:null})
    ]);
    if(seq!==detailsSeq.current||selectedRef.current!==tournamentId)return;
    if (!teamResult.error) setTeams((teamResult.data || []) as TeamRow[]);
    if (!matchResult.error) setMatches((matchResult.data || []) as MatchRow[]);
    if (!registrationResult.error) setRegistrations((registrationResult.data || []) as RegistrationRow[]);
    if (!publicResult.error) setPublicSignups((publicResult.data || []) as PublicSignup[]);
    else {setPublicSignups([]);if(auth.canWrite)setMessage(`Iscrizioni: ${publicResult.error.message}. Verifica la migrazione SQL FIX24.`);}
    setUpdatedAt(new Date().toLocaleTimeString('it-IT'));
  }

  async function saveTournament() {
    if (!canWrite) return setMessage('Solo Staff, Coach o Owner possono salvare tornei.');
    if (!form.name.trim()) return setMessage('Inserisci nome torneo.');
    if (form.signupPrivacyUrl.trim() && form.signupPrivacyUrl.trim()!=='/privacy' && !/^https:\/\//i.test(form.signupPrivacyUrl.trim())) return setMessage('L’informativa deve essere /privacy oppure un indirizzo HTTPS valido.');
    const payload = {
      name: form.name.trim(), public_signup_privacy_url:form.signupPrivacyUrl.trim()||'/privacy',public_signup_controller_name:form.signupControllerName.trim()||null,public_signup_limit:Math.max(1,Number(form.signupLimit)||0)||null, cover_url: form.coverUrl.trim() || null, description: form.description.trim() || null, tournament_date: form.date || null,
      start_time: form.start || null, lobby_time: form.lobby || null, max_teams: Number(form.maxTeams) || Math.max(8, participants.length || 8),
      format: form.format, type: form.type, status: form.status,
      rules: { ...(selected?.rules||{}), ...(selected?.rules?.advanced_bracket_config_v2 && !selected?.rules?.advanced_bracket_v2 ? {advanced_bracket_config_v2:{...selected.rules.advanced_bracket_config_v2,modes:selectedModes,mapModePool:Object.fromEntries(codmModes.map(mode=>[mode,[...selectedMaps]])),weapons:Object.fromEntries(Object.entries(CODM_WEAPONS).map(([cat,names])=>[cat,names.filter(name=>splitLines(form.allowedWeapons).includes(name))]))}} : {}), text: form.rules, bo: 'BO3', screenshot_required: true, mvp_required: true, allowed_preset: form.allowedPreset, allowed_weapons: splitLines(form.allowedWeapons), allowed_modes:selectedModes, allowed_maps:selectedMaps, score_limits:scoreLimits, lobby_count:lobbyCount, slot_minutes:slotMinutes, group_count:groupCount, qualifiers_per_group:qualifiersPerGroup, second_chance:secondChance, second_chance_pending:secondChancePending, second_chance_format:secondChanceFormat, second_chance_slots:secondChanceSlots, generation_mode:generationMode },
      bans: { text: form.bans, weapons: splitLines(form.bans) }
    };
    const query = selected?.id
      ? supabase.from('codm_tournaments').update(payload).eq('id', selected.id).select('*').single()
      : supabase.from('codm_tournaments').insert(payload).select('*').single();
    const { data, error } = await query;
    if (error) return setMessage(`Salvataggio torneo non riuscito: ${readableDbError(error)}`);
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
    if(selected.rules?.advanced_bracket_v2)return setMessage('Il torneo usa già il nuovo tabellone Winners/Losers. Apri Tabelloni 64.');
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

  async function addManualRegistration(){
    if(!selected?.id||!canWrite)return setMessage('Seleziona il torneo ed entra come Staff.');
    const names=splitLines(manualNick.replace(/;/g,'\n'));
    if(!names.length)return setMessage('Inserisci almeno un nome.');
    const existing=new Set(registrations.map(r=>String(r.nickname||'').trim().toLocaleLowerCase()));
    const toAdd=Array.from(new Set(names.map(n=>n.trim()).filter(Boolean))).filter(n=>!existing.has(n.toLocaleLowerCase()));
    if(!toAdd.length)return setMessage('Partecipanti già presenti. Nessun duplicato creato.');
    const {error}=await supabase.from('codm_tournament_registrations').insert(toAdd.map(n=>({tournament_id:selected.id,user_id:null,nickname:n,status:'Confermata',note:'Aggiunto dallo Staff'})));
    if(error)return setMessage(error.message);
    setManualNick('');setMessage(`${toAdd.length} partecipanti aggiunti dalla lista.`);await loadDetails(selected.id);
  }
  function editTeam(t:TeamRow){setEditingTeamId(t.id);setTeamForm({name:t.name,captain:t.captain||'',players:(t.players||[]).join('\n'),reserves:(t.reserves||[]).join('\n'),status:t.status||'Incompleta'});setActive('teams')}

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
    if(teams.some(t=>t.id!==editingTeamId&&t.name.toLowerCase()===teamForm.name.trim().toLowerCase()))return setMessage('Nome squadra già esistente nel torneo.');
    const selectedPlayers=splitLines(teamForm.players).map(n=>n.toLowerCase());
    const usedElsewhere=new Set(teams.filter(t=>t.id!==editingTeamId).flatMap(t=>[...(t.players||[]),...(t.reserves||[])].map(n=>n.toLowerCase())));
    if([...splitLines(teamForm.players),...splitLines(teamForm.reserves)].some(n=>usedElsewhere.has(n.toLowerCase())))return setMessage('Uno o più giocatori sono già assegnati a un’altra squadra.');
    const allowed=new Set(confirmedRegistrations.map(r=>String(r.nickname||'').trim().toLowerCase()).filter(Boolean));
    const assigned=[...splitLines(teamForm.players),...splitLines(teamForm.reserves)].map(s=>s.toLowerCase());
    if(teamForm.captain.trim()&&!allowed.has(teamForm.captain.trim().toLowerCase()))return setMessage('Anche il capitano deve essere confermato nel torneo selezionato.');
    if(assigned.some(name=>!allowed.has(name)))return setMessage('La squadra può usare soltanto giocatori confermati per il torneo selezionato. Aggiungi prima l’iscrizione in Iscrizioni.');
    if(new Set(assigned).size!==assigned.length)return setMessage('Lo stesso giocatore non può essere ripetuto come titolare o riserva.');
    if(editingTeamId && teams.find(t=>t.id===editingTeamId)?.name!==teamForm.name.trim() && matches.some(m=>m.team_a===teams.find(t=>t.id===editingTeamId)?.name||m.team_b===teams.find(t=>t.id===editingTeamId)?.name)) return setMessage('Squadra già presente in partite generate: non puoi cambiarne il nome senza riallineare gli incontri. Prima completa o correggi il calendario.');
    const { error } = editingTeamId ? await supabase.from('codm_tournament_teams').update(payload).eq('id',editingTeamId) : await supabase.from('codm_tournament_teams').insert(payload);
    if (error) return setMessage(error.message);
    setEditingTeamId('');setTeamForm({ name: '', captain: '', players: '', reserves: '', status: 'Incompleta' });
    setMessage('Squadra personalizzata salvata.');
    await loadDetails(selected.id);
  }

  // Programma automaticamente data, ora e lobby; una squadra non può essere assegnata due volte allo stesso slot.
  function scheduleMatches<T extends Record<string,any>>(generated:T[], phaseStart?:string):T[]{
    const date=form.date||selected?.tournament_date||'';
    const time=form.start||String(selected?.start_time||'').slice(0,5);
    if(!date||!time)return generated;
    let origin=new Date(`${date}T${time}:00`);
    if(Number.isNaN(origin.valueOf()))return generated;
    if(phaseStart){const last=matches.filter(m=>m.match_time).map(m=>new Date(String(m.match_time)).getTime()).filter(Number.isFinite);if(last.length)origin=new Date(Math.max(origin.getTime(),Math.max(...last)+slotMinutes*60000));}
    const slots=new Map<number,Set<string>>();
    return generated.map((m,index)=>{
      const a=String(m.team_a||''),b=String(m.team_b||'');
      let slot=0;
      for(;slot<2000;slot++){
        const used=slots.get(slot)||new Set<string>();
        if(used.size/2>=lobbyCount||used.has(a)||used.has(b))continue;
        used.add(a);used.add(b);slots.set(slot,used);break;
      }
      const scheduled=new Date(origin.getTime()+slot*slotMinutes*60000);
      const n=slots.get(slot)?.size||2;
      return {...m, match_time:scheduled.toISOString(),lobby_time:new Date(scheduled.getTime()-10*60000).toISOString(),lobby_name:`Lobby ${Math.min(lobbyCount,Math.ceil(n/2))}`};
    });
  }

  // La configurazione dei gironi è nel JSON rules esistente: nessuna migrazione SQL.
  async function persistGroupSettings(){
    if(!selected?.id)return false;
    if(matches.some(m=>m.phase!=='Girone')){setMessage('Formato bloccato dopo la creazione di ripescaggi o playoff.');return false;}
    const previous=selected.rules&&typeof selected.rules==='object'?selected.rules:{};
    const effectiveCount=Math.max(1,Math.min(groupCount,Math.floor(participants.length/2)));
    const rules={...previous,group_count:effectiveCount,qualifiers_per_group:qualifiersPerGroup,second_chance:secondChance,second_chance_pending:secondChancePending,second_chance_format:secondChanceFormat,second_chance_slots:secondChanceSlots,generation_mode:generationMode};
    const {data:savedRules,error}=await supabase.from('codm_tournaments').update({rules}).eq('id',selected.id).select('id').single();
    if(error||!savedRules){setMessage(`Configurazione gironi non salvata: ${readableDbError(error||new Error('Aggiornamento non confermato: verifica i permessi Supabase.'))}`);return false;}
    setTournaments(prev=>prev.map(t=>t.id===selected.id?{...t,rules}:t));
    return true;
  }

  function drawParticipants(list:string[]){
    const shuffled=[...list];
    for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    return shuffled;
  }

  // Crea un bracket completo con link tra gli incontri e gestisce i BYE del primo turno.
  // 'prefix' distingue il playoff principale dal ripescaggio; i risultati restano salvati nel database.
  function buildKnockout(names:string[],prefix:'Playoff'|'Ripescaggio',pathName:string){
    if(names.length<2)return [] as Array<Record<string,any>>;
    const size=nextPowerOfTwo(names.length),byes=size-names.length;
    const opening:string[]=[];
    for(let i=0;i<byes;i++)opening.push(names[i],'BYE');
    opening.push(...names.slice(byes));
    const first=phaseForSize(size);
    const rounds=phasesOrder.slice(phasesOrder.indexOf(first),phasesOrder.indexOf('Finale')+1);
    const all:Array<Record<string,any>>=[];
    const levels:Array<Array<Record<string,any>>>=[];
    rounds.forEach((round,roundIndex)=>{
      const count=size/(2**(roundIndex+1));
      const records=Array.from({length:count},(_,order)=>{
        const a=roundIndex===0?opening[order*2]:`Vincitore ${pathName} turno ${roundIndex} (${order*2+1})`;
        const b=roundIndex===0?opening[order*2+1]:`Vincitore ${pathName} turno ${roundIndex} (${order*2+2})`;
        const phase=prefix==='Ripescaggio'?`${pathName} - ${round}`:round;
        const base=matchPayload(a,b,phase,pathName,order);
        const winner=a==='BYE'?b:b==='BYE'?a:null;
        return {...base,id:crypto.randomUUID(),bracket_order:order,next_match_id:null,winner,status:winner?'Finita':'Da giocare',notes:`${base.notes || rulesSummary()}${winner?'\nPassaggio diretto (BYE).':''}`};
      });
      levels.push(records);all.push(...records);
    });
    for(let i=0;i<levels.length-1;i++)for(const child of levels[i]){
      const parent=levels[i+1][Math.floor(child.bracket_order/2)];
      child.next_match_id=parent.id;
      if(child.winner)parent[child.bracket_order%2===0?'team_a':'team_b']=child.winner;
    }
    return all;
  }

  async function clearGroups(){
    if(!selected?.id||!canWrite||tournamentBusy)return;
    const groupMatches=matches.filter(m=>m.phase==='Girone');
    if(!groupMatches.length)return setMessage('Nessun girone da cancellare.');
    if(matches.some(m=>m.phase!=='Girone'))return setMessage('Non puoi cancellare i gironi dopo aver generato ripescaggi o playoff. Conserva lo storico del torneo.');
    const played=groupMatches.filter(m=>m.score_a!=null||m.score_b!=null||m.screenshot_url||m.winner);
    if(played.length){
      const confirmation=window.prompt(`ATTENZIONE: ${played.length} incontri contengono risultati o prove. Per cancellare definitivamente i gironi e questi risultati, scrivi ELIMINA GIRONI:`);
      if(confirmation!=='ELIMINA GIRONI')return setMessage('Cancellazione annullata: risultati conservati.');
    }else if(!window.confirm(`Eliminare ${groupMatches.length} incontri dei gironi? Le squadre e le iscrizioni restano salvate.`))return;
    setTournamentBusy(true);
    try{
      const {error}=await supabase.from('codm_tournament_matches').delete().eq('tournament_id',selected.id).eq('phase','Girone');
      if(error)throw error;
      setMatchForm(v=>({...v,id:''}));
      await loadDetails(selected.id);
      setMessage('Gironi cancellati. Squadre e iscrizioni conservate: scegli il numero di gironi e premi Genera.');
    }catch(error){setMessage(`Cancellazione non riuscita: ${error instanceof Error?error.message:String(error)}`);}
    finally{setTournamentBusy(false);}
  }

  async function regenerateGroups(){
    if(tournamentBusy||!selected?.id||!canWrite)return;
    if(matches.some(m=>m.phase!=='Girone'))return setMessage('Per proteggere playoff/ripescaggi già creati, non puoi rigenerare questo torneo.');
    const played=matches.some(m=>m.score_a!=null||m.score_b!=null||m.winner||m.screenshot_url);
    if(played)return setMessage('Sono presenti risultati: usa Cancella gironi con conferma esplicita prima di rigenerare.');
    if(matches.length&&!window.confirm('Rigenerare il sorteggio? Gli incontri e gli orari non giocati saranno sostituiti; squadre e iscrizioni resteranno.'))return;
    if(!selectedModes.length||!selectedMaps.length)return setMessage('Seleziona almeno una mappa e una modalità nelle Regole.');
    if(!bracketIsGroupMode)return setMessage('Seleziona Gironi + playoff prima di rigenerare i gironi.');
    const generated=buildGeneratedMatches();
    if(!generated.length)return setMessage('Servono almeno due squadre e una configurazione di gironi valida.');
    setTournamentBusy(true);
    try{
      if(!await persistGroupSettings())return;
      // Inseriamo prima il nuovo sorteggio e rimuoviamo il precedente soltanto
      // dopo conferma Supabase. Se la cancellazione fallisce, tentiamo il rollback
      // delle sole nuove righe, senza toccare gli incontri originali.
      const {data:newRows,error:insertError}=await supabase.from('codm_tournament_matches').insert(generated).select('id');
      if(insertError)throw insertError;
      const insertedIds=(newRows||[]).map(r=>r.id);
      const oldIds=matches.filter(m=>m.phase==='Girone').map(m=>m.id);
      if(oldIds.length){
        const {error:deleteError}=await supabase.from('codm_tournament_matches').delete().eq('tournament_id',selected.id).in('id',oldIds);
        if(deleteError){
          const {error:rollbackError}=await supabase.from('codm_tournament_matches').delete().eq('tournament_id',selected.id).in('id',insertedIds);
          throw new Error(`${deleteError.message}${rollbackError?` · ATTENZIONE: rollback non riuscito (${rollbackError.message}), controlla gli incontri prima di ripetere.`:''}`);
        }
      }
      await loadDetails(selected.id);
      setMessage(`Nuovo sorteggio creato: ${Math.max(1,Math.min(groupCount,Math.floor(participants.length/2)))} gironi, ${generated.length} incontri. Squadre e iscrizioni conservate.`);
    }catch(error){await loadDetails(selected.id);setMessage(`Rigenerazione non completata: ${error instanceof Error?error.message:String(error)}. Verifica gli incontri prima di riprovare.`);}
    finally{setTournamentBusy(false);}
  }

  function buildGeneratedMatches() {
    const list = drawParticipants(participants.map((p) => p.name).filter(Boolean));
    if (list.length < 2 || !selected?.id) return [] as any[];
    const type = generationMode === 'auto' ? String(form.type || selected.type || recommended.title).toLowerCase() : generationMode.toLowerCase();
    const generated: any[] = [];
    if (type.includes('grupp') || type.includes('girone')) {
      if(groupCount<1)return [];
      const effectiveGroupCount=Math.min(groupCount,Math.floor(list.length/2));
      const groups=Array.from({length:effectiveGroupCount},(_,i)=>String.fromCharCode(65+i));
      const buckets = groups.map(() => [] as string[]);
      list.forEach((name, i) => buckets[i % effectiveGroupCount].push(name));
      for (let g = 0; g < buckets.length; g += 1) {
        for (let i = 0; i < buckets[g].length; i += 1) {
          for (let j = i + 1; j < buckets[g].length; j += 1) {
            generated.push(matchPayload(buckets[g][i], buckets[g][j], 'Girone', groups[g], generated.length));
          }
        }
      }
      return scheduleMatches(generated);
    }
    return scheduleMatches(buildKnockout(list,'Playoff','Bracket'));
  }

  function matchPayload(teamA: string, teamB: string, phase: string, group: string, index: number) {
    const mode=selectedModes[Math.floor(Math.random()*selectedModes.length)]||'CED';
    const map=selectedMaps[Math.floor(Math.random()*selectedMaps.length)]||'Standoff';
    const weapons=splitLines(form.allowedWeapons);
    const chosen=weapons.length?weapons[Math.floor(Math.random()*weapons.length)]:null;
    return { tournament_id:selected?.id,team_a:teamA,team_b:teamB,phase,group_name:group,map_name:map,mode,score_limit:scoreLimits[mode]||defaultScoreLimits[mode],status:'Da giocare',notes:`${chosen?`Arma sorteggiata: ${chosen}\n`:''}${rulesSummary()}` }; 
  }

  function rulesSummary() {
    return `Armi permesse: ${splitLines(form.allowedWeapons).join(', ') || form.allowedPreset}. Ban: ${splitLines(form.bans).join(', ') || '-'}`;
  }

  async function generateMatches() {
    if(!bracketIsGroupMode)return setMessage('Genera il tabellone nella sezione integrata Winners/Losers qui sotto, non nel vecchio formato.');
    if(tournamentBusy)return;
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!canWrite) return setMessage('Solo staff può generare tabellone.');
    if(!selectedModes.length||!selectedMaps.length)return setMessage('Seleziona almeno una modalità e una mappa nelle Regole torneo.');
    const generated = buildGeneratedMatches();
    if (!generated.length) return setMessage('Servono almeno 2 iscritti confermati o 2 squadre.');
    if(matches.length)return setMessage('Sono già presenti incontri: usa Rigenera gironi (prima dei risultati) oppure modifica i risultati esistenti.');
    setTournamentBusy(true);
    try{
      if(!await persistGroupSettings())return;
      const {error}=await supabase.from('codm_tournament_matches').insert(generated);
      if(error)throw error;
      await loadDetails(selected.id);
      setMessage(`Generate ${generated.length} partite. Clicca un incontro per assegnare orario o risultato.`);
      setActive('bracket');
    }catch(error){setMessage(`Generazione non riuscita: ${readableDbError(error)}`);}
    finally{setTournamentBusy(false);}
  }

  // Seconda possibilità: TUTTE le non qualificate dai gironi principali.
  // Modalità a gironi: gironi dedicati, classifica separata e una vincente per gruppo.
  // Modalità knockout: ogni esclusa entra in un tabellone a eliminazione diretta.
  async function generateRepechage(){
    if(!canWrite||!selected?.id||tournamentBusy)return setMessage('Solo Staff può avviare il ripescaggio.');
    if(!groupTables.length)return setMessage('Il ripescaggio delle non qualificate richiede prima una fase a gironi.');
    if(secondChancePending)return setMessage('Prima scegli il tipo di ripescaggio oppure Nessun ripescaggio.');
    if(!secondChance)return setMessage('Seleziona un formato di ripescaggio prima di generare gli incontri.');
    if(!groupTables.length||groupTables.some(g=>!g.finished))return setMessage('Completa prima tutti gli incontri dei gironi principali.');
    if(matches.some(m=>m.phase!=='Girone'))return setMessage('Ripescaggio o playoff già creato; nessun duplicato inserito.');
    const eliminated=drawParticipants(groupTables.flatMap(g=>g.standings.slice(g.qualifying).map(t=>t.team)));
    if(eliminated.length<2)return setMessage('Per il ripescaggio servono almeno due squadre non qualificate.');
    const buckets=makeRepechageBuckets(eliminated,secondChanceSlots);
    const paths=buckets.length;
    const generated=secondChanceFormat==='groups'
      ? buckets.flatMap((names,i)=>{
          const groupName=`Ripescaggio ${String.fromCharCode(65+i)}`;
          const games:Array<Record<string,any>>=[];
          for(const [teamA,teamB] of roundRobinPairs(names)){
            games.push(matchPayload(teamA,teamB,'Ripescaggio Girone',groupName,games.length));
          }
          return games;
        })
      : buckets.flatMap((names,i)=>buildKnockout(names,'Ripescaggio',`Ripescaggio ${String.fromCharCode(65+i)}`));
    if(!generated.length)return setMessage('Impossibile creare il ripescaggio con i partecipanti attuali.');
    setTournamentBusy(true);
    try{
      if(!await persistGroupSettings())return;
      const {error}=await supabase.from('codm_tournament_matches').insert(scheduleMatches(generated,'ripescaggio'));
      if(error)throw error;
      await loadDetails(selected.id);
      setMessage(`Ripescaggio ${secondChanceFormat==='groups'?'a gironi':'a eliminazione diretta'}: ${eliminated.length} squadre non qualificate, ${paths} posti in palio. Risultati principali conservati.`);
    }catch(error){setMessage(`Ripescaggio non creato: ${readableDbError(error)}`);}
    finally{setTournamentBusy(false);}
  }

  async function generatePlayoffs(){
    if(selected?.rules?.advanced_bracket_v2)return setMessage('Il torneo usa il nuovo tabellone Winners/Losers. Apri Tabelloni 64.');
    if(!canWrite||!selected?.id||tournamentBusy)return setMessage('Solo Staff può avviare i playoff.');
    if(!groupTables.length||groupTables.some(g=>!g.finished))return setMessage('Completa tutti gli incontri dei gironi prima di creare i playoff.');
    if(secondChancePending)return setMessage('Ripescaggio ancora da decidere: scegli Nessuno, Gironi oppure Eliminazione diretta prima di generare i playoff.');
    if(matches.some(m=>m.phase!=='Girone'&&!String(m.phase).startsWith('Ripescaggio ')))return setMessage('Playoff già creati: nessun duplicato inserito.');
    const guaranteed=groupTables.flatMap(g=>g.standings.slice(0,g.qualifying));
    const order=(a:typeof guaranteed[number],b:typeof guaranteed[number])=>b.points-a.points||b.diff-a.diff||a.team.localeCompare(b.team);
    let names=guaranteed.sort(order).map(t=>t.team);
    if(secondChance){
      if(!repechageFinished)return setMessage('Completa prima tutti gli incontri del ripescaggio, poi genera i playoff.');
      if(!repechageWinners.size)return setMessage('Nessuna squadra ripescata: controlla risultati e classifiche del ripescaggio.');
      names.push(...Array.from(repechageWinners));
    }
    // Nessun ripescaggio = nessuna squadra esclusa passa di nascosto:
    // il bracket gestisce eventuali posti liberi tramite BYE automatici.
    names=Array.from(new Set(names));
    if(names.length<2)return setMessage('Servono almeno due squadre qualificate.');
    const generated=buildKnockout(names,'Playoff','Playoff');
    if(!generated.length)return setMessage('Impossibile creare il tabellone.');
    setTournamentBusy(true);
    try{
      const {error}=await supabase.from('codm_tournament_matches').insert(scheduleMatches(generated,'playoff'));
      if(error)throw error;
      await loadDetails(selected.id);
      setMessage(`Playoff creati: ${names.length} squadre, ${generated.length} incontri; ${secondChance?'inclusi i ripescati':'qualificate secondo classifica'}.`);
    }catch(error){setMessage(`Playoff non creati: ${readableDbError(error)}`);}
    finally{setTournamentBusy(false);}
  }

  function editMatch(match: MatchRow) {
    setMatchForm({ id: match.id, teamA: match.team_a || '', teamB: match.team_b || '', phase: match.phase || 'Girone', group: match.group_name || 'A', date:datetimeInput(match.match_time), lobby:datetimeInput(match.lobby_time), map: match.map_name || 'Standoff', mode: match.mode || 'CED', scoreLimit: String(match.score_limit || scoreLimits[match.mode||'CED'] || ''), scoreA: match.score_a == null ? '' : String(match.score_a), scoreB: match.score_b == null ? '' : String(match.score_b), winner: match.winner || '', mvp: match.mvp || '', status: match.status || 'Da giocare', screenshotUrl: match.screenshot_url || '', notes: match.notes || '', lobbyName: match.lobby_name || '', referee: match.referee || '' });
    setActive('matches');
    setMessage(`Modifica partita: ${match.team_a || '-'} vs ${match.team_b || '-'}.`);
  }

  async function saveMatch() {
    if (!selected?.id) return setMessage('Seleziona un torneo.');
    if (!canWrite) return setMessage('Solo staff può salvare partite torneo.');
    const scoreA = matchForm.scoreA === '' ? null : Number(matchForm.scoreA);
    const scoreB = matchForm.scoreB === '' ? null : Number(matchForm.scoreB);
    const limit=Number(matchForm.scoreLimit||scoreLimits[matchForm.mode]||0);
    if(!Number.isInteger(limit)||limit<1||limit>9999)return setMessage('Limite punteggio non valido: inserisci un intero maggiore di zero.');
    if((scoreA!==null&&scoreA>limit)||(scoreB!==null&&scoreB>limit))return setMessage(`Risultato superiore al limite ${limit} per ${tournamentModeLabel(matchForm.mode)}. Correggi il limite o il punteggio.`);
    if(!['Girone','Ripescaggio Girone'].includes(matchForm.phase)&&scoreA!==null&&scoreB!==null&&scoreA===scoreB)return setMessage('Nei turni a eliminazione diretta serve un vincitore: non è ammesso il pareggio.');
    if(!['Girone','Ripescaggio Girone'].includes(matchForm.phase)&&scoreA!==null&&scoreB!==null&&[matchForm.teamA,matchForm.teamB].some(x=>x==='BYE'||x.startsWith('Vincitore ')))return setMessage('Prima completa gli incontri precedenti: le squadre del prossimo turno non sono ancora definite.');
    const winner=scoreA!==null&&scoreB!==null?(scoreA>scoreB?matchForm.teamA:scoreB>scoreA?matchForm.teamB:'Pareggio'):matchForm.teamA==='BYE'?matchForm.teamB:matchForm.teamB==='BYE'?matchForm.teamA:null;
    const conflict=matches.find(m=>m.id!==matchForm.id&&!!matchForm.date&&m.match_time===new Date(matchForm.date).toISOString()&&((!!matchForm.lobbyName&&m.lobby_name===matchForm.lobbyName)||[m.team_a,m.team_b].some(t=>t&&[matchForm.teamA,matchForm.teamB].includes(t))));
    if(conflict)return setMessage('Conflitto orario: squadra o lobby già assegnata alla stessa ora.');
    const payload = { tournament_id: selected.id, team_a: matchForm.teamA, team_b: matchForm.teamB, phase: matchForm.phase, group_name: matchForm.group, match_time: matchForm.date ? new Date(matchForm.date).toISOString() : null, lobby_time: matchForm.lobby ? new Date(matchForm.lobby).toISOString() : null, map_name: matchForm.map, mode: matchForm.mode, score_limit:limit, status: scoreA !== null && scoreB !== null ? 'Finita' : matchForm.status, score_a: scoreA, score_b: scoreB, winner, mvp: matchForm.mvp || null, screenshot_url: matchForm.screenshotUrl || null, lobby_name: matchForm.lobbyName || null, referee: matchForm.referee || null, notes: `${matchForm.notes || ''}\n${rulesSummary()}`.trim() };
    const query = matchForm.id ? supabase.from('codm_tournament_matches').update(payload).eq('id', matchForm.id) : supabase.from('codm_tournament_matches').insert(payload);
    const { error } = await query;
    if (error) return setMessage(error.message);
    if (winner && winner !== 'Pareggio' && matchForm.id) await advanceWinner(matchForm, winner);
    setMessage(matchForm.id ? 'Risultato aggiornato. Vincitore verde, eliminato rosso nel tabellone.' : 'Partita torneo salvata.');
    setMatchForm((m) => ({ ...m, id: '' }));
    await loadDetails(selected.id);
  }

  async function advanceWinner(current: typeof matchForm,winner: string){
    const existing=matches.find(m=>m.id===current.id);
    if(!existing?.next_match_id)return;
    const parent=matches.find(m=>m.id===existing.next_match_id);
    if(!parent)return;
    const slot=(existing.bracket_order||0)%2===0?'team_a':'team_b';
    const previous=slot==='team_a'?parent.team_a:parent.team_b;
    if(previous && !String(previous).startsWith('Vincitore') && previous!==winner){
      setMessage('ATTENZIONE: il turno successivo contiene già un risultato. Verifica manualmente il tabellone.');
      return;
    }
    const {error}=await supabase.from('codm_tournament_matches').update({[slot]:winner}).eq('id',parent.id);
    if(error)setMessage(`Avanzamento non riuscito: ${error.message}`);
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

  const groupTables=useMemo(()=>{
    const groupMatches=matches.filter(m=>m.phase==='Girone');
    const names=Array.from(new Set(groupMatches.map(m=>m.group_name||'A'))).sort();
    return names.map(name=>{
      const games=groupMatches.filter(m=>(m.group_name||'A')===name);
      const members=Array.from(new Set(games.flatMap(m=>[m.team_a,m.team_b]).filter((n):n is string=>!!n&&n!=='BYE')));
      const standings=members.map(team=>{
        const played=games.filter(m=>m.score_a!==null&&m.score_a!==undefined&&m.score_b!==null&&m.score_b!==undefined&&(m.team_a===team||m.team_b===team));
        let wins=0,draws=0,diff=0;
        for(const m of played){const own=m.team_a===team?Number(m.score_a):Number(m.score_b),opp=m.team_a===team?Number(m.score_b):Number(m.score_a);diff+=own-opp;if(own>opp)wins++;else if(own===opp)draws++}
        return {team,played:played.length,wins,draws,losses:played.length-wins-draws,points:wins*3+draws,diff};
      }).sort((a,b)=>b.points-a.points||b.diff-a.diff||a.team.localeCompare(b.team));
      const finished=games.length>0&&games.every(m=>m.score_a!=null&&m.score_b!=null);
      return {name,games,standings,finished,qualifying:Math.min(qualifiersPerGroup,Math.max(1,standings.length-1))};
    });
  },[matches,qualifiersPerGroup]);

  // Tutte le squadre escluse restano tali salvo ripescaggio effettivamente vinto.
  const extraQualifiers=useMemo(()=>new Set<string>(),[]);

  const groupedMatches = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of matches) {
      if(m.phase==='Girone'||String(m.phase||'').startsWith('Ripescaggio '))continue;
      const key = m.phase || 'Partite';
      map.set(key, [...(map.get(key) || []), m]);
    }
    return Array.from(map.entries()).sort((a,b) => phasesOrder.indexOf(a[0]) - phasesOrder.indexOf(b[0]));
  }, [matches]);

  const repechageMatches=useMemo(()=>matches.filter(m=>String(m.phase||'').startsWith('Ripescaggio ')),[matches]);
  const repechageGroupMatches=useMemo(()=>repechageMatches.filter(m=>m.phase==='Ripescaggio Girone'),[repechageMatches]);
  const repechageKnockoutMatches=useMemo(()=>repechageMatches.filter(m=>m.phase!=='Ripescaggio Girone'),[repechageMatches]);
  const repechageFinals=useMemo(()=>repechageKnockoutMatches.filter(m=>!m.next_match_id),[repechageKnockoutMatches]);
  const repechageGroupTables=useMemo(()=>{
    const names=Array.from(new Set(repechageGroupMatches.map(m=>m.group_name||'Ripescaggio A'))).sort();
    return names.map(name=>{
      const games=repechageGroupMatches.filter(m=>(m.group_name||'Ripescaggio A')===name);
      const members=Array.from(new Set(games.flatMap(m=>[m.team_a,m.team_b]).filter((n):n is string=>!!n&&n!=='BYE')));
      const ranking=members.map(team=>{
        const played=games.filter(m=>m.score_a!=null&&m.score_b!=null&&(m.team_a===team||m.team_b===team));
        let wins=0,draws=0,diff=0;
        for(const m of played){const own=m.team_a===team?Number(m.score_a):Number(m.score_b),opp=m.team_a===team?Number(m.score_b):Number(m.score_a);diff+=own-opp;if(own>opp)wins++;else if(own===opp)draws++;}
        return {team,played:played.length,wins,draws,points:wins*3+draws,diff};
      }).sort((a,b)=>b.points-a.points||b.diff-a.diff||a.team.localeCompare(b.team));
      return {name,games,ranking,finished:games.length>0&&games.every(m=>m.score_a!=null&&m.score_b!=null)};
    });
  },[repechageGroupMatches]);
  const repechageFinished=repechageMatches.length>0&&(repechageGroupMatches.length>0
    ? repechageGroupTables.length>0&&repechageGroupTables.every(g=>g.finished)
    : repechageFinals.length>0&&repechageFinals.every(m=>!!m.winner&&m.winner!=='Pareggio'&&m.winner!=='BYE'));
  const repechageWinners=useMemo(()=>new Set<string>(repechageGroupMatches.length>0
    ? repechageGroupTables.filter(g=>g.finished).map(g=>g.ranking[0]?.team).filter((x):x is string=>!!x)
    : repechageFinals.map(m=>String(m.winner||'')).filter(x=>!!x&&x!=='Pareggio'&&x!=='BYE')),
    [repechageGroupMatches,repechageGroupTables,repechageFinals]);
  const allGroupsFinished=groupTables.length>0&&groupTables.every(g=>g.finished);
  const bracketIsGroupMode=groupTables.length>0||(generationMode==='auto'?String(form.type||selected?.type||'').toLowerCase():generationMode.toLowerCase()).includes('grupp')||(generationMode==='auto'?String(form.type||selected?.type||'').toLowerCase():generationMode.toLowerCase()).includes('girone');

  // FIX22: define playoff origins BEFORE the group stage is completed.
  const fixedQualifiers=useMemo(()=>{
    if(!bracketIsGroupMode)return [];
    const names=groupTables.length?groupTables.map(g=>g.name):Array.from({length:Math.min(groupCount,Math.max(1,Math.floor(participants.length/2)))},(_,i)=>String.fromCharCode(65+i));
    return qualificationSlots(names,qualifiersPerGroup,secondChance?secondChanceSlots:0);
  },[bracketIsGroupMode,groupTables,groupCount,participants.length,qualifiersPerGroup,secondChance,secondChanceSlots]);
  const resolvedQualifierNames=useMemo(()=>resolvedQualificationNames(fixedQualifiers,groupTables,repechageFinished,[...repechageWinners].sort((a,b)=>a.localeCompare(b,'it'))),[fixedQualifiers,groupTables,repechageFinished,repechageWinners]);
  const isSingles=/^1v1$/i.test(String(selected?.format||form.format));
  const playoffParticipants=bracketIsGroupMode?fixedQualifiers.map(s=>({id:s.id,name:s.name})):teams.length?teams.map(t=>({id:t.id,name:t.name})):isSingles?confirmedRegistrations.map(r=>({id:r.id,name:r.nickname||r.id})):[];
  const needsTeams=!isSingles&&!bracketIsGroupMode&&teams.length===0;

  const fullBracketLocked=Boolean(selected?.rules?.advanced_bracket_v2);

  const tournamentStats = useMemo(() => ({ played: matches.filter((m) => m.score_a != null && m.score_b != null).length, pending: matches.filter((m) => m.score_a == null || m.score_b == null).length, registrations: registrations.length, confirmed: confirmedRegistrations.length, participants: participants.length }), [matches, registrations, confirmedRegistrations, participants]);

  const tabs = [['dashboard','📌 Panoramica'], ['registrations','📝 Iscrizioni'], ['teams','👥 Squadre'], ['groups','🧩 Gironi'], ['bracket','🏆 Eliminazione'], ['calendar','📅 Calendario'], ['matches','🎮 Risultati'], ['export','📁 Esportazioni'], ['rules','🗺️ Mappe / Armi'], ['manage','🛠️ Gestisci'], ['archive','🗂️ Archivio']];

  return (
    <main className="container wide tournament-page tournament-pro-page tournament-v11-page">
      <section className="card ak-section-head tournament-head">
        <p className="eyebrow">🏆 TORNEO PRO · <strong>V14.2 FIX26</strong></p>
        <h1>Gestione torneo CODM guidata</h1>
        <p className="muted">Iscrizioni → Squadre → Gironi → Tabellone → Calendario → Risultati. Tutte le sezioni sono collegate al torneo selezionato.</p>
        <div className="tournament-tabs">{tabs.map(([id, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>{label}</button>)}</div>
        <div className="top-gap grid grid-2"><div className="field"><label>Torneo selezionato — tutte le sezioni utilizzano questo torneo</label><select className="select pro-select" value={selected?.id || ''} onChange={(e)=>setSelectedId(e.target.value)}><option value="">Nessun torneo</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.status}</option>)}</select><div className="ak26-public-links">{selected?.id&&<a className="btn small secondary" href={`/tornei/${selected.id}`} target="_blank" rel="noopener noreferrer">👁️ Vista pubblica torneo ↗</a>}<a className="btn small secondary" href="/tornei" target="_blank" rel="noopener noreferrer">🌐 Elenco tornei pubblici</a></div></div><div className="notice">{message || (loading ? 'Caricamento tornei...' : `Dati del torneo aggiornati alle ${updatedAt||'—'}. Aggiornamento automatico attivo.`)}</div></div>
      </section>

      {active === 'dashboard' && <section className="grid grid-4 top-gap"><div className="kpi"><span>Torneo attivo</span><strong>{activeTournament?.name || '-'}</strong></div><div className="kpi"><span>Iscritti confermati</span><strong>{tournamentStats.confirmed}/{tournamentStats.registrations}</strong></div><div className="kpi"><span>Partecipanti tabellone</span><strong>{tournamentStats.participants}</strong></div><div className="kpi"><span>Partite finite/aperte</span><strong>{tournamentStats.played}/{tournamentStats.pending}</strong></div><div className="card grid-span-2"><h2>Flusso semplice</h2><ol className="pro-steps"><li>Crea torneo e apri iscrizioni</li><li>Player usa il link pubblico oppure il profilo</li><li>Admin conferma iscritti</li><li>Admin sceglie formato/tipo e genera tabellone</li><li>Clic partita → inserisci risultato → vincitore verde</li></ol></div><div className="card grid-span-2"><h2>Consiglio automatico</h2><p><b>{recommended.title}</b></p><p className="muted">{recommended.details}</p><button className="btn small secondary" onClick={() => setActive('bracket')}>Apri tabellone</button></div></section>}

      {active === 'manage' && <section className="card top-gap"><div className="section-title"><div><h2>Crea / modifica torneo</h2><p className="muted">Tipo e formato si possono cambiare anche dopo aver raccolto iscrizioni.</p></div>{selected?.id && <button className="btn danger" onClick={deleteTournament}>🗑️ {confirmDelete ? 'CONFERMA ELIMINA TORNEO' : 'Elimina torneo'}</button>}</div><div className="grid grid-3 top-gap"><div className="field"><label>Nome torneo</label><input className="input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></div><div className="field"><label>Data torneo</label><input className="input" type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}/></div><div className="field"><label>Stato</label><select className="select pro-select" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Orario inizio</label><input className="input" type="time" value={form.start} onChange={(e)=>setForm({...form,start:e.target.value})}/></div><div className="field"><label>Apertura lobby</label><input className="input" type="time" value={form.lobby} onChange={(e)=>setForm({...form,lobby:e.target.value})}/></div><div className="field"><label>Numero previsto</label><input className="input" inputMode="numeric" value={form.maxTeams} onChange={(e)=>setForm({...form,maxTeams:e.target.value})}/></div><div className="field"><label>Formato</label><select className="select pro-select" value={form.format} onChange={(e)=>setForm({...form,format:e.target.value})}>{formats.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Tipo torneo</label><select className="select pro-select" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}>{tournamentTypes.map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Cover torneo/link immagine</label><input className="input" value={form.coverUrl} onChange={(e)=>setForm({...form,coverUrl:e.target.value})}/></div><div className="field grid-span-3"><label>Descrizione breve</label><input className="input" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></div></div><div className="ak24-settings"><h3>🛡️ Iscrizione pubblica · FIX25</h3><p className="muted">Pagine privacy e richieste già pronte nel sito. Nessuna email richiesta. Basta indicare il titolare effettivo dei dati e salvare il torneo.</p><div className="grid grid-2"><div className="field"><label>Titolare effettivo del trattamento *</label><input className="input" maxLength={180} value={form.signupControllerName} onChange={e=>setForm({...form,signupControllerName:e.target.value})} placeholder="Nome e cognome o ragione sociale effettiva"/><small className="muted">Obbligatorio per raccogliere dati. Non inserire un nome fittizio.</small></div><div className="field"><label>Informativa predefinita</label><input className="input" readOnly value="/privacy"/><small><a href="/privacy" target="_blank" rel="noopener noreferrer">Apri informativa ↗</a> · <a href="/privacy/richiesta" target="_blank" rel="noopener noreferrer">Apri richieste ↗</a></small></div><div className="field"><label>Limite partecipanti individuali (facoltativo)</label><input className="input" type="number" min="1" placeholder="Nessun limite" value={form.signupLimit} onChange={e=>setForm({...form,signupLimit:e.target.value})}/></div></div><div className="notice">Il testo privacy è precompilato. Prima dell'apertura verifica che sia coerente con la tua organizzazione, tempi di conservazione e servizi realmente usati.</div></div><button className="btn top-gap" onClick={saveTournament}>💾 {selected?.id ? 'Aggiorna torneo selezionato' : 'Crea torneo'}</button></section>}

      {active === 'manage' && selected?.id && canWrite && <section className="card top-gap ak18-clone-card">
        <div className="section-title"><div><h2>🔄 Rigenera torneo da iscritti</h2><p className="muted">Riparti da tutti gli iscritti del torneo attuale, ricrea squadre, gironi e tabelloni. Il torneo originale, i risultati e lo storico NON vengono cancellati.</p></div></div>
        <div className="ak18-clone-actions"><label><input type="checkbox" checked={cloneIncludeTeams} onChange={e=>setCloneIncludeTeams(e.target.checked)}/> Copia anche le squadre già composte (altrimenti riparti soltanto dagli iscritti)</label><button className="btn" type="button" disabled={tournamentBusy||!registrations.length} onClick={()=>void regenerateFromRegistrations()}>🔄 Crea nuova edizione da {registrations.length} iscritti</button></div>
        <p className="muted">Viene richiesta conferma scritta. I dati esistenti restano al sicuro nella precedente edizione.</p>
      </section>}

      {active === 'registrations' && <section className="grid grid-2 top-gap"><div className="card"><h2>Iscrizione dal profilo</h2><p className="muted">Le squadre si creano dopo. Qui il player si iscrive come profilo singolo.</p><div className="notice"><b>Stato tuo profilo:</b> {myRegistration ? registrationBadge(myRegistration.status) : 'Non iscritto'}</div><textarea className="textarea top-gap" value={registrationNote} onChange={(e)=>setRegistrationNote(e.target.value)} placeholder="Note iscrizione: ruolo, orari, preferenze squadra..." /><button className="btn top-gap" onClick={registerMe} disabled={!auth.user || selected?.status !== 'Iscrizioni aperte'}>📝 Iscriviti / conferma iscrizione</button>{selected?.status !== 'Iscrizioni aperte' && <small className="muted">Metti il torneo in “Iscrizioni aperte”.</small>}</div><div className="card"><div className="v14-manual-participants"><h3>➕ Iscrivi partecipanti dalla tua lista</h3><p className="muted">Visualizza i giocatori di questo torneo, oppure aggiungi nuovi iscritti manualmente. Nessun giocatore di altri tornei viene importato automaticamente.</p><div className="field"><label htmlFor="v14-roster-search">Cerca tra i confermati di questo torneo ({confirmedRegistrations.length})</label><input id="v14-roster-search" className="input" value={rosterSearch} onChange={e=>setRosterSearch(e.target.value)} placeholder="Cerca nickname..."/><select className="select top-gap" value="" disabled={rosterLoading} onChange={e=>{if(e.target.value)setManualNick(p=>{const existing=splitLines(p);return existing.some(n=>n.toLocaleLowerCase('it-IT')===e.target.value.toLocaleLowerCase('it-IT'))?p:[...existing,e.target.value].join('\n')});}}><option value="">{filteredRosterOptions.length?'Scegli partecipante confermato...':'Nessun confermato — puoi iscriverne uno manualmente'}</option>{filteredRosterOptions.map(p=><option key={p.nickname} value={p.nickname}>{p.nickname}</option>)}</select><div className="cal-buttons top-gap"><small className="muted">Sono visibili solo gli iscritti a questo torneo; nessuna importazione dallo storico.</small></div>{rosterNotice&&<p className="notice" role="status">{rosterNotice}</p>}</div><textarea className="textarea top-gap" rows={5} value={manualNick} onChange={e=>setManualNick(e.target.value)} placeholder="Giocatore 1&#10;Giocatore 2&#10;Ospite esterno"/><button className="btn top-gap" disabled={!canWrite||!selected?.id} onClick={()=>void addManualRegistration()}>+ Aggiungi giocatori e conferma</button></div><div className="section-title"><div><h2>Lista iscrizioni</h2><p className="muted">Dopo conferma puoi generare torneo o creare squadre.</p></div>{canWrite && <button className="btn small secondary" type="button" onClick={fillTeamFromRegistrations}>Crea squadra dagli iscritti</button>}</div><div className="tournament-team-list top-gap">{registrations.map((r)=><article key={r.id} className="compact-card"><b>{r.nickname || 'Player'}</b><span>{registrationBadge(r.status)}</span><small>{r.note || '-'}</small>{canWrite && <div className="cal-buttons top-gap"><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Confermata')}>Conferma</button><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Riserva')}>Riserva</button><button className="btn small secondary" onClick={()=>updateRegistrationStatus(r.id,'Rifiutata')}>Rifiuta</button></div>}</article>)}{!registrations.length && <div className="empty-state">Nessuna iscrizione ancora.</div>}</div></div></section>}

      {active === 'registrations' && selected?.id && <TournamentSignupAdmin tournamentId={selected.id} status={String(selected.status||'')} privacyUrl={selected.public_signup_privacy_url||'/privacy'} controllerName={selected.public_signup_controller_name} limit={selected.public_signup_limit} rows={publicSignups} canWrite={canWrite} onReload={()=>loadDetails(selected!.id)}/>}
      {active === 'export' && selected && <TournamentExportCenter tournament={selected} publicSignups={canWrite?publicSignups:[]} registrations={canWrite?registrations:[]} teams={teams} matches={matches} groups={groupTables} canWrite={canWrite}/>}

      {active === 'teams' && <section className="card top-gap"><h2>Squadre dopo iscrizioni</h2><p className="muted">Per 1v1 puoi anche non creare squadre: il tabellone usa gli iscritti confermati. Per 2v2/5v5 crea squadre dagli iscritti.</p><div className="grid grid-3"><div className="field"><label>Nome squadra</label><input className="input" value={teamForm.name} onChange={(e)=>setTeamForm({...teamForm,name:e.target.value})}/></div><div className="field"><label>Capitano</label><input className="input" value={teamForm.captain} onChange={(e)=>setTeamForm({...teamForm,captain:e.target.value})}/></div><div className="field"><label>Stato squadra</label><select className="select pro-select" value={teamForm.status} onChange={(e)=>setTeamForm({...teamForm,status:e.target.value})}>{['Incompleta','Completa','Confermata','Eliminata'].map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Aggiungi titolare dalla lista iscritti</label><select className="select" defaultValue="" onChange={e=>{const name=e.target.value;if(name)setTeamForm(f=>({...f,players:[...new Set([...splitLines(f.players),name])].join('\n')}));e.target.value=''}}><option value="">Seleziona partecipante</option>{Array.from(new Set([...confirmedRegistrations.map(r=>r.nickname||'')])).filter(Boolean).sort((a,b)=>a.localeCompare(b,'it')).map(n=><option key={n} value={n}>{n}</option>)}</select></div><div className="field"><label>Titolari</label><textarea className="textarea" value={teamForm.players} onChange={(e)=>setTeamForm({...teamForm,players:e.target.value})} /></div><div className="field"><label>Riserve</label><textarea className="textarea" value={teamForm.reserves} onChange={(e)=>setTeamForm({...teamForm,reserves:e.target.value})} /></div><div className="field"><label>Azione</label><button className="btn" onClick={saveTeam}>{editingTeamId?'💾 Aggiorna squadra':'➕ Aggiungi squadra'}</button></div></div><div className="tournament-team-list top-gap">{teams.map(t=><article key={t.id} className="compact-card"><b>{t.name}</b><span>{teamCompleteness(t, form.format || '5v5')}</span><small>Capitano: {t.captain || '-'} · Titolari: {(t.players||[]).join(', ') || '-'} · Riserve: {t.reserves?.length || 0}</small>{canWrite&&<button className="btn small secondary" onClick={()=>editTeam(t)}>✏️ Modifica squadra / nome</button>}</article>)}</div></section>}

      {active === 'rules' && <section className="card top-gap"><h2>Regolamento, mappe e modalità</h2><p className="muted">Scegli modalità e mappe ammesse: il sorteggio userà soltanto queste. Il limite è modificabile per ogni modalità e su ogni incontro. Salva prima di generare le partite.</p>
      <div className="v142-rules-grid"><div><h3>Modalità ammesse</h3>{codmModes.map(mode=><label className="v142-choice" key={mode}><input type="checkbox" checked={selectedModes.includes(mode)} onChange={()=>toggleChoice(mode,selectedModes,setSelectedModes)}/><span>{tournamentModeLabel(mode)}</span><small>Limite</small><input className="input" type="number" min="1" max="9999" value={scoreLimits[mode]??''} onChange={e=>setScoreLimits(p=>({...p,[mode]:Number(e.target.value)||0}))}/></label>)}</div>
      <div><h3>🗺️ Catalogo CODM completo · {codmMaps.length} mappe</h3><p className="muted">Saloon, King, Gulag, Stack, Killhouse, Cage e tutte le altre. Seleziona le mappe consentite per il sorteggio.</p>
        <input className="input ak18-search" type="search" placeholder="Cerca una mappa (es. Saloon, King, Gulag, Cage)..." value={mapSearch} onChange={e=>setMapSearch(e.target.value)}/>
        <div className="cal-buttons ak18-action-line"><button className="btn small secondary" type="button" onClick={()=>setSelectedMaps([...codmMaps])}>Seleziona tutte ({codmMaps.length})</button><button className="btn small secondary" type="button" onClick={()=>setSelectedMaps([])}>Deseleziona tutte</button><span className="muted">{selectedMaps.length} selezionate</span></div>
        <div className="v142-map-grid ak18-map-picker">{codmMaps.filter(map=>map.toLocaleLowerCase('it-IT').includes(mapSearch.trim().toLocaleLowerCase('it-IT'))).map(map=><label className="v142-map-choice" key={map}><input type="checkbox" checked={selectedMaps.includes(map)} onChange={()=>toggleChoice(map,selectedMaps,setSelectedMaps)}/>{map}</label>)}</div></div></div>
      <div className="grid grid-2 top-gap"><div className="field"><label>Lobby contemporanee</label><select className="select" value={lobbyCount} onChange={e=>setLobbyCount(Number(e.target.value))}>{[1,2,3,4].map(n=><option value={n} key={n}>{n} lobby</option>)}</select></div><div className="field"><label>Minuti per slot del calendario</label><input className="input" type="number" min="10" max="180" value={slotMinutes} onChange={e=>setSlotMinutes(Math.min(180,Math.max(10,Number(e.target.value)||30)))}/></div></div>
      <div className="ak18-weapons-card top-gap"><h3>🔫 Torneo delle armi · scelta per categoria</h3><p className="muted">Spunta le armi utilizzabili. Il sorteggio delle nuove partite userà soltanto le armi selezionate; le armi escluse non verranno assegnate.</p>
      <div className="grid grid-2"><div className="field"><label>Categoria arma</label><select className="select" value={weaponCategory} onChange={e=>setWeaponCategory(e.target.value)}>{Object.keys(CODM_WEAPONS).map(category=><option key={category} value={category}>{category} ({CODM_WEAPONS[category].length})</option>)}</select></div><div className="field"><label>Armi abilitate</label><strong>{splitLines(form.allowedWeapons).length} selezionate</strong></div></div>
      <div className="cal-buttons"><button className="btn small secondary" type="button" onClick={()=>setForm(prev=>({...prev,allowedWeapons:Array.from(new Set([...splitLines(prev.allowedWeapons),...CODM_WEAPONS[weaponCategory]])).join('\n')}))}>Seleziona categoria</button><button className="btn small secondary" type="button" onClick={()=>setForm(prev=>({...prev,allowedWeapons:splitLines(prev.allowedWeapons).filter(w=>!CODM_WEAPONS[weaponCategory].includes(w)).join('\n')}))}>Escludi categoria</button></div>
      <div className="ak18-weapon-picker">{CODM_WEAPONS[weaponCategory].map(weapon=><label key={weapon}><input type="checkbox" checked={splitLines(form.allowedWeapons).includes(weapon)} onChange={()=>setForm(prev=>{const xs=splitLines(prev.allowedWeapons);return {...prev,allowedWeapons:(xs.includes(weapon)?xs.filter(w=>w!==weapon):[...xs,weapon]).join('\n')}})}/>{weapon}</label>)}</div>
      </div>
      <div className="grid grid-2"><div className="field"><label>Tipologia armi permesse</label><select className="select pro-select" value={form.allowedPreset} onChange={(e)=>setForm({...form,allowedPreset:e.target.value})}>{allowedWeaponPresets.map((w)=><option key={w}>{w}</option>)}</select><textarea className="textarea top-gap" value={form.allowedWeapons} onChange={(e)=>setForm({...form,allowedWeapons:e.target.value})} placeholder="Esempio: AR, SMG, Sniper, Pistol..." /></div><div className="field"><label>🚫 Armi / oggetti vietati</label><textarea className="textarea" value={form.bans} onChange={(e)=>setForm({...form,bans:e.target.value})} placeholder="NA45, Persistence, Martirio..." /></div><div className="field grid-span-2"><label>Regole generali</label><textarea className="textarea" value={form.rules} onChange={(e)=>setForm({...form,rules:e.target.value})} placeholder="BO3, ritardo massimo, screenshot obbligatorio, MVP..." /></div></div><button className="btn top-gap" onClick={saveTournament}>💾 Salva mappe, armi e regolamento su Supabase</button><p className="notice top-gap" role="status">{message || 'Le scelte diventano permanenti solo dopo il salvataggio su Supabase.'}</p></section>}

      {(active === 'groups'||active === 'bracket') && <section className="card top-gap v14-tournament-board"><div className="section-title"><div><h2>{active==='groups'?'🧩 Gironi e classifiche':'🏆 Fase a eliminazione'}</h2><p className="muted">Numero gironi personalizzabile, sorteggio rigenerabile e ripescaggio opzionale a gironi o eliminazione diretta. Verde: qualificata; ambra: ripescaggio; grigio: eliminata.</p></div></div>
      {active==='groups'&&<>
      <div className="v143-controls top-gap">
        <div className="field"><label>Formato fase iniziale</label><select className="select pro-select" value={generationMode} disabled={fullBracketLocked||matches.some(m=>m.phase!=='Girone')} onChange={e=>setGenerationMode(e.target.value)}><option value="auto">Usa formato del torneo</option><option value="Eliminazione diretta">Solo eliminazione diretta</option><option value="A gruppi">Gironi + playoff</option></select></div>
        <div className="field"><label>Numero di gironi</label><select className="select" value={Math.min(groupCount,Math.max(1,Math.floor(participants.length/2)))} disabled={fullBracketLocked||!bracketIsGroupMode||matches.some(m=>m.phase!=='Girone')} onChange={e=>setGroupCount(Number(e.target.value))}>{Array.from({length:Math.max(1,Math.min(16,Math.floor(participants.length/2)))},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} {n===1?'girone':'gironi'}</option>)}</select></div>
        <div className="field"><label>Qualificate per girone</label><select className="select" value={qualifiersPerGroup} disabled={fullBracketLocked||!bracketIsGroupMode||matches.some(m=>m.phase!=='Girone')} onChange={e=>setQualifiersPerGroup(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Prime {n}</option>)}</select></div>
        <div className="field"><label>Ripescaggio per le non qualificate</label><select className="select" disabled={fullBracketLocked||!bracketIsGroupMode||matches.some(m=>m.phase!=='Girone')} value={secondChancePending?'later':secondChance?secondChanceFormat:'none'} onChange={e=>{const v=e.target.value;setSecondChancePending(v==='later');setSecondChance(v==='groups'||v==='knockout');if(v==='groups'||v==='knockout')setSecondChanceFormat(v);}}><option value="none">Nessun ripescaggio</option><option value="groups">Tutte le eliminate → nuovi gironi</option><option value="knockout">Tutte le eliminate → eliminazione diretta</option></select></div>
        {secondChance&&bracketIsGroupMode&&<div className="field"><label>Posti da assegnare dopo il ripescaggio dei gironi</label><select className="select" value={secondChanceSlots} disabled={fullBracketLocked||matches.some(m=>m.phase!=='Girone')} onChange={e=>setSecondChanceSlots(Number(e.target.value))}>{Array.from({length:Math.max(secondChanceSlots,Math.max(1,Math.floor((participants.length - Math.min(groupCount, Math.max(1, Math.floor(participants.length/2)))*qualifiersPerGroup)/2)))},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} {n===1?'posto':'posti'}</option>)}</select></div>}
      </div>
      <p className="muted top-gap">{participants.length} squadre/partecipanti · {bracketIsGroupMode?`${Math.min(groupCount,Math.max(1,Math.floor(participants.length/2)))} gironi, ${qualifiersPerGroup} qualificate per girone`:'Eliminazione diretta'}. Ogni girone lascia almeno una squadra non qualificata. Definisci il ripescaggio prima di generare il tabellone completo, così restano fissi tutti i passaggi e gli incroci. Per modificare le regole di qualificazione dopo avere giocato incontri, occorre un nuovo torneo.</p>
      {canWrite&&<div className="cal-buttons v143-actions top-gap"><button className="btn small secondary" disabled={fullBracketLocked||tournamentBusy||!selected?.id||matches.some(m=>m.phase!=='Girone')} onClick={()=>void persistGroupSettings().then(ok=>{if(ok)setMessage('Formato gironi salvato nel torneo.');})}>💾 Salva formato</button>{bracketIsGroupMode&&<button className="btn small" disabled={fullBracketLocked||tournamentBusy||!!matches.length||!canWrite} onClick={()=>void generateMatches()}>⚡ Genera gironi</button>}<button className="btn small secondary" disabled={fullBracketLocked||tournamentBusy||!matches.length||matches.some(m=>m.phase!=='Girone')||!canWrite} onClick={()=>void regenerateGroups()}>🔀 Rigenera gironi</button><button className="btn small danger" disabled={fullBracketLocked||tournamentBusy||!matches.some(m=>m.phase==='Girone')||matches.some(m=>m.phase!=='Girone')||!canWrite} onClick={()=>void clearGroups()}>🗑️ Cancella gironi</button></div>}
      {matches.some(m=>m.phase!=='Girone')&&<p className="notice top-gap">Sorteggio bloccato: ripescaggi o playoff già creati. I risultati dei gironi sono protetti.</p>}
      {!matches.some(m=>m.phase!=='Girone')&&matches.some(m=>m.phase==='Girone'&&(m.score_a!=null||m.score_b!=null))&&<p className="notice top-gap">Ci sono risultati registrati: per rifare i gironi devi usare Cancella gironi e confermare esplicitamente la perdita dei risultati.</p>}
      <div className="v14-group-grid top-gap">{groupTables.map(g=><article className="v14-group-card" key={g.name}><header><h3>GIRONE {g.name}</h3><span>{g.finished?'Concluso':'In corso'}</span></header><div className="table-scroll"><table className="table compact"><thead><tr><th>#</th><th>Squadra</th><th>G</th><th>V</th><th>N</th><th>Diff</th><th>Pt</th></tr></thead><tbody>{g.standings.map((t,i)=><tr key={t.team} className={g.finished?(i<g.qualifying||extraQualifiers.has(t.team)||repechageWinners.has(t.team)?'v14-qualify':secondChance&&!repechageFinished?'v143-repechage':'v14-out'):'v14-pending'}><td>{i+1}</td><td title={teamLabel(t.team)}><b>{t.team}</b> {g.finished?(i<g.qualifying||extraQualifiers.has(t.team)||repechageWinners.has(t.team)?'✓':secondChance&&!repechageFinished?'↻':'×'):'·'}</td><td>{t.played}</td><td>{t.wins}</td><td>{t.draws}</td><td>{t.diff}</td><td>{t.points}</td></tr>)}</tbody></table></div><h4>Incontri</h4><div className="v14-group-games">{g.games.map(m=>{const assignedWeapon=assignedWeaponFromNotes(m.notes);return <button key={m.id} className="v14-game v14-game-pro" onClick={()=>editMatch(m)}><div className="v14-game-head"><small>{m.phase||'Girone'} {m.group_name||g.name}</small><small>{dateLabel(m.match_time)}</small></div><div className="v14-game-vs"><div className="v14-team-slot"><strong className="v14-team-name ak22-team-name">{teamLabel(m.team_a)}</strong><small className="ak22-team-players">{teamPlayers(m.team_a)}</small><b>{m.score_a??'–'}</b></div><span className="v14-vs-badge">VS</span><div className="v14-team-slot align-right"><strong className="v14-team-name ak22-team-name">{teamLabel(m.team_b)}</strong><small className="ak22-team-players">{teamPlayers(m.team_b)}</small><b>{m.score_b??'–'}</b></div></div><div className="v14-game-meta"><span>🎮 {tournamentModeLabel(m.mode||'')}</span><span>🗺️ {m.map_name||'Mappa da assegnare'}</span>{assignedWeapon&&<span>🔫 {assignedWeapon}</span>}<span>🏟️ {m.lobby_name||'Lobby da assegnare'}</span><span>🎯 Limite {m.score_limit||'–'}</span></div></button>})}</div></article>)}</div>
      {groupTables.length>0&&<div className="v14-playoff-action top-gap"><div><h3>Fase finale e ripescaggio</h3><p className="muted">Le migliori dei gironi passano ai playoff a eliminazione diretta. {secondChancePending?'La scelta del ripescaggio è rinviata: decidi dopo i gironi, prima di creare i playoff.':secondChance?`Tutte le non qualificate disputano un ripescaggio ${secondChanceFormat==='groups'?'a gironi':'a eliminazione diretta'} per gli altri posti nei playoff.`:'Senza ripescaggio, soltanto le qualificate passano ai playoff. Gli slot liberi diventano passaggi diretti (BYE).'}</p></div><div className="v143-actions">{secondChance&&<button className="btn small secondary" onClick={()=>void generateRepechage()} disabled={!canWrite||tournamentBusy||!allGroupsFinished||matches.some(m=>m.phase!=='Girone')}>♻️ Genera ripescaggio</button>}<span className="muted">Il tabellone Winners/Losers con gli slot dei qualificati può essere già generato qui sotto, prima dei risultati.</span></div></div>}
      {repechageMatches.length>0&&<><h3 className="top-gap">♻️ Ripescaggio — seconda possibilità</h3>
        <p className="muted">{repechageGroupMatches.length>0?'Tutte le non qualificate competono nei nuovi gironi di ripescaggio. La prima di ogni girone entra nei playoff.':'Tutte le non qualificate competono in eliminazione diretta. Le vincenti delle finali entrano nei playoff.'} Nessun risultato dei gironi principali viene cancellato.</p>
        {repechageGroupTables.length>0&&<div className="v14-group-grid top-gap">{repechageGroupTables.map(g=><article className="v14-group-card" key={g.name}><header><h3>{g.name.toUpperCase()}</h3><span>{g.finished?'Concluso':'In corso'}</span></header><div className="table-scroll"><table className="table compact"><thead><tr><th>#</th><th>Squadra</th><th>G</th><th>V</th><th>N</th><th>Diff</th><th>Pt</th></tr></thead><tbody>{g.ranking.map((t,i)=><tr key={t.team} className={g.finished?(i===0?'v14-qualify':'v14-out'):'v14-pending'}><td>{i+1}</td><td title={teamLabel(t.team)}><b>{teamLabel(t.team)}</b> {g.finished?(i===0?'✓':'×'):'·'}</td><td>{t.played}</td><td>{t.wins}</td><td>{t.draws}</td><td>{t.diff}</td><td>{t.points}</td></tr>)}</tbody></table></div><h4>Partite di ripescaggio</h4><div className="v14-group-games">{g.games.map(m=>{const assignedWeapon=assignedWeaponFromNotes(m.notes);return <button key={m.id} className="v14-game v14-game-pro" onClick={()=>editMatch(m)}><div className="v14-game-head"><small>{m.phase||'Ripescaggio'} {m.group_name||g.name}</small><small>{dateLabel(m.match_time)}</small></div><div className="v14-game-vs"><div className="v14-team-slot"><strong className="v14-team-name ak22-team-name">{teamLabel(m.team_a)}</strong><small className="ak22-team-players">{teamPlayers(m.team_a)}</small><b>{m.score_a??'–'}</b></div><span className="v14-vs-badge">VS</span><div className="v14-team-slot align-right"><strong className="v14-team-name ak22-team-name">{teamLabel(m.team_b)}</strong><small className="ak22-team-players">{teamPlayers(m.team_b)}</small><b>{m.score_b??'–'}</b></div></div><div className="v14-game-meta"><span>🎮 {tournamentModeLabel(m.mode||'')}</span><span>🗺️ {m.map_name||'Mappa da assegnare'}</span>{assignedWeapon&&<span>🔫 {assignedWeapon}</span>}<span>🏟️ {m.lobby_name||'Lobby da assegnare'}</span></div></button>})}</div></article>)}</div>}
        {repechageKnockoutMatches.length>0&&<div className="tournament-bracket-board v14-bracket top-gap">{Array.from(new Set(repechageKnockoutMatches.map(m=>m.phase||'Ripescaggio'))).map(phase=><div className="bracket-column" key={phase}><h3>{phase}</h3>{repechageKnockoutMatches.filter(m=>m.phase===phase).map(m=><button className="bracket-match" key={m.id} onClick={()=>editMatch(m)}><span className={resultClass(m,m.team_a)}>{teamLabel(m.team_a)}</span><b>{m.score_a??'–'}</b><span className={resultClass(m,m.team_b)}>{teamLabel(m.team_b)}</span><b>{m.score_b??'–'}</b><small>{dateLabel(m.match_time)} · {m.lobby_name||'Lobby da assegnare'}</small></button>)}</div>)}</div>}
        <p className="notice top-gap">{repechageFinished?`Qualificate tramite ripescaggio: ${Array.from(repechageWinners).join(', ')}`:'Ripescaggio in corso: le ripescate saranno definite al termine di tutti gli incontri.'}</p>
      </>}
      </>}
      {active==='bracket'&&<>
      <h3 className="top-gap">Tabellone playoff</h3><div className="tournament-bracket-board v14-bracket top-gap">{groupedMatches.map(([phase,ms])=><div className="bracket-column" key={phase}><h3>{phase}</h3>{ms.map(m=><button key={m.id} className="bracket-match" onClick={()=>editMatch(m)}><span className={resultClass(m,m.team_a)}>{teamLabel(m.team_a)}</span><b>{m.score_a??'–'}</b><span className={resultClass(m,m.team_b)}>{teamLabel(m.team_b)}</span><b>{m.score_b??'–'}</b><small>{dateLabel(m.match_time)} · {m.mode||'—'} / {m.map_name||'—'} · {m.lobby_name||'Lobby da assegnare'}</small></button>)}</div>)}{!groupedMatches.length&&<div className="empty-state">Il percorso playoff completo è disponibile nello schema qui sotto. Gli incontri del girone rimangono nelle card in alto.</div>}</div>
      <h3 className="top-gap">Qualificazione al prossimo turno</h3>
      {groupTables.length>0&&<div className="table-scroll"><table className="table compact v142-advancement-table"><thead><tr><th>Girone</th><th>Squadra (giocatori)</th><th>G</th><th>V</th><th>N</th><th>Diff</th><th>Pt</th><th>Esito</th></tr></thead><tbody>{groupTables.flatMap(g=>g.standings.map((t,i)=>({g,t,qualifies:g.finished&&(i<g.qualifying||extraQualifiers.has(t.team)||repechageWinners.has(t.team)),mayRepeat:secondChance&&i>=g.qualifying}))).map(({g,t,qualifies,mayRepeat})=><tr key={g.name+t.team} className={g.finished?(qualifies?'v14-qualify':mayRepeat&&!repechageFinished?'v143-repechage':'v14-out'):'v14-pending'}><td>{g.name}</td><td>{teamLabel(t.team)}</td><td>{t.played}</td><td>{t.wins}</td><td>{t.draws}</td><td>{t.diff}</td><td>{t.points}</td><td>{!g.finished?'In attesa':qualifies?(repechageWinners.has(t.team)?'✓ Ripescata':'✓ Qualificata'):mayRepeat&&!repechageFinished?'♻️ Ripescaggio':'× Eliminata'}</td></tr>)}</tbody></table></div>}
      {matches.length>0&&<h3 className="top-gap">Incontri classici — avanzamenti</h3>}
      <div className="table-scroll"><table className="table compact v142-advancement-table"><thead><tr><th>Turno</th><th>Incontro / giocatori</th><th>Risultato</th><th>Passa</th><th>Eliminata</th><th>Prossimo turno</th></tr></thead><tbody>{matches.filter(m=>m.phase!=='Girone'&&m.phase!=='Ripescaggio Girone').map(m=><tr key={m.id}><td>{m.phase}</td><td>{teamLabel(m.team_a)} — {teamLabel(m.team_b)}</td><td>{m.score_a??'–'} : {m.score_b??'–'}</td><td className="v142-winning">{m.winner&&m.winner!=='Pareggio'?teamLabel(m.winner):'Da definire'}</td><td className="v142-losing">{m.winner&&m.winner!=='Pareggio'?(m.winner===m.team_a?teamLabel(m.team_b):teamLabel(m.team_a)):'—'}</td><td>{m.next_match_id?'Turno successivo':String(m.phase).startsWith('Ripescaggio ')?'Playoff (ripescata)':'Campione'}</td></tr>)}</tbody></table>{!matches.some(m=>m.phase!=='Girone')&&<p className="muted">Il prospetto verrà compilato quando si genera il tabellone playoff.</p>}</div>
      {!matches.length&&bracketIsGroupMode&&<div className="empty-state">Seleziona i gironi e genera subito lo schema completo qui sotto: gli slot dei qualificati saranno assegnati in anticipo.</div>}
      {selected?.id && (
        <div className="ak19-integrated-bracket" id="tabellone-doppia-eliminazione">
          <p className="notice">🏆 Tabellone integrato del torneo: prima generi l’intero percorso Winners + Losers + Grand Final, poi puoi ancora aggiornare orari, mappe, armi e risultati. Gli sconfitti del Winners entrano nel Losers senza limiti numerici, fino alla semifinale. Grand Final BO3 senza reset.</p>
          {bracketIsGroupMode && <div className="ak22-plan-notice"><strong>🧭 Schema qualificazione predisposto</strong><p>Da ogni girone verranno presi i posti indicati; i nominativi compariranno automaticamente al termine degli incontri. I collegamenti Winners/Losers sono già assegnati.</p><div className="ak22-slot-chips">{fixedQualifiers.map(slot=><span key={slot.id}>{slot.name}{resolvedQualifierNames[slot.id]?` → ${resolvedQualifierNames[slot.id]}`:''}</span>)}</div></div>}
          {needsTeams&&<p className="notice">Per {selected.format} crea prima le squadre usando gli iscritti confermati. Il tabellone usa le squadre, non i singoli giocatori.</p>}
          <AdvancedBracketCenter key={selected.id} tournamentId={selected.id} participants={playoffParticipants} qualifyingSlots={fixedQualifiers} resolvedSlotNames={resolvedQualifierNames} groupSettings={{generation_mode:generationMode,group_count:groupCount,qualifiers_per_group:qualifiersPerGroup,second_chance:secondChance,second_chance_pending:false,second_chance_format:secondChanceFormat,second_chance_slots:secondChanceSlots}} canWrite={canWrite} rules={selected.rules||{}} legacyMatchCount={matches.filter(m=>m.phase!=='Girone'&&!String(m.phase||'').startsWith('Ripescaggio ')).length} eligible={!secondChancePending} teamLabel={teamLabel} teamPlayers={teamPlayers} onSaved={nextRules=>setTournaments(all=>all.map(t=>t.id===selected.id?{...t,rules:nextRules}:t))}/>
        </div>
      )}</>}
      </section>}

      {active === 'calendar' && <section className="card top-gap v142-calendar"><div className="section-title"><div><h2>📅 Calendario delle partite</h2><p className="muted">Data, ora, squadre con giocatori, modalità, mappa e lobby. Clicca una partita per modificarla.</p></div><button className="btn small secondary" onClick={()=>setActive('bracket')}>Apri tabellone</button></div>
        {selected?.rules?.advanced_bracket_v2?.version===2 && <AdvancedTournamentCalendar snapshot={selected.rules.advanced_bracket_v2} resolvedSlotNames={resolvedQualifierNames} teamPlayers={teamPlayers} onEdit={()=>setActive('bracket')}/>}
        <div className="v142-calendar-list">{[...matches].sort((a,b)=>String(a.match_time||'9999').localeCompare(String(b.match_time||'9999'))).map(m=>{const assignedWeapon=assignedWeaponFromNotes(m.notes);return <button key={m.id} className="v142-calendar-item" onClick={()=>editMatch(m)}><div className="v142-calendar-time"><strong>{dateLabel(m.match_time)}</strong><small>{m.phase} {m.group_name||''}</small></div><div className="v142-calendar-main"><div className="v14-game-vs v142-calendar-vs"><div className="v14-team-slot"><strong className="v14-team-name ak22-team-name">{teamLabel(m.team_a)}</strong><small className="ak22-team-players">{teamPlayers(m.team_a)}</small><b>{m.score_a??'–'}</b></div><span className="v14-vs-badge">VS</span><div className="v14-team-slot align-right"><strong className="v14-team-name ak22-team-name">{teamLabel(m.team_b)}</strong><small className="ak22-team-players">{teamPlayers(m.team_b)}</small><b>{m.score_b??'–'}</b></div></div><div className="v14-game-meta v142-calendar-meta"><span>🎮 {tournamentModeLabel(m.mode||'')}</span><span>🗺️ {m.map_name||'Mappa da assegnare'}</span>{assignedWeapon&&<span>🔫 {assignedWeapon}</span>}<span>🎯 Limite {m.score_limit||'–'}</span><span>🏟️ {m.lobby_name||'Lobby da assegnare'}</span></div><div className="v142-calendar-result"><span>{m.status||'Da giocare'}</span><b>{scoreLabel(m)}</b></div></div></button>})}{!matches.length&&!selected?.rules?.advanced_bracket_v2&&<p className="muted">Nessuna partita programmata. Genera gli incontri dal tabellone.</p>}</div></section>}

      {active === 'matches' && <section className="card top-gap"><div className="section-title"><div><h2>{matchForm.id ? 'Modifica risultato partita' : 'Partita torneo'}</h2><p className="muted">Clicca una partita dal tabellone oppure crea una partita manuale. Vincitore verde, eliminato rosso.</p></div><button className="btn small secondary" type="button" onClick={() => setActive('bracket')}>Apri tabellone</button></div><div className="grid grid-4"><div className="field"><label>Team A</label><input className="input" value={matchForm.teamA} onChange={(e)=>setMatchForm({...matchForm,teamA:e.target.value})}/></div><div className="field"><label>Team B</label><input className="input" value={matchForm.teamB} onChange={(e)=>setMatchForm({...matchForm,teamB:e.target.value})}/></div><div className="field"><label>Fase</label><select className="select pro-select" value={matchForm.phase} onChange={(e)=>setMatchForm({...matchForm,phase:e.target.value})}>{Array.from(new Set(['Girone','Ripescaggio Girone',...phasesOrder,matchForm.phase])).map((p)=><option key={p}>{p}</option>)}</select></div><div className="field"><label>Gruppo/Turno</label><input className="input" value={matchForm.group} onChange={(e)=>setMatchForm({...matchForm,group:e.target.value})}/></div><div className="field"><label>Orario match</label><input className="input" type="datetime-local" value={matchForm.date} onChange={(e)=>setMatchForm({...matchForm,date:e.target.value})}/></div><div className="field"><label>Orario apertura lobby</label><input className="input" type="datetime-local" value={matchForm.lobby} onChange={e=>setMatchForm({...matchForm,lobby:e.target.value})}/></div><div className="field"><label>Mappa</label><select className="select pro-select" value={matchForm.map} onChange={(e)=>setMatchForm({...matchForm,map:e.target.value})}>{Array.from(new Set([...codmMaps,...selectedMaps,matchForm.map])).filter(Boolean).map(m=><option key={m}>{m}</option>)}</select></div><div className="field"><label>Modalità</label><select className="select pro-select" value={matchForm.mode} onChange={(e)=>setMatchForm({...matchForm,mode:e.target.value,scoreLimit:String(scoreLimits[e.target.value]||defaultScoreLimits[e.target.value]||0)})}>{Array.from(new Set([...selectedModes,matchForm.mode])).map(m=><option key={m}>{m}</option>)}</select></div><div className="field"><label>Limite punteggio (modalità)</label><input className="input" type="number" min="1" value={matchForm.scoreLimit} onChange={e=>setMatchForm({...matchForm,scoreLimit:e.target.value})}/></div><div className="field"><label>Risultato</label><div className="score-inline"><input className="input" value={matchForm.scoreA} onChange={(e)=>setMatchForm({...matchForm,scoreA:e.target.value.replace(/[^0-9]/g,'')})}/><span>:</span><input className="input" value={matchForm.scoreB} onChange={(e)=>setMatchForm({...matchForm,scoreB:e.target.value.replace(/[^0-9]/g,'')})}/></div></div><div className="field"><label>Lobby / Stanza</label><input className="input" value={matchForm.lobbyName} onChange={e=>setMatchForm({...matchForm,lobbyName:e.target.value})} placeholder="Lobby 1"/></div><div className="field"><label>Arbitro / Staff</label><input className="input" value={matchForm.referee} onChange={e=>setMatchForm({...matchForm,referee:e.target.value})}/></div><div className="field"><label>MVP</label><input className="input" value={matchForm.mvp} onChange={(e)=>setMatchForm({...matchForm,mvp:e.target.value})}/></div><div className="field"><label>Screenshot prova/link</label><input className="input" value={matchForm.screenshotUrl} onChange={(e)=>setMatchForm({...matchForm,screenshotUrl:e.target.value})}/></div><div className="field grid-span-2"><label>Note</label><input className="input" value={matchForm.notes} onChange={(e)=>setMatchForm({...matchForm,notes:e.target.value})}/></div></div><div className="notice top-gap"><b>Regole partita:</b> {rulesSummary()}</div><button className="btn top-gap" onClick={saveMatch}>💾 {matchForm.id ? 'Aggiorna risultato partita' : 'Salva partita torneo'}</button><div className="ak23-results-list top-gap">{matches.map(m=>{const assignedWeapon=assignedWeaponFromNotes(m.notes);return <button type="button" key={m.id} className="ak23-result-card" onClick={()=>editMatch(m)}><header><strong>{m.phase||'Partita'} · {m.group_name?`Girone ${m.group_name}`:'Torneo'}</strong><small>🕒 {dateLabel(m.match_time)}</small></header><div className="v14-game-vs"><div className="v14-team-slot"><strong className="ak22-team-name">{teamLabel(m.team_a)}</strong><small className="ak22-team-players">{teamPlayers(m.team_a)}</small><b>{m.score_a??'–'}</b></div><span className="v14-vs-badge">VS</span><div className="v14-team-slot"><strong className="ak22-team-name">{teamLabel(m.team_b)}</strong><small className="ak22-team-players">{teamPlayers(m.team_b)}</small><b>{m.score_b??'–'}</b></div></div><div className="v14-game-meta"><span>🎮 {tournamentModeLabel(m.mode||'')}</span><span>🗺️ {m.map_name||'Da assegnare'}</span>{assignedWeapon&&<span>🔫 {assignedWeapon}</span>}<span>🎯 {m.score_limit??'—'}</span><span>🏟️ {m.lobby_name||'Lobby da assegnare'}</span></div><footer><span>{m.status||'Da giocare'}</span><strong>{scoreLabel(m)}</strong></footer></button>})}</div></section>}



      {active === 'archive' && <section className="card top-gap"><h2>Archivio tornei</h2><div className="tournament-team-list">{tournaments.filter(t=>['Finito','Archiviato'].includes(String(t.status))).map(t=><article key={t.id} className="compact-card"><b>{t.name}</b><span>{t.status}</span><small>Vincitore: {t.winner || 'da definire'} · statistiche finali sempre nella pagina Torneo.</small></article>)}</div></section>}
    </main>
  );
}
