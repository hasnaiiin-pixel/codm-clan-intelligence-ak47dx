'use client';
import { useCodmAuth } from '@/lib/authRoles';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';


import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { findBestNicknameMatch, type ParsedScoreRow } from '@/lib/ocrParsers';
import { calculatePlayerRating } from '@/lib/statistics';
import { getActivePhoneProfile, listCalibrationPhoneProfiles, loadCalibrationBundle, setActivePhoneProfile } from '@/lib/calibration';
import { ACCEPTED_OCR_BACKEND_VERSIONS, EXPECTED_OCR_BACKEND_VERSION, getOcrBackendCandidates } from '@/lib/ocrBackend';
import type { GameMode, MatchResult, MatchType, Player, TeamSide } from '@/lib/types';

const modes: GameMode[] = ['CED', 'TDM', 'PRIMA_LINEA', 'DOMINIO', 'POSTAZIONE', 'KILL_CONFIRMED', 'BR_SOLO', 'BR_DUO', 'BR_SQUAD'];
const types: MatchType[] = ['scrim', 'ranked', 'private', 'training', 'tournament', 'br'];

const EXPECTED_BACKEND_VERSION = EXPECTED_OCR_BACKEND_VERSION;
const ACCEPTED_BACKEND_VERSIONS = ACCEPTED_OCR_BACKEND_VERSIONS;

type UiScoreRow = ParsedScoreRow & {
  playerClanName?: string | null;
  sourceColor?: 'blue' | 'red';
};

type BackendOcrBox = {
  name: string;
  role: string;
  team?: 'blue' | 'red' | null;
  row?: number | null;
  x_norm: number;
  y_norm: number;
  w_norm: number;
  h_norm: number;
  confidence?: number;
};

type BackendOcrRow = {
  rank: number;
  nickname_ocr?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  mvp_label?: 'MVP_WIN' | 'MVP_LOSE' | null;
  confidence?: number;
};

type BackendOcrResult = {
  engine_version?: string;
  result?: MatchResult | null;
  winning_team?: 'blue' | 'red' | 'draw' | null;
  our_team?: 'blue' | 'red' | null;
  blue_score?: number | null;
  red_score?: number | null;
  mode?: string | null;
  map?: string | null;
  match_datetime?: string | null;
  layout_confidence?: number;
  ocr_confidence?: number;
  teams?: { blue?: BackendOcrRow[]; red?: BackendOcrRow[] };
  boxes?: BackendOcrBox[];
  warnings?: string[];
  raw_text?: string;
};

function backendCandidates() {
  return getOcrBackendCandidates();
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function isPlaceholderNickname(value: string) {
  return /^(Blu|Rosso|Blue|Red|Player|Enemy|Giocatore|Avversario)\s*\d*$/i.test(value.trim());
}

function emptyRow(side: TeamSide, rank: number, clanName = ''): UiScoreRow {
  return {
    rankPosition: rank,
    nickname: side === 'ALLY' ? `Nostro ${rank}` : `Avversario ${rank}`,
    playerId: null,
    ocrNickname: null,
    needsReview: true,
    readStatus: 'manual',
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    impact: null,
    captures: 0,
    objectiveTimeText: '',
    objectiveTimeSeconds: 0,
    teamSide: side,
    mvp: rank === 1,
    mvpLabel: rank === 1 ? (side === 'ALLY' ? 'MVP_WIN' : 'MVP_LOSE') : null,
    playerClanName: clanName
  };
}

function defaultScoreRows(_opponent = ''): UiScoreRow[] {
  return [1, 2, 3, 4, 5].map((rank) => emptyRow('ALLY', rank, 'Nostro clan'));
}

function modeFromBackend(value?: string | null): GameMode | null {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/\s+/g, '_');
  return modes.includes(normalized as GameMode) ? normalized as GameMode : null;
}

function computeOurResult(winningTeam: 'blue' | 'red' | 'draw' | '', ourTeam: 'blue' | 'red'): MatchResult {
  if (!winningTeam || winningTeam === 'draw') return 'DRAW';
  return winningTeam === ourTeam ? 'WIN' : 'LOSE';
}

function parseBackendMatchDate(textValue: string) {
  const text = textValue.trim();
  const m = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(\d{2,4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = Number(m[3] || 0);
  let year = Number(m[4]);
  const month = Number(m[5]);
  const day = Number(m[6]);
  if (year < 100) year += 2000;
  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}


function rankMedal(rank?: number | null) {
  if (rank === 1) return { icon: '🥇', label: 'Gold / MVP', className: 'medal-gold' };
  if (rank === 2) return { icon: '🥈', label: 'Silver', className: 'medal-silver' };
  if (rank === 3) return { icon: '🥉', label: 'Bronze', className: 'medal-bronze' };
  if (rank === 4) return { icon: '4️⃣', label: '4° posto', className: 'medal-normal' };
  if (rank === 5) return { icon: '5️⃣', label: '5° posto', className: 'medal-normal' };
  return { icon: '•', label: 'Da ordinare', className: 'medal-normal' };
}

function modeLabel(mode: GameMode) {
  const labels: Record<GameMode, string> = {
    CED: 'CED / Cerca e Distruggi',
    TDM: 'TDM',
    PRIMA_LINEA: 'Prima Linea',
    DOMINIO: 'Dominio',
    POSTAZIONE: 'Postazione / Hardpoint',
    KILL_CONFIRMED: 'Kill Confirmed',
    BR_SOLO: 'BR Solo',
    BR_DUO: 'BR Duo',
    BR_SQUAD: 'BR Squad'
  };
  return labels[mode] || mode;
}

export default function ImportMatchPage() {
  const codmAuth = useCodmAuth();

  if (codmAuth.loading) return <WriteAccessBlock loading />;

  if (!codmAuth.canWrite) {
    return (
      <WriteAccessBlock
        role={codmAuth.role}
        title="Solo Staff, Coach o Owner può caricare risultati"
        description="La dashboard resta pubblica in sola lettura. Per importare partite e screenshot serve un ruolo autorizzato dall'admin."
      />
    );
  }

  return <ImportMatchEditor />;
}

function ImportMatchEditor() {
  const [roster, setRoster] = useState<Player[]>([]);
  const [clanId, setClanId] = useState('');
  const [clanName, setClanName] = useState('Nostro clan');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<UiScoreRow[]>([]);
  const [mode, setMode] = useState<GameMode>('CED');
  const [matchType, setMatchType] = useState<MatchType>('scrim');
  const [result, setResult] = useState<MatchResult>('WIN');
  const [mapName, setMapName] = useState('');
  const [matchDateText, setMatchDateText] = useState('');
  const [opponent, setOpponent] = useState('');
  const [matchNotes, setMatchNotes] = useState('');
  const [teamScore, setTeamScore] = useState('');
  const [enemyScore, setEnemyScore] = useState('');
  const [message, setMessage] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');
  const [backendBoxes, setBackendBoxes] = useState<BackendOcrBox[]>([]);
  const [backendRawJson, setBackendRawJson] = useState('');
  const [calibrationProfiles, setCalibrationProfiles] = useState<string[]>(['default']);
  const [selectedCalibrationPhone, setSelectedCalibrationPhone] = useState('default');
  const [useCalibrationTemplate, setUseCalibrationTemplate] = useState(true);
  const [calibrationMode, setCalibrationMode] = useState<'table_lock' | 'content_frame' | 'strict_image'>('table_lock');
  const [ourTeam, setOurTeam] = useState<'blue' | 'red'>('blue');
  const [winningTeam, setWinningTeam] = useState<'blue' | 'red' | 'draw' | ''>('');
  const [working, setWorking] = useState(false);
  const [ocrProgressPct, setOcrProgressPct] = useState(0);

  useEffect(() => {
    loadRoster();
    const activePhone = getActivePhoneProfile('scoreboard_ced');
    setSelectedCalibrationPhone(activePhone);
    setCalibrationProfiles(listCalibrationPhoneProfiles('scoreboard_ced'));
  }, []);

  useEffect(() => {
    setResult(computeOurResult(winningTeam, ourTeam));
  }, [winningTeam, ourTeam]);

  async function loadRoster() {
    const { data: clansData } = await supabase.from('clans').select('*').limit(1);
    const clans = (clansData || []) as Array<{ id: string; name?: string; tag?: string | null }>;
    if (clans?.[0]?.id) {
      setClanId(clans[0].id);
      setClanName(clans[0].tag || clans[0].name || 'Nostro clan');
    }
    const { data } = await supabase.from('players').select('*').order('nickname');
    setRoster((data || []) as Player[]);
  }

  function onFileSelected(selected: File | null) {
    setFile(selected);
    setRows(selected ? defaultScoreRows(opponent) : []);
    setRawText('');
    setBackendBoxes([]);
    setBackendRawJson('');
    setOcrProgress('');
    setMessage('');
    const activePhone = getActivePhoneProfile('scoreboard_ced');
    setSelectedCalibrationPhone(activePhone);
    setCalibrationProfiles(listCalibrationPhoneProfiles('scoreboard_ced'));
    if (!selected) return setImageUrl('');
    setImageUrl(URL.createObjectURL(selected));
  }

  function applyBackendRows(parsed: BackendOcrResult) {
    const activeOurTeam = parsed.our_team || ourTeam;
    const ourRows = (activeOurTeam === 'red' ? parsed.teams?.red : parsed.teams?.blue) || [];

    const mappedRows = ourRows.map((row) => {
      const color = activeOurTeam;
      const rawNick = row.nickname_ocr?.trim() || `Nostro ${row.rank}`;
      const best = rawNick && !isPlaceholderNickname(rawNick) ? findBestNicknameMatch(rawNick, roster) : undefined;
      const rowConfidence = row.confidence || 0;
      return {
        rankPosition: row.rank,
        nickname: best?.nickname || rawNick,
        playerId: best?.id || null,
        ocrNickname: rawNick,
        needsReview: !rawNick || isPlaceholderNickname(rawNick) || rowConfidence < 0.62 || !best,
        readStatus: rowConfidence >= 0.80 ? 'ok' : rowConfidence >= 0.48 ? 'partial' : 'manual',
        kills: row.kills || 0,
        deaths: row.deaths || 0,
        assists: row.assists || 0,
        score: 0,
        impact: null,
        captures: 0,
        objectiveTimeText: '',
        objectiveTimeSeconds: 0,
        teamSide: 'ALLY' as TeamSide,
        sourceColor: color,
        mvp: !!row.mvp_label || row.rank === 1,
        mvpLabel: row.mvp_label || (row.rank === 1 ? 'MVP_WIN' : null),
        playerClanName: clanName
      } satisfies UiScoreRow;
    });

    const filled = mappedRows.length ? mappedRows : [1, 2, 3, 4, 5].map((rank) => emptyRow('ALLY', rank, clanName));
    setRows(filled.sort((a, b) => (a.rankPosition || 0) - (b.rankPosition || 0)));
  }

  function postFormDataWithProgress(
    url: string,
    formData: FormData,
    timeoutMs: number,
    onProgress: (percent: number, label: string) => void
  ): Promise<BackendOcrResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = timeoutMs;
      xhr.responseType = 'text';

      let fakeProgress = 55;
      let serverTimer: number | null = null;
      const startServerTimer = () => {
        if (serverTimer !== null) return;
        serverTimer = window.setInterval(() => {
          fakeProgress = Math.min(86, fakeProgress + 3);
          onProgress(fakeProgress, 'OCR Render sta leggendo solo il nostro team. Attendi, non chiudere la pagina...');
        }, 2500);
      };
      const clearServerTimer = () => {
        if (serverTimer !== null) window.clearInterval(serverTimer);
        serverTimer = null;
      };

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const uploadPct = 30 + Math.round((event.loaded / event.total) * 25);
          onProgress(Math.min(55, uploadPct), 'Caricamento screenshot verso OCR Render...');
        } else {
          onProgress(38, 'Caricamento screenshot verso OCR Render...');
        }
      };
      xhr.upload.onload = () => {
        onProgress(55, 'Upload completato. OCR in lavorazione sul backend Render...');
        startServerTimer();
      };

      xhr.onload = () => {
        clearServerTimer();
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            onProgress(88, 'Risposta OCR ricevuta. Creo tabella di revisione...');
            resolve(JSON.parse(xhr.responseText || '{}') as BackendOcrResult);
          } catch (error) {
            reject(new Error(`Risposta OCR non valida: ${error instanceof Error ? error.message : 'JSON non leggibile'}`));
          }
          return;
        }
        reject(new Error(`Backend OCR non risponde correttamente (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
      };

      xhr.onerror = () => { clearServerTimer(); reject(new Error('Errore rete verso Backend OCR Render. Controlla NEXT_PUBLIC_OCR_BACKEND_URL e CORS.')); };
      xhr.ontimeout = () => { clearServerTimer(); reject(new DOMException('OCR timeout', 'AbortError')); };

      onProgress(30, 'Invio screenshot al backend OCR...');
      xhr.send(formData);
    });
  }

  async function runBackendOcr() {
    if (!file) return setMessage('Seleziona prima lo screenshot scoreboard.');
    setWorking(true);
    setBackendBoxes([]);
    setBackendRawJson('');
    setOcrProgressPct(3);
    setOcrProgress('Preparazione screenshot e verifica backend OCR...');
    setMessage('Import veloce V4.5: viene letta SOLO la squadra selezionata come nostro team. Se dopo analisi vuoi cambiare BLU/ROSSO, cambia selezione e premi di nuovo Importa risultati.');
    try {
      let backendUrl = '';
      let backendVersion = 'unknown';
      const attempts: string[] = [];
      for (const candidate of backendCandidates()) {
        setOcrProgressPct(10);
        setOcrProgress(`Verifica backend OCR: ${candidate}/health`);
        try {
          const healthResponse = await fetchWithTimeout(`${candidate}/health`, { cache: 'no-store' }, 25000);
          if (!healthResponse.ok) {
            attempts.push(`${candidate} -> HTTP ${healthResponse.status}`);
            continue;
          }
          const health = await healthResponse.json() as { version?: string };
          backendVersion = health.version || 'unknown';
          if (!ACCEPTED_BACKEND_VERSIONS.includes(backendVersion)) {
            attempts.push(`${candidate} -> versione ${backendVersion}, attese ${ACCEPTED_BACKEND_VERSIONS.join(', ')}`);
            continue;
          }
          backendUrl = candidate;
          setOcrProgressPct(22);
          setOcrProgress(`Backend OCR attivo (${backendVersion}). Preparazione upload...`);
          break;
        } catch (healthError) {
          attempts.push(`${candidate} -> ${healthError instanceof Error ? healthError.message : 'Failed to fetch'}`);
        }
      }
      if (!backendUrl) {
        const hint = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
          ? 'Su Vercel devi impostare NEXT_PUBLIC_OCR_BACKEND_URL con un backend OCR pubblico HTTPS. Non viene usato localhost/127.0.0.1 online.'
          : 'In locale avvia il backend OCR e verifica http://127.0.0.1:8780/health.';
        throw new Error(`Backend OCR Hybrid 2.0 non raggiungibile o non allineato. ${hint} Versioni accettate ${ACCEPTED_BACKEND_VERSIONS.join(', ')}. Tentativi: ${attempts.join(' | ') || 'nessun URL configurato'}`);
      }

      const formData = new FormData();
      formData.append('file', file);
      if (useCalibrationTemplate) {
        setActivePhoneProfile('scoreboard_ced', selectedCalibrationPhone);
        const calibrationBundle = loadCalibrationBundle('scoreboard_ced', selectedCalibrationPhone);
        formData.append('calibration_template', JSON.stringify(calibrationBundle));
        formData.append('calibration_mode', calibrationMode);
      }
      formData.append('our_team', ourTeam);
      formData.append('extract_scope', 'fast_our_only');

      const parsed = await postFormDataWithProgress(`${backendUrl}/ocr/scoreboard/ced`, formData, 90000, (percent, label) => {
        setOcrProgressPct(percent);
        setOcrProgress(label);
      });
      setBackendRawJson(JSON.stringify(parsed, null, 2));
      setBackendBoxes(parsed.boxes || []);
      setRawText(parsed.raw_text || JSON.stringify(parsed, null, 2));

      if (parsed.winning_team) setWinningTeam(parsed.winning_team);
      if (parsed.our_team === 'blue' || parsed.our_team === 'red') setOurTeam(parsed.our_team);
      const activeWinningTeam = parsed.winning_team || winningTeam;
      if (activeWinningTeam) setResult(computeOurResult(activeWinningTeam, parsed.our_team || ourTeam));
      const backendMode = modeFromBackend(parsed.mode);
      if (backendMode) setMode(backendMode);
      if (parsed.map) setMapName(parsed.map);
      if (parsed.match_datetime) setMatchDateText(parsed.match_datetime);
      const ourScore = (parsed.our_team || ourTeam) === 'blue' ? parsed.blue_score : parsed.red_score;
      const opponentScore = (parsed.our_team || ourTeam) === 'blue' ? parsed.red_score : parsed.blue_score;
      setTeamScore(ourScore === null || ourScore === undefined ? '' : String(ourScore));
      setEnemyScore(opponentScore === null || opponentScore === undefined ? '' : String(opponentScore));
      setOcrProgressPct(94);
      setOcrProgress('OCR completato. Applico dati letti alla tabella...');
      applyBackendRows(parsed);

      const ourCount = ((parsed.our_team || ourTeam) === 'blue' ? parsed.teams?.blue?.length : parsed.teams?.red?.length) || 0;
      const warnings = parsed.warnings?.length ? ` Warning: ${parsed.warnings.join(' | ')}` : '';
      setOcrProgressPct(100);
      setOcrProgress('Import completato. Controlla righe gialle prima di salvare.');
      setMessage(`Import nostro team completato. Layout=${Math.round((parsed.layout_confidence || 0) * 100)}%, OCR=${Math.round((parsed.ocr_confidence || 0) * 100)}%. Righe lette nostro team=${ourCount}. Avversari salvati solo come clan/score/esito. Vincente=${parsed.winning_team || 'da verificare'}. Controlla campi gialli e salva partita.${warnings}`);
    } catch (error) {
      setOcrProgressPct(100);
      setOcrProgress('Import OCR fermato. Controlla messaggio e stato backend.');
      setMessage(error instanceof Error ? (error.name === 'AbortError' ? 'OCR fermato per timeout: il backend non ha risposto entro 90 secondi. V4.5 usa modalità veloce; se succede ancora apri /ocr-status e /health Render, poi riprova. Se localhost funziona e online no, Render è in cold start o piano free troppo lento.' : error.message) : 'Errore Backend OCR Pro.');
    } finally {
      setWorking(false);
    }
  }

  function updateRow(index: number, key: keyof UiScoreRow, value: string | boolean) {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === 'nickname' || key === 'objectiveTimeText' || key === 'playerClanName') return { ...row, [key]: String(value), needsReview: false };
      if (key === 'mvp') return { ...row, mvp: Boolean(value) };
      if (key === 'teamSide') return { ...row, teamSide: String(value) as TeamSide };
      if (key === 'playerId') {
        const selected = roster.find((player) => player.id === String(value));
        return { ...row, playerId: String(value) || null, nickname: selected?.nickname || row.nickname, playerClanName: selected?.clan_name || row.playerClanName, needsReview: false };
      }
      return { ...row, [key]: value === '' ? 0 : Number(value), needsReview: false };
    }));
  }

  function addEmptyRow(side: TeamSide) {
    const existing = rows.filter((r) => (r.teamSide || 'ALLY') === side).length;
    setRows((current) => [...current, emptyRow(side, existing + 1, side === 'ALLY' ? clanName : (opponent || 'Avversari'))]);
  }

  async function uploadScreenshot(activeClanId: string) {
    if (!file) return null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${activeClanId}/matches/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('codm-screenshots').upload(path, file, { upsert: false });
    if (error) {
      setMessage(`Errore upload screenshot: ${error.message}`);
      return null;
    }
    const publicUrl = supabase.storage.from('codm-screenshots').getPublicUrl(path).data.publicUrl;
    return { url: publicUrl, path };
  }

  async function ensurePlayerForRow(activeClanId: string, row: UiScoreRow) {
    if (row.playerId) return row.playerId;
    const cleanNickname = row.nickname.trim();
    if (!cleanNickname || isPlaceholderNickname(cleanNickname)) return null;
    const { data: existing } = await supabase.from('players').select('id,nickname,clan_name').eq('clan_id', activeClanId).eq('nickname', cleanNickname).limit(1);
    if (existing?.[0]?.id) return existing[0].id as string;
    const isEnemy = row.teamSide === 'ENEMY';
    const { data: created, error } = await supabase.from('players').insert({
      clan_id: activeClanId,
      nickname: cleanNickname,
      clan_name: row.playerClanName || (isEnemy ? (opponent || 'Avversari') : clanName),
      status: isEnemy ? 'tryout' : 'active',
      notes: isEnemy
        ? 'Creato automaticamente da partita importata. Non ha ancora profilo registrato; può essere collegato/modificato in futuro.'
        : 'Creato automaticamente da inserimento manuale/import risultati. Può essere completato con profilo CODM.'
    }).select('id').single();
    if (error) throw new Error(`Errore creazione player ${cleanNickname}: ${error.message}`);
    return created?.id as string;
  }

  async function saveMatch() {
    setMessage('');
    const activeClanId = clanId;
    if (!activeClanId) return setMessage('Prima crea un clan in Onboarding.');
    const effectiveResult = computeOurResult(winningTeam, ourTeam);
    const screenshotProof = await uploadScreenshot(activeClanId);
    const screenshotUrl = screenshotProof?.url || null;
    const screenshotPath = screenshotProof?.path || null;

    const { data: match, error: matchError } = await supabase.from('matches').insert({
      clan_id: activeClanId,
      mode,
      match_type: matchType,
      result: effectiveResult,
      map_name: mapName || null,
      opponent: opponent || null,
      team_score: teamScore ? Number(teamScore) : null,
      enemy_score: enemyScore ? Number(enemyScore) : null,
      screenshot_url: screenshotUrl,
      screenshot_storage_path: screenshotPath,
      winning_team: winningTeam || null,
      our_team: ourTeam,
      match_notes: matchNotes || null,
      match_date: parseBackendMatchDate(matchDateText) || new Date().toISOString(),
      notes: `${matchNotes ? `${matchNotes}\n\n` : ''}Import risultati 2.0. Screenshot prova=${screenshotPath || screenshotUrl || 'non caricato'}. Template=${useCalibrationTemplate ? `${selectedCalibrationPhone}/${calibrationMode}` : 'OFF'}. OurTeam=${ourTeam}. WinningTeam=${winningTeam || '-'}. MatchDateText=${matchDateText || '-'}.`
    }).select('id').single();

    if (matchError || !match) return setMessage(matchError?.message || 'Partita non creata.');

    const savedStats: string[] = [];
    const archiveRows = [];
    const rowsToSave = rows.filter((row) => (row.teamSide || 'ALLY') !== 'ENEMY');
    for (const row of rowsToSave) {
      try {
        const playerId = await ensurePlayerForRow(activeClanId, row);
        const sourceColor = row.sourceColor || ((ourTeam === 'blue') === (row.teamSide === 'ALLY') ? 'blue' : 'red');
        const teamResult = winningTeam === 'draw' ? 'draw' : winningTeam === sourceColor ? 'winner' : 'loser';
        const isMvp = !!row.mvp || row.rankPosition === 1;
        const mvpType = row.mvpLabel || (row.rankPosition === 1 ? (teamResult === 'winner' ? 'MVP_WIN' : teamResult === 'loser' ? 'MVP_LOSE' : 'MVP') : null);

        archiveRows.push({
          clan_id: activeClanId,
          match_id: match.id,
          player_id: playerId,
          nickname_raw: row.ocrNickname || row.nickname,
          nickname_resolved: row.nickname,
          team_color: sourceColor,
          team_side: row.teamSide || 'ALLY',
          team_result: teamResult,
          team_rank: row.rankPosition || null,
          kills: row.kills || 0,
          deaths: row.deaths || 0,
          assists: row.assists || 0,
          score: 0,
          impact: null,
          mvp_type: mvpType,
          rank_medal: row.rankPosition === 1 ? 'gold' : row.rankPosition === 2 ? 'silver' : row.rankPosition === 3 ? 'bronze' : row.rankPosition ? 'ranked' : null,
          read_status: row.readStatus || 'manual',
          needs_review: !!row.needsReview
        });

        if (!playerId) {
          savedStats.push(`Riga ${row.rankPosition || '?'} non salvata nelle statistiche: nickname mancante.`);
          continue;
        }

        const statPayload = {
          clan_id: activeClanId,
          match_id: match.id,
          player_id: playerId,
          kills: row.kills || 0,
          deaths: row.deaths || 0,
          assists: row.assists || 0,
          score: 0,
          objective_score: 0,
          captures: row.captures || 0,
          impact: null,
          objective_time_seconds: null,
          objective_time_text: null,
          accuracy_percent: null,
          headshot_percent: null,
          kd_ratio: row.deaths ? Number((row.kills / row.deaths).toFixed(2)) : row.kills,
          raw_kda_text: `${row.kills}/${row.deaths}/${row.assists}`,
          team_side: row.teamSide || 'ALLY',
          rank_position: row.rankPosition || null,
          is_mvp: isMvp,
          rating: calculatePlayerRating({
            kills: row.kills,
            deaths: row.deaths,
            assists: row.assists,
            objectiveScore: 0,
            captures: 0,
            impact: 0,
            objectiveTimeSeconds: 0,
            mvp: isMvp,
            win: teamResult === 'winner'
          })
        };
        const { error: statError } = await supabase.from('match_player_stats').insert(statPayload);
        if (statError) savedStats.push(`Errore ${row.nickname}: ${statError.message}`);
        else savedStats.push(`${row.nickname} (${row.playerClanName || '-'})`);
      } catch (error) {
        savedStats.push(error instanceof Error ? error.message : `Errore riga ${row.nickname}`);
      }
    }

    if (archiveRows.length) {
      const { error: rowsArchiveError } = await supabase.from('match_scoreboard_rows').insert(archiveRows);
      if (rowsArchiveError) savedStats.push(`Archivio classifica 1-5 non salvato: ${rowsArchiveError.message}`);
    }

    if (screenshotUrl || rawText) {
      await supabase.from('screenshot_imports').insert({
        clan_id: activeClanId,
        import_type: 'scoreboard',
        file_url: screenshotUrl,
        storage_path: screenshotPath,
        match_id: match.id,
        ocr_raw_text: `${rawText || ''}\n\n=== SCREENSHOT_PROOF ===\nurl=${screenshotUrl || ''}\npath=${screenshotPath || ''}\n\n=== MATCH_NOTES ===\n${matchNotes || ''}\n\n=== ROWS ===\n${JSON.stringify(rowsToSave, null, 2)}`,
        parser_status: 'confirmed'
      });
    }

    await loadRoster();
    setMessage(`Partita salvata. Statistiche salvate per giocatori registrati e manuali: ${savedStats.join(', ') || 'nessuna riga'}. Screenshot allegato come prova.`);
  }

  const allyRows = useMemo(() => rows.map((row, index) => ({ row, index })).filter((item) => item.row.teamSide !== 'ENEMY'), [rows]);

  function renderRowsTable(side: TeamSide, title: string, indexedRows: Array<{ row: UiScoreRow; index: number }>, teamClass: string) {
    return (
      <div className={`team-box ${teamClass}`}>
        <div className="team-title">
          <h3>{title}</h3>
          <button className="btn secondary small" type="button" onClick={() => addEmptyRow(side)}>+ Riga manuale</button>
        </div>
        <div className="table-scroll">
          <table className="table compact import-table-clean">
            <thead>
              <tr>
                <th>#</th><th>Medaglia</th><th>Player roster</th><th>Nome giocatore</th><th>Clan appartenenza</th><th>🗡️ Kill</th><th>💀 Death</th><th>🤝 Assist</th><th>🏆 MVP</th><th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {indexedRows.map(({ row, index }) => (
                <tr key={`${side}-${index}`}>
                  <td><input className="input mini" value={row.rankPosition || ''} onChange={(e) => updateRow(index, 'rankPosition', e.target.value)} /></td>
                  <td><span className={`rank-medal ${rankMedal(row.rankPosition).className}`}>{rankMedal(row.rankPosition).icon} {rankMedal(row.rankPosition).label}</span></td>
                  <td>
                    <select className="select roster-select" value={row.playerId || ''} onChange={(e) => updateRow(index, 'playerId', e.target.value)}>
                      <option value="">Manuale / non registrato</option>
                      {roster.map((player) => <option key={player.id} value={player.id}>{player.nickname}{player.clan_name ? ` · ${player.clan_name}` : ''}</option>)}
                    </select>
                  </td>
                  <td><input className="input nick-input" value={row.nickname} onChange={(e) => updateRow(index, 'nickname', e.target.value)} placeholder="Nome giocatore" /></td>
                  <td><input className="input clan-input" value={row.playerClanName || ''} onChange={(e) => updateRow(index, 'playerClanName', e.target.value)} placeholder={side === 'ALLY' ? clanName : 'Clan avversario'} /></td>
                  <td><input className="input mini" value={row.kills} onChange={(e) => updateRow(index, 'kills', e.target.value)} /></td>
                  <td><input className="input mini" value={row.deaths} onChange={(e) => updateRow(index, 'deaths', e.target.value)} /></td>
                  <td><input className="input mini" value={row.assists} onChange={(e) => updateRow(index, 'assists', e.target.value)} /></td>
                  <td><label className="check-line"><input type="checkbox" checked={!!row.mvp || row.rankPosition === 1} onChange={(e) => updateRow(index, 'mvp', e.target.checked)} /> <span>{row.rankPosition === 1 ? 'Top 1' : ''}</span></label></td>
                  <td><span className={row.needsReview ? 'badge warn' : 'badge ok'}>{row.needsReview ? 'Controlla' : (row.readStatus || 'ok')}</span></td>
                </tr>
              ))}
              {!indexedRows.length && <tr><td colSpan={10} className="muted">Nessuna riga. Aggiungi player manualmente.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <main className="container wide">
      <section className="card import-hero">
        <div>
          <p className="eyebrow">⚡ Import risultati semplificato</p>
          <h1>Import partita CODM</h1>
          <p className="muted">Carica screenshot CED o Postazione, scegli se il tuo team è blu o rosso e importa solo i 5 player del tuo clan. Dell'avversario vengono salvati solo nome clan, score ed esito.</p>
        </div>
        <div className="import-actions">
          <input className="input" type="file" accept="image/*" onChange={(e) => onFileSelected(e.target.files?.[0] || null)} />
          <button className="btn import-main-btn" onClick={runBackendOcr} disabled={working || !file}>{working ? '⏳ Lettura in corso...' : '🚀 Importa risultati'}</button>
        </div>
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>Screenshot prova</h2>
          {imageUrl ? (
            <div className="ocr-image-wrap">
              <img className="preview ocr-overlay-image" src={imageUrl} alt="Scoreboard" />
              {!!backendBoxes.length && <div className="ocr-overlay-layer">{backendBoxes.map((box, index) => <div key={`${box.name}-${index}`} className={`ocr-box ${box.team === 'blue' ? 'ocr-box-blue' : box.team === 'red' ? 'ocr-box-red' : 'ocr-box-neutral'}`} title={`${box.name} | ${box.role}`} style={{ left: `${box.x_norm * 100}%`, top: `${box.y_norm * 100}%`, width: `${box.w_norm * 100}%`, height: `${box.h_norm * 100}%` }} />)}</div>}
            </div>
          ) : <div className="empty-state">🖼️ Carica lo screenshot della partita.</div>}
          {(working || ocrProgress) && (
            <div className="ak-progress-panel">
              <div className="ak-progress-row"><span>{working ? 'Lavorazione OCR in corso' : 'Stato OCR'}</span><span>{ocrProgressPct}%</span></div>
              <div className="ak-progress-track"><div className="ak-progress-fill" style={{ width: `${ocrProgressPct}%` }} /></div>
              <div className="ak-progress-note">{ocrProgress}</div>
            </div>
          )}
          {message && <div className="notice top-gap">{message}</div>}
          <details className="top-gap">
            <summary>⚙️ Impostazioni avanzate OCR</summary>
            <div className="grid grid-2 top-gap">
              <div className="field"><label>Usa calibrazione</label><select className="select" value={useCalibrationTemplate ? 'yes' : 'no'} onChange={(e) => setUseCalibrationTemplate(e.target.value === 'yes')}><option value="yes">Sì, usa template salvato</option><option value="no">No, layout automatico</option></select></div>
              <div className="field"><label>Template telefono</label><select className="select" value={selectedCalibrationPhone} onChange={(e) => { setSelectedCalibrationPhone(e.target.value); setActivePhoneProfile('scoreboard_ced', e.target.value); }} disabled={!useCalibrationTemplate}>{calibrationProfiles.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="field"><label>Modo template</label><select className="select" value={calibrationMode} onChange={(e) => setCalibrationMode(e.target.value as 'table_lock' | 'content_frame' | 'strict_image')} disabled={!useCalibrationTemplate}><option value="table_lock">Table-lock consigliato</option><option value="content_frame">Content frame</option><option value="strict_image">Coordinate immagine esatta</option></select></div>
              <div className="field"><label>Conferma nostro team</label><select className="select" value={ourTeam} onChange={(e) => setOurTeam(e.target.value as 'blue' | 'red')}><option value="blue">Blu / sinistra</option><option value="red">Rosso / destra</option></select></div>
            </div>
            <div className="top-gap"><a className="btn small secondary" href="/calibration">🎯 Apri calibrazione</a></div>
          </details>
          {rawText && <details><summary>Debug OCR grezzo</summary><div className="raw-box">{rawText}</div></details>}
          {backendRawJson && <details><summary>JSON Backend OCR</summary><div className="raw-box">{backendRawJson}</div></details>}
        </div>

        <div className="card">
          <h2>Dati partita</h2>
          <div className="form">
            <div className="grid grid-2"><div className="field"><label>Tipo partita</label><select className="select" value={matchType} onChange={(e) => setMatchType(e.target.value as MatchType)}>{types.map((m) => <option key={m}>{m}</option>)}</select></div><div className="field"><label>Modalità</label><select className="select" value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>{modes.map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}</select></div></div>
            <div className="grid grid-2"><div className="field"><label>Mappa</label><input className="input" value={mapName} onChange={(e) => setMapName(e.target.value)} /></div><div className="field"><label>Data/ora partita</label><input className="input" value={matchDateText} onChange={(e) => setMatchDateText(e.target.value)} placeholder="23:09:36 26-07-01" /></div></div>
            <div className="ak-import-mode-card"><div className="field"><label>Nostro team nello screenshot</label><select className="select" value={ourTeam} onChange={(e) => setOurTeam(e.target.value as 'blue' | 'red')}><option value="blue">Noi siamo BLU / sinistra</option><option value="red">Noi siamo ROSSI / destra</option></select></div><p className="muted">L'OCR importerà solo la squadra scelta. Puoi cambiare BLU/ROSSO anche dopo una lettura e premere di nuovo Importa risultati per ricalcolare.</p></div><div className="grid grid-2"><div className="field"><label>Clan avversario</label><input className="input" value={opponent} onChange={(e) => { setOpponent(e.target.value); setRows((current) => current.map((r) => r.teamSide === 'ENEMY' && (!r.playerClanName || r.playerClanName === 'Avversari') ? { ...r, playerClanName: e.target.value } : r)); }} placeholder="AP / clan avversario" /></div><div className="field"><label>Squadra vincente</label><select className="select" value={winningTeam} onChange={(e) => setWinningTeam(e.target.value as 'blue' | 'red' | 'draw' | '')}><option value="">Da verificare</option><option value="blue">Blu / sinistra</option><option value="red">Rosso / destra</option><option value="draw">Pareggio</option></select></div></div>
            <div className="grid grid-3"><div className="field"><label>Esito nostro team</label><select className="select" value={result} onChange={(e) => setResult(e.target.value as MatchResult)}><option>WIN</option><option>LOSE</option><option>DRAW</option></select></div><div className="field"><label>Score blu</label><input className="input" value={teamScore} onChange={(e) => setTeamScore(e.target.value)} /></div><div className="field"><label>Score rosso</label><input className="input" value={enemyScore} onChange={(e) => setEnemyScore(e.target.value)} /></div></div>
            <div className="field"><label>Note partita</label><textarea className="input" rows={4} value={matchNotes} onChange={(e) => setMatchNotes(e.target.value)} placeholder="Note scrim, correzioni OCR, contestazioni, strategia, ecc." /></div>
            <div className="notice"><strong>Manuale/ospite:</strong> se scrivi un nome che non è nel roster, l'app crea un player provvisorio e salva le sue statistiche. In futuro potrai completarlo/associarlo al profilo registrato.</div>
          </div>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Statistiche nostro team — Kill / Death / Assist</h2>
        <p className="muted">Vengono salvati solo i player del tuo clan. Dell'avversario restano solo nome clan, score ed esito partita.</p>
        <div className="team-grid ak-ally-only-table">
          {renderRowsTable('ALLY', ourTeam === 'blue' ? '🔵 Nostro team: blu / sinistra' : '🔴 Nostro team: rosso / destra', allyRows, ourTeam === 'blue' ? 'team-blue' : 'team-red')}
          <div className="ak-opponent-summary"><strong>Avversario:</strong> {opponent || 'da compilare'}<br /><span>Score avversario: {enemyScore || '-'} • Esito nostro: {result}</span><br /><small>Le statistiche dei player avversari non vengono importate né salvate.</small></div>
        </div>
        <div className="top-gap save-row">
          <button className="btn" onClick={saveMatch}>💾 Salva partita, ranking e statistiche</button>
          <a className="btn secondary" href="/matches">🗂️ Vai ad archivio partite</a>
        </div>
      </section>
    </main>
  );
}
