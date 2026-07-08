'use client';
import { useCodmAuth } from '@/lib/authRoles';
import { loadClanIdentity, clanDisplayName } from '@/lib/clanIdentity';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';


import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { findBestNicknameMatch, type ParsedScoreRow } from '@/lib/ocrParsers';
import { calculatePlayerRating } from '@/lib/statistics';
import { clampRegion, getBestCalibrationPhoneProfile, hasSavedCalibration, listCalibrationPhones, listCalibrationPhoneProfiles, listCalibrationTemplatesForPhone, loadCalibrationBundle, makeCalibrationProfileKey, saveCalibration, setActivePhoneProfile, setActiveUserContext, splitCalibrationProfileKey, type CalibratedRegion } from '@/lib/calibration';
import { ACCEPTED_OCR_BACKEND_VERSIONS, EXPECTED_OCR_BACKEND_VERSION, getOcrBackendCandidates } from '@/lib/ocrBackend';
import { FULL_IMAGE_FRAME, detectImageContentFrameFromUrl, imagePointToFrameNorm, regionToImageStyle, type ImageContentFrame } from '@/lib/imageFrame';
import { deleteEphemeralValue, getEphemeralValue, setEphemeralValue } from '@/lib/ephemeralStore';
import type { GameMode, MatchResult, MatchType, Player, TeamSide } from '@/lib/types';
import * as XLSX from 'xlsx';

const modes: GameMode[] = ['CED', 'TDM', 'PRIMA_LINEA', 'DOMINIO', 'POSTAZIONE', 'KILL_CONFIRMED', 'BR_SOLO', 'BR_DUO', 'BR_SQUAD'];
const types: MatchType[] = ['scrim', 'ranked', 'private', 'training', 'tournament', 'br'];

const codmMaps = [
  'Standoff', 'Raid', 'Firing Range', 'Summit', 'Slums', 'Hacienda', 'Takeoff', 'Meltdown',
  'Crash', 'Crossfire', 'Nuketown', 'Nuketown Russia', 'Hijacked', 'Shoot House', 'Shipment',
  'Rust', 'Terminal', 'Highrise', 'Hackney Yard', 'Tunisia', 'Coastal', 'Express', 'Dome',
  'Vacant', 'Scrapyard', 'Monastery'
];

const codmMatchTypes: Array<{ value: MatchType; label: string }> = [
  { value: 'scrim', label: '🎮 Scrim' },
  { value: 'tournament', label: '🏆 Torneo' },
  { value: 'private', label: '🔒 Private' },
  { value: 'ranked', label: '💎 Ranked' },
  { value: 'training', label: '🎯 Allenamento' },
  { value: 'br', label: '🪂 Battle Royale' }
];

const EXPECTED_BACKEND_VERSION = EXPECTED_OCR_BACKEND_VERSION;
const ACCEPTED_BACKEND_VERSIONS = ACCEPTED_OCR_BACKEND_VERSIONS;

type UiScoreRow = ParsedScoreRow & {
  playerClanName?: string | null;
  profileEmail?: string | null;
  uidCodm?: string | null;
  sourceColor?: 'blue' | 'red';
};

type ImportedMatchRow = {
  id: string;
  match_date: string;
  match_type: MatchType;
  mode: GameMode;
  map_name: string | null;
  opponent: string | null;
  result: MatchResult;
  team_score: number | null;
  enemy_score: number | null;
  screenshot_url?: string | null;
  screenshot_storage_path?: string | null;
  winning_team?: 'blue' | 'red' | 'draw' | null;
  our_team?: 'blue' | 'red' | null;
  match_notes?: string | null;
  notes?: string | null;
  created_at?: string;
};

type ExcelImportBatch = {
  id: string;
  rows: Record<string, any>[];
  label: string;
  photoFile?: string;
  photoUrl?: string;
};

type RosterPlayer = Player & {
  user_id?: string | null;
  profile_email?: string | null;
  display_name?: string | null;
  player_nickname?: string | null;
  codm_uid?: string | null;
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
  score?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  kill?: number;
  death?: number;
  assist?: number;
  k?: number;
  d?: number;
  a?: number;
  kda?: string;
  raw_kda_text?: string;
  score_raw?: string;
  kda_raw?: string;
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

type FrameNudge = { x: number; y: number; w: number; h: number };
type DragMode = 'move' | 'resize';
type DragState = { name: string; mode: DragMode; startX: number; startY: number; start: CalibratedRegion; handle?: 'se' | 'sw' | 'ne' | 'nw' } | null;
function applyFrameNudge(frame: ImageContentFrame, nudge: FrameNudge): ImageContentFrame {
  const x = Math.max(0, Math.min(0.98, frame.x + nudge.x));
  const y = Math.max(0, Math.min(0.98, frame.y + nudge.y));
  const w = Math.max(0.5, Math.min(1 - x, frame.w + nudge.w));
  const h = Math.max(0.5, Math.min(1 - y, frame.h + nudge.h));
  return { ...frame, x, y, w, h, reason: `${frame.reason}+manual_match_v59` };
}

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

function toLocalDateTimeValue(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
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




type LinkedEventRound = {
  n: number;
  matchCode?: string;
  mode: string;
  map: string;
  scoreType: string;
  target: string;
  players: string;
  reserves: string;
  lobbyOpen: string;
  startTime: string;
  bans: string;
  status?: string;
  result: string;
  ourScore: string;
  opponentScore: string;
  mvp: string;
};

type LinkedEventPlan = {
  teamAName: string;
  teamBName: string;
  teamALogo?: string;
  teamBLogo?: string;
  coverImage?: string;
  totalMatches: number;
  lobbyTime: string;
  discordLink: string;
  lobbyLink: string;
  roomNumber: string;
  rounds: LinkedEventRound[];
};

type LinkedCodmEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  event_type?: string | null;
  event_notes?: string | null;
  event_plan?: LinkedEventPlan | null;
};

const IMPORT_PLAN_MARKER = 'AK_EVENT_PLAN_V6_7::';
const IMPORT_OLD_PLAN_MARKERS = ['AK_EVENT_PLAN_V6_6::', 'AK_EVENT_PLAN_V6_5::', 'AK_EVENT_PLAN_V6_4::', 'AK_EVENT_PLAN_V6_3::', 'AK_EVENT_PLAN_V6_2::'];
const IMPORT_DRAFT_KEY = 'clan_manager_import_match_draft_v6_7';

function emptyLinkedRound(n = 1): LinkedEventRound {
  return { n, matchCode: `CM-IMPORT-${String(n).padStart(2, '0')}`, mode: 'CED', map: '', scoreType: 'Punteggio round', target: '', players: '', reserves: '', lobbyOpen: '', startTime: '', bans: '', status: 'Da giocare', result: '', ourScore: '', opponentScore: '', mvp: '' };
}
function emptyLinkedPlan(): LinkedEventPlan {
  return { teamAName: 'AK47DX', teamBName: 'Clan avversario', totalMatches: 1, lobbyTime: '', discordLink: '', lobbyLink: '', roomNumber: '', rounds: [emptyLinkedRound(1)] };
}
function sanitizeLinkedRound(raw: Partial<LinkedEventRound>, index: number): LinkedEventRound {
  const base = emptyLinkedRound(index + 1); return { ...base, ...raw, n: index + 1, matchCode: raw.matchCode || base.matchCode };
}
function readLinkedPlan(event: LinkedCodmEvent): LinkedEventPlan {
  if (event.event_plan && typeof event.event_plan === 'object') {
    const plan = event.event_plan as LinkedEventPlan;
    return { ...emptyLinkedPlan(), ...plan, rounds: (plan.rounds || [emptyLinkedRound(1)]).map(sanitizeLinkedRound) };
  }
  const note = event.event_notes || '';
  const marker = [IMPORT_PLAN_MARKER, ...IMPORT_OLD_PLAN_MARKERS].find((item) => note.includes(item));
  if (marker) {
    const idx = note.indexOf(marker);
    try {
      const parsed = JSON.parse(note.slice(idx + marker.length));
      return { ...emptyLinkedPlan(), ...parsed, rounds: (parsed.rounds || [emptyLinkedRound(1)]).map(sanitizeLinkedRound) };
    } catch {}
  }
  return emptyLinkedPlan();
}
function stripLinkedPlan(notes = '') {
  let output = notes || '';
  for (const marker of [IMPORT_PLAN_MARKER, ...IMPORT_OLD_PLAN_MARKERS]) {
    const idx = output.indexOf(marker);
    if (idx >= 0) output = output.slice(0, idx).trim();
  }
  return output.trim();
}
function linkedPlanNote(plan: LinkedEventPlan, notes = '') {
  return `${stripLinkedPlan(notes)}\n\n${IMPORT_PLAN_MARKER}${JSON.stringify(plan)}`.trim();
}
function eventModeToGameMode(value?: string | null): GameMode {
  const normalized = String(value || '').toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'CED') return 'CED';
  if (normalized === 'POSTAZIONE' || normalized === 'HARDPOINT') return 'POSTAZIONE';
  if (normalized === 'DOMINIO') return 'DOMINIO';
  if (normalized === 'PRIMA_LINEA' || normalized === 'FRONTLINE') return 'PRIMA_LINEA';
  if (normalized === 'TDM' || normalized === 'DM_DEATH_MATCH' || normalized === 'DEATH_MATCH') return 'TDM';
  if (normalized === 'KILL_CONFIRMED') return 'KILL_CONFIRMED';
  if (normalized === 'BR' || normalized === 'BR_SQUAD') return 'BR_SQUAD';
  if (modes.includes(normalized as GameMode)) return normalized as GameMode;
  return 'CED';
}
function eventTypeToMatchType(value?: string | null): MatchType {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'ranked') return 'ranked';
  if (normalized === 'torneo' || normalized === 'tournament') return 'tournament';
  if (normalized === 'allenamento' || normalized === 'training') return 'training';
  if (normalized === 'br') return 'br';
  return 'scrim';
}
function combineEventDateAndRoundTime(eventIso: string, timeValue?: string) {
  if (!timeValue) return toLocalDateTimeValue(new Date(eventIso));
  const date = new Date(eventIso);
  const [h, m] = timeValue.split(':').map((x) => Number(x));
  if (Number.isFinite(h) && Number.isFinite(m)) {
    date.setHours(h, m, 0, 0);
    return toLocalDateTimeValue(date);
  }
  return toLocalDateTimeValue(new Date(eventIso));
}
function resultFromScores(our: string, opponent: string) {
  const a = Number(String(our).replace(',', '.'));
  const b = Number(String(opponent).replace(',', '.'));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  if (a > b) return 'Vinto';
  if (a < b) return 'Perso';
  return 'Pareggiato';
}

function rankMedal(rank?: number | null) {
  if (rank === 1) return { icon: '🥇', label: 'Oro / MVP', className: 'medal-gold' };
  if (rank === 2) return { icon: '🥈', label: 'Argento', className: 'medal-silver' };
  if (rank === 3) return { icon: '🥉', label: 'Bronzo', className: 'medal-bronze' };
  if (rank === 4) return { icon: '🪵', label: 'Legno', className: 'medal-wood' };
  if (rank === 5) return { icon: '🏛️', label: 'Olimpico', className: 'medal-olympic' };
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
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
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
  const [matchDateLocal, setMatchDateLocal] = useState(toLocalDateTimeValue(new Date()));
  const [opponent, setOpponent] = useState('');
  const [matchNotes, setMatchNotes] = useState('');
  const [teamScore, setTeamScore] = useState('');
  const [enemyScore, setEnemyScore] = useState('');
  const [message, setMessage] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');
  const [backendBoxes, setBackendBoxes] = useState<BackendOcrBox[]>([]);
  const [backendRawJson, setBackendRawJson] = useState('');
  const [imageContentFrame, setImageContentFrame] = useState<ImageContentFrame>(FULL_IMAGE_FRAME);
  const [frameNudge, setFrameNudge] = useState<FrameNudge>({ x: 0, y: 0, w: 0, h: 0 });
  const [calibrationProfiles, setCalibrationProfiles] = useState<string[]>(['default']);
  const [selectedCalibrationPhone, setSelectedCalibrationPhone] = useState('default');
  const [selectedCalibrationTemplate, setSelectedCalibrationTemplate] = useState('default');
  const [calibrationPhoneOptions, setCalibrationPhoneOptions] = useState<string[]>(['default']);
  const [calibrationTemplateOptions, setCalibrationTemplateOptions] = useState<string[]>(['default']);
  const [selectedImportRegionName, setSelectedImportRegionName] = useState('BLUE_R1_KDA');
  const [useCalibrationTemplate, setUseCalibrationTemplate] = useState(true);
  const [calibrationMode, setCalibrationMode] = useState<'table_lock' | 'content_frame' | 'strict_image'>('content_frame');
  const [localTemplateRegions, setLocalTemplateRegions] = useState<CalibratedRegion[]>([]);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateSummary, setTemplateSummary] = useState('Template non ancora caricato');
  const [ourTeam, setOurTeam] = useState<'blue' | 'red'>('blue');
  const [winningTeam, setWinningTeam] = useState<'blue' | 'red' | 'draw' | ''>('');
  const [working, setWorking] = useState(false);
  const [ocrProgressPct, setOcrProgressPct] = useState(0);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const importDraftReadyRef = useRef(false);
  const activeFrame = useMemo(() => applyFrameNudge(imageContentFrame, frameNudge), [imageContentFrame, frameNudge]);
  const [linkedEvent, setLinkedEvent] = useState<LinkedCodmEvent | null>(null);
  const [linkedEventPlan, setLinkedEventPlan] = useState<LinkedEventPlan | null>(null);
  const [linkedRoundIndex, setLinkedRoundIndex] = useState<number | null>(null);
  const linkedRound = linkedEventPlan && linkedRoundIndex !== null ? linkedEventPlan.rounds[linkedRoundIndex] : null;
  const [savingMatch, setSavingMatch] = useState(false);
  const [saveCompleted, setSaveCompleted] = useState(false);
  const [savedMatchId, setSavedMatchId] = useState('');
  const [editingMatchId, setEditingMatchId] = useState('');
  const [recentMatches, setRecentMatches] = useState<ImportedMatchRow[]>([]);
  const [selectedExistingMatchId, setSelectedExistingMatchId] = useState('');
  const [loadingExistingMatch, setLoadingExistingMatch] = useState(false);
  const [manualTableText, setManualTableText] = useState('');
  const [excelBatches, setExcelBatches] = useState<ExcelImportBatch[]>([]);
  const [selectedExcelBatchId, setSelectedExcelBatchId] = useState('');
  const [excelImportSummary, setExcelImportSummary] = useState('');
  const [proofPhotoName, setProofPhotoName] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [excelModeActive, setExcelModeActive] = useState(false);

  function isImportUsefulRegion(region: { name?: string }) {
    const name = String(region.name || '').toUpperCase();
    if (!name) return false;
    if (name === 'SCOREBOARD_RESULT_LABEL' || name === 'SCOREBOARD_RESULT_FULL') return false;
    if (name === 'TEAM_BLUE_TABLE_FULL' || name === 'TEAM_RED_TABLE_FULL') return false;
    if (name.endsWith('_IMPACT')) return false;
    return true;
  }

  function filterImportRegions(regions: CalibratedRegion[] = []) {
    return regions.filter(isImportUsefulRegion);
  }

  const visibleTemplateRegions = useMemo(() => filterImportRegions(localTemplateRegions), [localTemplateRegions]);
  const visibleBackendBoxes = useMemo(() => (backendBoxes || []).filter(isImportUsefulRegion), [backendBoxes]);

  function refreshCalibrationTemplate(phoneRaw?: string, templateRaw?: string) {
    // V10.0: registro template globale. Recupera in modo robusto l'ultimo template salvato
    // da Calibrazione, invece di tornare sempre a default.
    const phoneInput = 'default';
    const bestKey = getBestCalibrationPhoneProfile('scoreboard_ced');
    const bestSplit = splitCalibrationProfileKey(bestKey);
    const templateOptionsFromDefault = listCalibrationTemplatesForPhone('scoreboard_ced', phoneInput);
    const templateOptionsFromAllProfiles = calibrationProfiles
      .concat([bestKey])
      .map((key) => splitCalibrationProfileKey(key).template || 'default')
      .filter(Boolean);
    const mergedOptions = Array.from(new Set(['default', ...templateOptionsFromDefault, ...templateOptionsFromAllProfiles])).sort((a, b) => a.localeCompare(b));
    const previousTemplate = selectedCalibrationTemplate && selectedCalibrationTemplate !== 'default' ? selectedCalibrationTemplate : '';
    const savedTemplates = mergedOptions.filter((t) => t !== 'default');
    const templateInput = templateRaw !== undefined
      ? (templateRaw || 'default')
      : (previousTemplate && mergedOptions.includes(previousTemplate)
          ? previousTemplate
          : (bestSplit.template && bestSplit.template !== 'default' && mergedOptions.includes(bestSplit.template)
              ? bestSplit.template
              : (savedTemplates[0] || 'default')));
    const key = makeCalibrationProfileKey(phoneInput, templateInput);
    setCalibrationPhoneOptions(['default']);
    setCalibrationTemplateOptions(Array.from(new Set(['default', ...mergedOptions, templateInput])).sort((a, b) => a.localeCompare(b)));
    setSelectedCalibrationPhone(phoneInput);
    setSelectedCalibrationTemplate(templateInput);
    setCalibrationProfiles(listCalibrationPhoneProfiles('scoreboard_ced'));
    setActivePhoneProfile('scoreboard_ced', key);
    const bundle = loadCalibrationBundle('scoreboard_ced', key);
    const saved = hasSavedCalibration('scoreboard_ced', key);
    const visibleRegions = filterImportRegions(bundle.regions || []);
    setLocalTemplateRegions(visibleRegions);
    if ((!selectedImportRegionName || !visibleRegions.some((r) => r.name === selectedImportRegionName)) && visibleRegions?.[0]?.name) setSelectedImportRegionName(visibleRegions[0].name);
    setTemplateSaved(saved);
    setTemplateSummary(`${templateInput || 'default'} · ${visibleRegions.length} riquadri utili · ${saved ? 'SALVATO' : 'DEFAULT'}`);
    return { phone: key, bundle: { ...bundle, regions: visibleRegions }, saved };
  }

  function saveImportTemplateRegions(nextRegions = localTemplateRegions) {
    const templateName = selectedCalibrationTemplate || 'default';
    const key = makeCalibrationProfileKey('default', templateName);
    const cleanRegions = filterImportRegions(nextRegions);
    setActivePhoneProfile('scoreboard_ced', key);
    saveCalibration('scoreboard_ced', cleanRegions, key, templateName, clanName);
    setCalibrationProfiles(listCalibrationPhoneProfiles('scoreboard_ced'));
    refreshCalibrationTemplate('default', templateName);
    setMessage(`Template risultati salvato: ${templateName}. Lo trovi ora nella lista Import.`);
  }

  function updateImportRegion(name: string, patch: Partial<CalibratedRegion>) {
    setLocalTemplateRegions((current) => {
      const next = current.map((region) => region.name === name ? clampRegion({ ...region, ...patch }) : region);
      return next;
    });
  }

  function nudgeImportRegion(name: string, dx = 0, dy = 0, dw = 0, dh = 0) {
    const region = localTemplateRegions.find((r) => r.name === name);
    if (!region) return;
    updateImportRegion(name, { x: region.x + dx, y: region.y + dy, w: region.w + dw, h: region.h + dh });
  }


  function pointerToNorm(event: PointerEvent | React.PointerEvent) {
    const rect = imageWrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    return imagePointToFrameNorm(px, py, activeFrame);
  }

  function startRegionDrag(event: React.PointerEvent, region: CalibratedRegion, mode: DragMode, handle?: 'se' | 'sw' | 'ne' | 'nw') {
    event.preventDefault();
    event.stopPropagation();
    setSelectedImportRegionName(region.name);
    const point = pointerToNorm(event);
    dragRef.current = { name: region.name, mode, startX: point.x, startY: point.y, start: region, handle };
    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', stopRegionDrag);
  }

  function onGlobalPointerMove(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerToNorm(event);
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    const r = drag.start;
    let nx = r.x;
    let ny = r.y;
    let nw = r.w;
    let nh = r.h;
    if (drag.mode === 'move') {
      nx = r.x + dx;
      ny = r.y + dy;
    } else if (drag.handle === 'se') {
      nw = r.w + dx; nh = r.h + dy;
    } else if (drag.handle === 'sw') {
      nx = r.x + dx; nw = r.w - dx; nh = r.h + dy;
    } else if (drag.handle === 'ne') {
      ny = r.y + dy; nw = r.w + dx; nh = r.h - dy;
    } else if (drag.handle === 'nw') {
      nx = r.x + dx; ny = r.y + dy; nw = r.w - dx; nh = r.h - dy;
    }
    updateImportRegion(drag.name, { x: nx, y: ny, w: nw, h: nh });
  }

  function stopRegionDrag() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onGlobalPointerMove);
    window.removeEventListener('pointerup', stopRegionDrag);
  }

  useEffect(() => {
    let restoredDraft = false;
    try {
      const rawDraft = getEphemeralValue(IMPORT_DRAFT_KEY) as string | undefined;
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as any;
        restoredDraft = true;
        if (draft.mode) setMode(draft.mode);
        if (draft.matchType) setMatchType(draft.matchType);
        if (draft.result) setResult(draft.result);
        if (draft.mapName !== undefined) setMapName(draft.mapName || '');
        if (draft.matchDateText !== undefined) setMatchDateText(draft.matchDateText || '');
        if (draft.matchDateLocal) setMatchDateLocal(draft.matchDateLocal);
        if (draft.opponent !== undefined) setOpponent(draft.opponent || '');
        if (draft.matchNotes !== undefined) setMatchNotes(draft.matchNotes || '');
        if (draft.teamScore !== undefined) setTeamScore(draft.teamScore || '');
        if (draft.enemyScore !== undefined) setEnemyScore(draft.enemyScore || '');
        if (Array.isArray(draft.rows)) setRows(draft.rows);
        if (draft.rawText !== undefined) setRawText(draft.rawText || '');
        if (draft.imageUrl) setImageUrl(draft.imageUrl);
        if (draft.ourTeam) setOurTeam(draft.ourTeam);
        if (draft.winningTeam !== undefined) setWinningTeam(draft.winningTeam || '');
        if (draft.proofPhotoName !== undefined) setProofPhotoName(draft.proofPhotoName || '');
        if (draft.proofPhotoUrl !== undefined) setProofPhotoUrl(draft.proofPhotoUrl || '');
        if (draft.excelModeActive !== undefined) setExcelModeActive(!!draft.excelModeActive);
        if (draft.linkedEvent) setLinkedEvent(draft.linkedEvent);
        if (draft.linkedEventPlan) setLinkedEventPlan(draft.linkedEventPlan);
        if (typeof draft.linkedRoundIndex === 'number') setLinkedRoundIndex(draft.linkedRoundIndex);

      }
    } catch {}
    importDraftReadyRef.current = true;
    loadRoster();
    if (!restoredDraft) loadLinkedEventFromQuery();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setActiveUserContext(user?.id || 'anonymous', String(user?.user_metadata?.display_name || user?.email || ''));
      refreshCalibrationTemplate();
    }).catch(() => refreshCalibrationTemplate());
  }, []);

  useEffect(() => {
    if (!importDraftReadyRef.current) return;
    try {
      setEphemeralValue(IMPORT_DRAFT_KEY, JSON.stringify({
        savedAt: new Date().toISOString(), mode, matchType, result, mapName, matchDateText, matchDateLocal,
        opponent, matchNotes, teamScore, enemyScore, rows, rawText, imageUrl, ourTeam, winningTeam,
        linkedEvent, linkedEventPlan, linkedRoundIndex, proofPhotoName, proofPhotoUrl, excelModeActive
      }));
    } catch {}
  }, [mode, matchType, result, mapName, matchDateText, matchDateLocal, opponent, matchNotes, teamScore, enemyScore, rows, rawText, imageUrl, ourTeam, winningTeam, linkedEvent, linkedEventPlan, linkedRoundIndex, proofPhotoName, proofPhotoUrl, excelModeActive]);


  useEffect(() => {
    const savedY = Number(sessionStorage.getItem('clan_manager_import_match_scroll_y') || 0);
    if (savedY > 0) window.requestAnimationFrame(() => window.scrollTo(0, savedY));
    const remember = () => sessionStorage.setItem('clan_manager_import_match_scroll_y', String(window.scrollY || 0));
    window.addEventListener('pagehide', remember);
    window.addEventListener('beforeunload', remember);
    return () => {
      remember();
      window.removeEventListener('pagehide', remember);
      window.removeEventListener('beforeunload', remember);
    };
  }, []);

  function normalizeExcelKey(value: string) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  }

  function normalizeExcelDate(value: unknown) {
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    return String(value || '').trim();
  }

  function cleanNumber(value: unknown) {
    return String(value ?? '').replace(/[^0-9-]/g, '');
  }

  function normalizeLookup(value: unknown) {
    return String(value || '').trim().toLowerCase();
  }

  function rosterOptionLabel(player: RosterPlayer) {
    const email = player.profile_email ? ` · ${player.profile_email}` : player.user_id ? ' · profilo collegato' : ' · non collegato';
    const uid = player.uid_codm || player.codm_uid ? ` · UID ${player.uid_codm || player.codm_uid}` : '';
    return `${player.nickname}${player.clan_name ? ` · ${player.clan_name}` : ''}${email}${uid}`;
  }

  function findRosterPlayer(nickname?: string | null, email?: string | null, uid?: string | null) {
    const cleanEmail = normalizeLookup(email);
    const cleanUid = normalizeLookup(uid);
    const cleanNick = normalizeLookup(nickname);
    if (cleanEmail) {
      const byEmail = roster.find((player) => normalizeLookup(player.profile_email) === cleanEmail);
      if (byEmail) return byEmail;
    }
    if (cleanUid) {
      const byUid = roster.find((player) => normalizeLookup(player.uid_codm || player.codm_uid) === cleanUid);
      if (byUid) return byUid;
    }
    if (cleanNick) {
      const exact = roster.find((player) => normalizeLookup(player.nickname) === cleanNick);
      if (exact) return exact;
      return roster.find((player) => normalizeLookup(player.nickname).includes(cleanNick) || cleanNick.includes(normalizeLookup(player.nickname)));
    }
    return undefined;
  }

  function linkRowWithRoster(row: UiScoreRow): UiScoreRow {
    if (row.playerId) return row;
    const matched = findRosterPlayer(row.nickname, row.profileEmail, row.uidCodm);
    if (!matched) return row;
    return {
      ...row,
      playerId: matched.id,
      nickname: matched.nickname || row.nickname,
      playerClanName: matched.clan_name || row.playerClanName || clanName,
      profileEmail: matched.profile_email || row.profileEmail || null,
      uidCodm: matched.uid_codm || matched.codm_uid || row.uidCodm || null,
      needsReview: false,
      readStatus: 'ok'
    };
  }

  function autoLinkRowsToRoster() {
    let linked = 0;
    setRows((current) => current.map((row) => {
      const next = linkRowWithRoster(row);
      if (!row.playerId && next.playerId) linked += 1;
      return next;
    }));
    setMessage(linked ? `✅ Collegati ${linked} giocatori ai profili registrati.` : 'Nessun nuovo collegamento automatico. Usa il menu Profilo reale sulla riga per assegnare manualmente.');
  }

  function firstValue(row: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }

  function applyImportedResultRows(records: Record<string, any>[], sourceLabel = 'tabella') {
    if (!records.length) return setMessage(`Nessun dato valido trovato nel ${sourceLabel}.`);
    const importedRows: UiScoreRow[] = [];
    const first = records[0] || {};
    const importedPhotoFile = String(firstValue(first, ['FOTO_FILE', 'FOTO', 'SCREENSHOT_FILE', 'SCREENSHOT_FILE_URL']) || '').trim();
    const importedPhotoUrl = String(firstValue(first, ['FOTO_URL', 'SCREENSHOT_URL', 'SCREENSHOT_FILE_URL']) || '').trim();
    const importedMatchId = String(firstValue(first, ['ID_PARTITA', 'MATCH_ID', 'CODICE_PARTITA']) || '').trim();
    setExcelModeActive(true);
    if (importedPhotoFile) setProofPhotoName(importedPhotoFile);
    if (importedPhotoUrl) { setProofPhotoUrl(importedPhotoUrl); setImageUrl(importedPhotoUrl); }

    for (const [index, row] of records.entries()) {
      const map = String(firstValue(row, ['MAPPA_CODM', 'MAPPA']) || '').trim();
      const date = normalizeExcelDate(firstValue(row, ['DATA', 'MATCH_DATE']));
      const time = String(firstValue(row, ['ORA', 'ORARIO']) || '').trim();
      const score = String(firstValue(row, ['RISULTATO', 'PUNTEGGIO']) || '').trim();
      const player = String(firstValue(row, ['GIOCATORE', 'PLAYER', 'NICKNAME']) || '').trim();
      const kill = firstValue(row, ['KILL', 'KILLS']);
      const death = firstValue(row, ['DEATH', 'DEATHS']);
      const assist = firstValue(row, ['ASSIST', 'ASSISTS']);
      const modeValue = String(firstValue(row, ['MODALITA_CODM', 'MODALITA', 'MODE']) || '').trim();
      const typeValue = String(firstValue(row, ['TIPO_PARTITA', 'MATCH_TYPE']) || '').trim();
      const ourTeamValueRaw = String(firstValue(row, ['TEAM_NOSTRO', 'NOSTRO_TEAM', 'OUR_TEAM']) || '').trim().toUpperCase();
      const ourTeamFromExcel = ourTeamValueRaw === 'ROSSO' || ourTeamValueRaw === 'RED' ? 'red' : ourTeamValueRaw === 'BLU' || ourTeamValueRaw === 'BLUE' ? 'blue' : ourTeam;
      const blueScoreRaw = firstValue(row, ['RISULTATO_BLU', 'PUNTEGGIO_BLU', 'BLUE_SCORE']);
      const redScoreRaw = firstValue(row, ['RISULTATO_ROSSO', 'PUNTEGGIO_ROSSO', 'RED_SCORE']);
      const ourScoreValue = firstValue(row, ['RISULTATO_NOSTRO', 'PUNTEGGIO_NOSTRO', 'OUR_SCORE']);
      const enemyScoreValue = firstValue(row, ['RISULTATO_AVVERSARIO', 'PUNTEGGIO_AVVERSARIO', 'ENEMY_SCORE']);
      const teamBlue = String(firstValue(row, ['TEAM_BLU', 'SQUADRA_BLU']) || '').trim();
      const teamRed = String(firstValue(row, ['TEAM_ROSSO', 'SQUADRA_ROSSO']) || '').trim();
      const opponentValue = String(firstValue(row, ['TEAM_AVVERSARIO_ROSSO', 'AVVERSARIO', 'OPPONENT']) || '').trim();
      const playerTeam = String(firstValue(row, ['TEAM_GIOCATORE', 'PLAYER_TEAM']) || '').trim().toUpperCase();
      const playerEmail = String(firstValue(row, ['GIOCATORE_EMAIL', 'PLAYER_EMAIL', 'PROFILO_EMAIL', 'EMAIL']) || '').trim();
      const playerUid = String(firstValue(row, ['UID_CODM', 'CODM_UID', 'PLAYER_UID']) || '').trim();
      const matchedPlayer = findRosterPlayer(player, playerEmail, playerUid);

      if (index === 0) {
        setOurTeam(ourTeamFromExcel);
        if (map) setMapName(map);
        if (modeValue) {
          const normalizedMode = modeValue.toUpperCase().replace(/\s+/g, '_') as GameMode;
          if (modes.includes(normalizedMode)) setMode(normalizedMode);
        }
        if (typeValue) {
          const normalizedType = typeValue.toLowerCase() as MatchType;
          if (types.includes(normalizedType)) setMatchType(normalizedType);
        }
        if (opponentValue) setOpponent(opponentValue);
        else if (ourTeamFromExcel === 'blue' && teamRed) setOpponent(teamRed);
        else if (ourTeamFromExcel === 'red' && teamBlue) setOpponent(teamBlue);
        if (date || time) {
          const normalizedDate = date.includes('-') ? date : date.split('/').reverse().join('-');
          if (normalizedDate) setMatchDateLocal(`${normalizedDate}T${(time || '21:00').slice(0, 5)}`);
        }
        const hasBlueRed = `${blueScoreRaw}` !== '' || `${redScoreRaw}` !== '';
        if (hasBlueRed) {
          const blueScore = Number(cleanNumber(blueScoreRaw) || 0);
          const redScore = Number(cleanNumber(redScoreRaw) || 0);
          setTeamScore(String(ourTeamFromExcel === 'blue' ? blueScore : redScore));
          setEnemyScore(String(ourTeamFromExcel === 'blue' ? redScore : blueScore));
          setWinningTeam(blueScore === redScore ? 'draw' : blueScore > redScore ? 'blue' : 'red');
        } else if (`${ourScoreValue}` !== '' || `${enemyScoreValue}` !== '') {
          setTeamScore(cleanNumber(ourScoreValue || '0'));
          setEnemyScore(cleanNumber(enemyScoreValue || '0'));
        } else {
          const m = String(score || '').match(/(\d+)\s*[-:]\s*(\d+)/);
          if (m) { setTeamScore(m[1]); setEnemyScore(m[2]); }
        }
        const photoNote = [
          importedMatchId ? `Excel ID_PARTITA=${importedMatchId}` : '',
          importedPhotoFile ? `Foto file=${importedPhotoFile}` : '',
          importedPhotoUrl ? `Foto URL=${importedPhotoUrl}` : ''
        ].filter(Boolean).join(' · ');
        if (photoNote) setMatchNotes((current) => current.includes(photoNote) ? current : `${current ? `${current}\n` : ''}${photoNote}`);
      }
      if (!player) continue;
      if (playerTeam && playerTeam.includes('AVVERS')) continue;
      importedRows.push({
        ...emptyRow('ALLY', importedRows.length + 1, clanName),
        nickname: matchedPlayer?.nickname || player || `Player ${importedRows.length + 1}`,
        playerId: matchedPlayer?.id || null,
        ocrNickname: player,
        kills: Number(cleanNumber(kill) || 0),
        deaths: Number(cleanNumber(death) || 0),
        assists: Number(cleanNumber(assist) || 0),
        mvp: ['SI', 'SÌ', 'YES', 'TRUE', '1', 'MVP'].includes(String(firstValue(row, ['MVP']) || '').toUpperCase()),
        readStatus: matchedPlayer ? 'ok' : 'manual',
        needsReview: !matchedPlayer,
        playerClanName: matchedPlayer?.clan_name || clanName,
        profileEmail: matchedPlayer?.profile_email || playerEmail || null,
        uidCodm: matchedPlayer?.uid_codm || matchedPlayer?.codm_uid || playerUid || null,
      });
    }
    if (!importedRows.length) return setMessage(`Dati ${sourceLabel} non validi: serve almeno una riga con GIOCATORE, KILL, DEATH, ASSIST del nostro team.`);
    setRows(importedRows);
    setSaveCompleted(false);
    setMessage(`Import ${sourceLabel} completato: ${importedRows.length} giocatori caricati. ${importedPhotoFile ? `Foto collegata: ${importedPhotoFile}. ` : ''}Controlla risultato, allega foto se vuoi e premi Salva partita.`);
  }

  function applyManualTableImport() {
    const lines = manualTableText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return setMessage('Incolla almeno una riga tabella. Formato: mappa; data; ora; risultato; giocatore; kill; death; assist');
    const records = lines.map((line) => {
      const parts = line.split(/[;\t,]/).map((part) => part.trim());
      const [map, date, time, score, player, kill, death, assist] = parts;
      return { MAPPA_CODM: map, DATA: date, ORA: time, RISULTATO: score, GIOCATORE: player, KILL: kill, DEATH: death, ASSIST: assist };
    });
    applyImportedResultRows(records, 'tabella manuale');
  }

  function applyExcelBatch(batchId: string) {
    const batch = excelBatches.find((item) => item.id === batchId);
    if (!batch) return;
    setSelectedExcelBatchId(batchId);
    applyImportedResultRows(batch.rows, `Excel ${batch.id}`);
  }

  async function applyExcelResultsImport(file?: File | null) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames.includes('IMPORT_PARTITE') ? 'IMPORT_PARTITE' : workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
      const normalizedRows = rawRows
        .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeExcelKey(key), value])))
        .filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''));
      if (!normalizedRows.length) return setMessage('Excel vuoto. Usa il template ufficiale CLAN MANAGER.');
      const byId = new Map<string, Record<string, any>[]>();
      normalizedRows.forEach((row, idx) => {
        const id = String(firstValue(row, ['ID_PARTITA', 'MATCH_ID', 'CODICE_PARTITA']) || `PARTITA_${idx + 1}`).trim() || `PARTITA_${idx + 1}`;
        const list = byId.get(id) || [];
        list.push(row);
        byId.set(id, list);
      });
      const batches: ExcelImportBatch[] = Array.from(byId.entries()).map(([id, rows]) => {
        const first = rows[0] || {};
        const label = `${id} · ${first.MAPPA_CODM || first.MAPPA || '-'} · ${first.DATA || '-'} ${first.ORA || ''} · ${rows.length} player`;
        return { id, rows, label, photoFile: String(first.FOTO_FILE || ''), photoUrl: String(first.FOTO_URL || '') };
      });
      setExcelModeActive(true);
      setExcelBatches(batches);
      setExcelImportSummary(`${batches.length} partite trovate nel file ${file.name}. Seleziona quale caricare, oppure carico automaticamente la prima.`);
      applyImportedResultRows(batches[0].rows, `Excel ${batches[0].id}`);
      setSelectedExcelBatchId(batches[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? `Excel non letto: ${error.message}` : 'Excel non letto. Usa il template ufficiale CLAN MANAGER.');
    }
  }

  useEffect(() => {
    setResult(computeOurResult(winningTeam, ourTeam));
  }, [winningTeam, ourTeam]);

  useEffect(() => {
    const our = Number(String(teamScore).replace(',', '.'));
    const enemy = Number(String(enemyScore).replace(',', '.'));
    if (!Number.isFinite(our) || !Number.isFinite(enemy)) return;
    if (our === enemy) setWinningTeam('draw');
    else setWinningTeam(our > enemy ? ourTeam : (ourTeam === 'blue' ? 'red' : 'blue'));
  }, [teamScore, enemyScore, ourTeam]);

  useEffect(() => {
    if (saveCompleted) setSaveCompleted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, matchType, result, mapName, matchDateLocal, opponent, matchNotes, teamScore, enemyScore, ourTeam, winningTeam, rows]);

  async function loadRoster() {
    const identity = await loadClanIdentity();
    if (identity.clanId) {
      setClanId(identity.clanId);
      setClanName(clanDisplayName(identity));
      await loadRecentMatches(identity.clanId);
    }
    const { data } = await supabase.from('players').select('*').order('nickname');
    const players = (data || []) as RosterPlayer[];
    const userIds = Array.from(new Set(players.map((player) => player.user_id).filter(Boolean))) as string[];
    let profileByUser = new Map<string, any>();
    if (userIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,email,display_name,player_nickname,codm_uid').in('id', userIds);
      profileByUser = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
    }
    setRoster(players.map((player) => {
      const profile = player.user_id ? profileByUser.get(player.user_id) : null;
      return {
        ...player,
        profile_email: profile?.email || null,
        display_name: profile?.display_name || null,
        player_nickname: profile?.player_nickname || null,
        codm_uid: player.uid_codm || profile?.codm_uid || null
      };
    }));
  }

  async function loadRecentMatches(activeClanId = clanId) {
    if (!activeClanId) return;
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('clan_id', activeClanId)
      .order('match_date', { ascending: false })
      .limit(20);
    if (!error) setRecentMatches((data || []) as ImportedMatchRow[]);
  }

  async function loadExistingMatchForEdit(matchId: string) {
    if (!matchId) return;
    setLoadingExistingMatch(true);
    setMessage('Carico partita registrata per modifica...');
    try {
      const { data: match, error: matchError } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (matchError || !match) throw new Error(matchError?.message || 'Partita non trovata.');
      const { data: statRows } = await supabase
        .from('match_player_stats')
        .select('*, players(id,nickname,clan_name)')
        .eq('match_id', matchId)
        .order('rank_position', { ascending: true });
      setEditingMatchId(match.id);
      setSavedMatchId(match.id);
      setSaveCompleted(false);
      setSelectedExistingMatchId(match.id);
      setMode((match.mode || 'CED') as GameMode);
      setMatchType((match.match_type || 'scrim') as MatchType);
      setResult((match.result || 'WIN') as MatchResult);
      setMapName(match.map_name || '');
      setOpponent(match.opponent || '');
      setTeamScore(match.team_score === null || match.team_score === undefined ? '' : String(match.team_score));
      setEnemyScore(match.enemy_score === null || match.enemy_score === undefined ? '' : String(match.enemy_score));
      setWinningTeam((match.winning_team || '') as 'blue' | 'red' | 'draw' | '');
      setOurTeam((match.our_team || 'blue') as 'blue' | 'red');
      setMatchNotes(match.match_notes || '');
      setProofPhotoUrl(match.screenshot_url || '');
      setProofPhotoName(match.screenshot_storage_path || '');
      if (match.screenshot_url) setImageUrl(match.screenshot_url);
      if (match.match_date) setMatchDateLocal(toLocalDateTimeValue(new Date(match.match_date)));
      const mappedRows: UiScoreRow[] = (statRows || []).map((row: any, index: number) => ({
        rankPosition: row.rank_position || index + 1,
        nickname: row.players?.nickname || `Nostro ${row.rank_position || index + 1}`,
        playerId: row.player_id || null,
        ocrNickname: row.players?.nickname || null,
        needsReview: false,
        readStatus: 'manual',
        kills: row.kills || 0,
        deaths: row.deaths || 0,
        assists: row.assists || 0,
        score: row.score || 0,
        impact: null,
        captures: row.captures || 0,
        objectiveTimeText: row.objective_time_text || '',
        objectiveTimeSeconds: row.objective_time_seconds || 0,
        teamSide: 'ALLY',
        sourceColor: (match.our_team || 'blue') as 'blue' | 'red',
        mvp: !!row.is_mvp,
        mvpLabel: row.is_mvp ? 'MVP_WIN' : null,
        playerClanName: row.players?.clan_name || clanName
      }));
      setRows(mappedRows.length ? mappedRows : [1, 2, 3, 4, 5].map((rank) => emptyRow('ALLY', rank, clanName)));
      setMessage(`Partita caricata in modifica: ${new Date(match.match_date || match.created_at || Date.now()).toLocaleString('it-IT')} · ${match.map_name || '-'} · ${match.team_score ?? '-'}:${match.enemy_score ?? '-'}. Quando premi Salva aggiorna la partita esistente, non crea doppioni.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore caricamento partita registrata.');
    } finally {
      setLoadingExistingMatch(false);
    }
  }

  async function readSessionToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData.session?.access_token;
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token;
    }
    if (!token) throw new Error('Login richiesto: fai logout/login e riprova.');
    return token;
  }


  async function loadLinkedEventFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      const matchId = params.get('match');
      if (matchId) {
        await loadExistingMatchForEdit(matchId);
        return;
      }
      const eventId = params.get('event');
      const roundParam = Number(params.get('round') || '1');
      const matchCodeParam = params.get('matchCode') || '';
      if (!eventId) return;
      const token = await readSessionToken();
      const response = await fetch(`/api/events/detail?id=${encodeURIComponent(eventId)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' }
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok || !json.event) {
        setMessage(`Import da eventi non caricato: ${json?.error || 'evento non trovato'}`);
        return;
      }
      const event = json.event as LinkedCodmEvent;
      const plan = readLinkedPlan(event);
      const index = Math.max(0, Math.min((Number.isFinite(roundParam) ? roundParam : 1) - 1, Math.max(0, plan.rounds.length - 1)));
      const round = plan.rounds[index] || emptyLinkedRound(index + 1);
      setLinkedEvent(event);
      setLinkedEventPlan(plan);
      setLinkedRoundIndex(index);
      setMode(eventModeToGameMode(round.mode));
      setMatchType(eventTypeToMatchType(event.event_type));
      setMapName(round.map || '');
      setOpponent(plan.teamBName || 'Clan avversario');
      setTeamScore(round.ourScore || '');
      setEnemyScore(round.opponentScore || '');
      setMatchDateLocal(combineEventDateAndRoundTime(event.starts_at, round.startTime));
      setMatchNotes((current) => current || `Import risultato da evento: ${event.title} · Partita ${round.n}`);
      if (round.ourScore && round.opponentScore) {
        const our = Number(round.ourScore);
        const enemy = Number(round.opponentScore);
        if (Number.isFinite(our) && Number.isFinite(enemy)) setWinningTeam(our === enemy ? 'draw' : our > enemy ? ourTeam : (ourTeam === 'blue' ? 'red' : 'blue'));
      }
      setMessage(`Stai importando la Partita ${round.n} dall'evento: ${event.title}. Codice ${round.matchCode || matchCodeParam || '-'}. Modalità già selezionata: ${modeLabel(eventModeToGameMode(round.mode))}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore apertura import da evento.');
    }
  }

  function onFileSelected(selected: File | null) {
    setFile(selected);
    setRows(selected ? defaultScoreRows(opponent) : []);
    setRawText('');
    setBackendBoxes([]);
    setBackendRawJson('');
    setOcrProgress('');
    setFrameNudge({ x: 0, y: 0, w: 0, h: 0 });
    setMessage('');
    refreshCalibrationTemplate();
    if (!selected) {
      setImageContentFrame(FULL_IMAGE_FRAME);
      return setImageUrl('');
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setImageUrl(dataUrl);
      detectImageContentFrameFromUrl(dataUrl).then(setImageContentFrame).catch(() => setImageContentFrame(FULL_IMAGE_FRAME));
    };
    reader.readAsDataURL(selected);
  }


  function firstNumeric(...values: unknown[]) {
    const nums: number[] = [];
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(n)) nums.push(n);
    }
    const nonZero = nums.find((n) => n !== 0);
    return nonZero ?? nums[0] ?? 0;
  }

  function parseKdaFallback(row: BackendOcrRow) {
    const joined = [row.kda, row.raw_kda_text, row.kda_raw].filter(Boolean).join(' ');
    const cleaned = joined.replace(/\\/g, '/').replace(/\|/g, '/').replace(/[Il]/g, '1').replace(/[Oo]/g, '0');
    const slash = cleaned.match(/(\d{1,3})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})/);
    if (slash) return { kills: Number(slash[1]), deaths: Number(slash[2]), assists: Number(slash[3]) };
    const nums = cleaned.match(/\d{1,3}/g)?.map(Number) || [];
    if (nums.length >= 3) return { kills: nums[0], deaths: nums[1], assists: nums[2] };
    return null;
  }

  function normalizeBackendRow(row: BackendOcrRow) {
    const parsedKda = parseKdaFallback(row);
    const kills = firstNumeric(row.kills, row.kill, row.k, parsedKda?.kills);
    const deaths = firstNumeric(row.deaths, row.death, row.d, parsedKda?.deaths);
    const assists = firstNumeric(row.assists, row.assist, row.a, parsedKda?.assists);
    return {
      score: firstNumeric(row.score, row.score_raw),
      kills,
      deaths,
      assists,
      hasKda: kills > 0 || deaths > 0 || assists > 0
    };
  }

  function applyBackendRows(parsed: BackendOcrResult) {
    const activeOurTeam = parsed.our_team || ourTeam;
    const ourRows = (activeOurTeam === 'red' ? parsed.teams?.red : parsed.teams?.blue) || [];

    const mappedRows = ourRows.map((row) => {
      const color = activeOurTeam;
      const rawNick = row.nickname_ocr?.trim() || `Nostro ${row.rank}`;
      const best = rawNick && !isPlaceholderNickname(rawNick) ? findBestNicknameMatch(rawNick, roster) : undefined;
      const rowConfidence = row.confidence || 0;
      const numeric = normalizeBackendRow(row);
      return {
        rankPosition: row.rank,
        nickname: best?.nickname || rawNick,
        playerId: best?.id || null,
        ocrNickname: rawNick,
        needsReview: !rawNick || isPlaceholderNickname(rawNick) || rowConfidence < 0.62 || !best || !numeric.hasKda,
        readStatus: rowConfidence >= 0.80 ? 'ok' : rowConfidence >= 0.48 ? 'partial' : 'manual',
        kills: numeric.kills,
        deaths: numeric.deaths,
        assists: numeric.assists,
        score: numeric.score,
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
    setMessage("Import pronto: template salvato ricaricato, screenshot e tabella manuale disponibili.");
    try {
      const candidates = backendCandidates();
      if (!candidates.length) {
        throw new Error('NEXT_PUBLIC_OCR_BACKEND_URL non configurato. Su Vercel serve URL HTTPS Render, esempio https://ak47dx-ocr-backend.onrender.com');
      }
      const backendUrl = candidates[0];
      let backendVersion = 'direct-fastlane';
      setOcrProgressPct(12);
      setOcrProgress(`V5.4 FastLane: salto controllo /health bloccante e provo import diretto su ${backendUrl}`);
      // Health solo informativa, timeout corto: non deve mai bloccare import.
      try {
        const healthResponse = await fetchWithTimeout(`${backendUrl}/health`, { cache: 'no-store' }, 8000);
        if (healthResponse.ok) {
          const health = await healthResponse.json() as { version?: string };
          backendVersion = health.version || backendVersion;
          setOcrProgressPct(18);
          setOcrProgress(`Backend OCR risponde (${backendVersion}). Avvio import FastLane...`);
        } else {
          setOcrProgressPct(18);
          setOcrProgress(`Health HTTP ${healthResponse.status}. Avvio comunque import FastLane diretto...`);
        }
      } catch {
        setOcrProgressPct(18);
        setOcrProgress('Health Render lento/cold start. Avvio comunque import FastLane diretto...');
      }

      const formData = new FormData();
      formData.append('file', file);
      if (useCalibrationTemplate) {
        const activeTemplate = refreshCalibrationTemplate(selectedCalibrationPhone, selectedCalibrationTemplate);
        if (!activeTemplate.saved) {
          setMessage(`ATTENZIONE: stai usando il template DEFAULT non salvato (${activeTemplate.phone}). Apri /calibration, salva il template corretto e poi torna qui. Importo comunque per revisione manuale.`);
        }
        formData.append('calibration_template', JSON.stringify({ ...activeTemplate.bundle, regions: filterImportRegions(activeTemplate.bundle.regions || []) }));
        formData.append('calibration_frame', JSON.stringify(activeFrame));
        formData.append('calibration_mode', 'content_frame');
        formData.append('template_source', activeTemplate.saved ? `saved_canonical_template_v5_4:${activeTemplate.bundle.meta?.phoneProfile || activeTemplate.phone}` : 'default_template_not_saved');
      }
      formData.append('our_team', ourTeam);
      formData.append('extract_scope', 'v5_4_fastlane');
      formData.append('import_profile', 'v5_4_fastlane_no_block_score_kda');

      const parsed = await postFormDataWithProgress(`${backendUrl}/ocr/scoreboard/ced`, formData, 180000, (percent, label) => {
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
      if (parsed.match_datetime) {
        setMatchDateText(parsed.match_datetime);
        const parsedDate = parseBackendMatchDate(parsed.match_datetime);
        if (parsedDate) setMatchDateLocal(toLocalDateTimeValue(new Date(parsedDate)));
      }
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
      setMessage(error instanceof Error ? (error.name === 'AbortError' ? 'OCR fermato per timeout dopo 180 secondi anche in V5.4 FastLane. A questo punto Render free non sta completando Tesseract: usa backend locale per import o passa Render a piano always-on.' : error.message) : 'Errore Backend OCR Pro.');
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
        return { ...row, playerId: String(value) || null, nickname: selected?.nickname || row.nickname, playerClanName: selected?.clan_name || row.playerClanName, profileEmail: selected?.profile_email || row.profileEmail || null, uidCodm: selected?.uid_codm || selected?.codm_uid || row.uidCodm || null, needsReview: !selected ? row.needsReview : false, readStatus: selected ? 'ok' : row.readStatus };
      }
      return { ...row, [key]: value === '' ? 0 : Number(value), needsReview: false };
    }));
  }

  function addEmptyRow(side: TeamSide) {
    const existing = rows.filter((r) => (r.teamSide || 'ALLY') === side).length;
    setRows((current) => [...current, emptyRow(side, existing + 1, side === 'ALLY' ? clanName : (opponent || 'Avversari'))]);
  }

  async function uploadScreenshot(activeClanId: string) {
    if (file) {
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
    if (proofPhotoUrl) return { url: proofPhotoUrl, path: proofPhotoName || null };
    return null;
  }

  function onProofFileSelected(selected: File | null) {
    setFile(selected);
    if (!selected) {
      setProofPhotoName('');
      return;
    }
    setProofPhotoName(selected.name);
    setProofPhotoUrl('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setImageUrl(dataUrl);
      detectImageContentFrameFromUrl(dataUrl).then(setImageContentFrame).catch(() => setImageContentFrame(FULL_IMAGE_FRAME));
    };
    reader.readAsDataURL(selected);
    setMessage('Foto prova collegata alla bozza. Premi Salva/Aggiorna partita per caricarla su Supabase.');
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

  async function updateLinkedEventAfterSave(matchId: string, screenshotUrl: string | null) {
    if (!linkedEvent || !linkedEventPlan || linkedRoundIndex === null) return;
    const mvpRow = rows.find((row) => (row.teamSide || 'ALLY') !== 'ENEMY' && row.mvp) || rows.find((row) => (row.teamSide || 'ALLY') !== 'ENEMY' && row.rankPosition === 1);
    const updatedRounds = linkedEventPlan.rounds.map((round, index) => index === linkedRoundIndex ? {
      ...round,
      mode: round.mode || mode,
      map: mapName || round.map,
      status: 'Risultato caricato',
      result: resultFromScores(teamScore, enemyScore),
      ourScore: teamScore,
      opponentScore: enemyScore,
      mvp: mvpRow?.nickname || round.mvp,
      matchCode: round.matchCode || `CM-${String(index + 1).padStart(2, '0')}`,
    } : round);
    const updatedPlan = { ...linkedEventPlan, teamBName: opponent || linkedEventPlan.teamBName, rounds: updatedRounds, totalMatches: updatedRounds.length };
    const baseNotes = `${stripLinkedPlan(linkedEvent.event_notes || '')}\n\nRisultato importato da /import/match: evento=${linkedEvent.title}; partita=${(linkedRoundIndex || 0) + 1}; codice=${linkedEventPlan.rounds[linkedRoundIndex || 0]?.matchCode || '-'}; match_id=${matchId}; screenshot=${screenshotUrl || '-'}`.trim();
    const token = await readSessionToken();
    const response = await fetch('/api/events/update-result', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' },
      body: JSON.stringify({ id: linkedEvent.id, event_plan: updatedPlan, event_notes: linkedPlanNote(updatedPlan, baseNotes) })
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) throw new Error(json?.error || 'Aggiornamento evento collegato non confermato dal database.');
    setLinkedEventPlan(updatedPlan);
    if (json.event) setLinkedEvent(json.event as LinkedCodmEvent);
  }

  async function saveMatch() {
    if (savingMatch) return;
    if (saveCompleted) {
      setMessage('Questa partita è già stata salvata. Per modificarla premi "Modifica ancora" oppure scegli una partita registrata dalla lista.');
      return;
    }
    setSavingMatch(true);
    setMessage(editingMatchId ? 'Aggiornamento partita in corso...' : 'Salvataggio partita in corso...');
    try {
      const activeClanId = clanId;
      if (!activeClanId) {
        setMessage('Prima crea un clan in Onboarding.');
        return;
      }
      const effectiveResult = computeOurResult(winningTeam, ourTeam);
      const screenshotProof = await uploadScreenshot(activeClanId);
      const screenshotUrl = screenshotProof?.url || null;
      const screenshotPath = screenshotProof?.path || null;
      const matchPayload: Record<string, unknown> = {
        clan_id: activeClanId,
        mode,
        match_type: matchType,
        result: effectiveResult,
        map_name: mapName || null,
        opponent: opponent || null,
        team_score: teamScore ? Number(teamScore) : null,
        enemy_score: enemyScore ? Number(enemyScore) : null,
        winning_team: winningTeam || null,
        our_team: ourTeam,
        match_notes: matchNotes || null,
        match_date: matchDateLocal ? new Date(matchDateLocal).toISOString() : (parseBackendMatchDate(matchDateText) || new Date().toISOString()),
        notes: `${matchNotes ? `${matchNotes}\n\n` : ''}${editingMatchId ? 'Aggiornamento' : 'Import'} risultati CLAN MANAGER. Screenshot prova=${screenshotPath || screenshotUrl || proofPhotoName || 'non caricato'}. Template=${useCalibrationTemplate ? `default/${selectedCalibrationTemplate}/${calibrationMode}/frame=${activeFrame.reason}` : 'OFF'}. OurTeam=${ourTeam}. WinningTeam=${winningTeam || '-'}. MatchDateText=${matchDateText || '-'}; MatchDateLocal=${matchDateLocal || '-'}.`
      };
      if (screenshotUrl) matchPayload.screenshot_url = screenshotUrl;
      if (screenshotPath) matchPayload.screenshot_storage_path = screenshotPath;

      let match: { id: string } | null = null;
      if (editingMatchId) {
        const { data: updated, error: updateError } = await supabase
          .from('matches')
          .update(matchPayload)
          .eq('id', editingMatchId)
          .eq('clan_id', activeClanId)
          .select('id')
          .single();
        if (updateError || !updated) throw new Error(updateError?.message || 'Partita non aggiornata.');
        match = updated as { id: string };
        await supabase.from('match_player_stats').delete().eq('match_id', match.id);
        await supabase.from('match_scoreboard_rows').delete().eq('match_id', match.id);
      } else {
        const { data: created, error: matchError } = await supabase.from('matches').insert(matchPayload).select('id').single();
        if (matchError || !created) throw new Error(matchError?.message || 'Partita non creata.');
        match = created as { id: string };
      }

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
            score: row.score || 0,
            impact: null,
            mvp_type: mvpType,
            rank_medal: row.rankPosition === 1 ? 'gold' : row.rankPosition === 2 ? 'silver' : row.rankPosition === 3 ? 'bronze' : row.rankPosition === 4 ? 'wood' : row.rankPosition === 5 ? 'olympic' : null,
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
            score: row.score || 0,
            objective_score: 0,
            captures: row.captures || 0,
            impact: null,
            objective_time_seconds: null,
            objective_time_text: null,
            accuracy_percent: null,
            headshot_percent: null,
            kd_ratio: row.deaths ? Number((row.kills / row.deaths).toFixed(2)) : row.kills,
            raw_kda_text: `score=${row.score || 0}; kda=${row.kills}/${row.deaths}/${row.assists}`,
            team_side: row.teamSide || 'ALLY',
            rank_position: row.rankPosition || null,
            is_mvp: isMvp,
            rating: calculatePlayerRating({
              kills: row.kills,
              deaths: row.deaths,
              assists: row.assists,
              objectiveScore: row.score || 0,
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
          parser_status: editingMatchId ? 'updated' : 'confirmed'
        });
      }

      await updateLinkedEventAfterSave(match.id, screenshotUrl);
      await loadRoster();
      await loadRecentMatches(activeClanId);
      try { deleteEphemeralValue(IMPORT_DRAFT_KEY); } catch {}
      setEditingMatchId(match.id);
      setSavedMatchId(match.id);
      setSelectedExistingMatchId(match.id);
      setSaveCompleted(true);
      setMessage(`✅ ${editingMatchId ? 'Partita aggiornata' : 'Partita salvata'} correttamente. ${linkedEvent ? `Aggiornato anche evento ${linkedEvent.title} · Partita ${(linkedRoundIndex || 0) + 1}. ` : ''}Il pulsante resta bloccato per evitare doppi salvataggi. Statistiche: ${savedStats.join(', ') || 'nessuna riga'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore salvataggio partita.');
    } finally {
      setSavingMatch(false);
    }
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
                <th>#</th><th>Medaglia</th><th>Profilo reale / email</th><th>Nome giocatore</th><th>Clan appartenenza</th><th>🗡️ Kill</th><th>💀 Death</th><th>🤝 Assist</th><th>🏆 MVP</th><th>Stato</th>
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
                      {roster.map((player) => <option key={player.id} value={player.id}>{rosterOptionLabel(player)}</option>)}
                    </select>
                    {row.profileEmail && <small className="profile-linked-note">{row.profileEmail}</small>}
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
        <div className="ak-mobile-score-cards">
          {indexedRows.map(({ row, index }) => (
            <div className={`ak-score-card ${row.needsReview ? 'needs-review' : ''}`} key={`mobile-${side}-${index}`}>
              <div className="ak-score-card-head">
                <strong>#{row.rankPosition || index + 1} · {row.nickname || 'Nome giocatore'}</strong>
                <span className={row.needsReview ? 'badge warn' : 'badge ok'}>{row.needsReview ? 'Controlla' : (row.readStatus || 'ok')}</span>
              </div>
              <label>Profilo reale / email<select className="select" value={row.playerId || ''} onChange={(e) => updateRow(index, 'playerId', e.target.value)}><option value="">Manuale / non registrato</option>{roster.map((player) => <option key={player.id} value={player.id}>{rosterOptionLabel(player)}</option>)}</select></label>
              {row.profileEmail && <div className="profile-linked-note">Profilo collegato: {row.profileEmail}</div>}<label>Nome giocatore<input className="input" value={row.nickname} onChange={(e) => updateRow(index, 'nickname', e.target.value)} /></label>
              <label>Clan<input className="input" value={row.playerClanName || ''} onChange={(e) => updateRow(index, 'playerClanName', e.target.value)} /></label>
              <div className="ak-score-grid">
                <label>Kill<input className="input" value={row.kills} onChange={(e) => updateRow(index, 'kills', e.target.value)} /></label>
                <label>Death<input className="input" value={row.deaths} onChange={(e) => updateRow(index, 'deaths', e.target.value)} /></label>
                <label>Assist<input className="input" value={row.assists} onChange={(e) => updateRow(index, 'assists', e.target.value)} /></label>
              </div>
              <label className="check-line"><input type="checkbox" checked={!!row.mvp || row.rankPosition === 1} onChange={(e) => updateRow(index, 'mvp', e.target.checked)} /> MVP / Top player</label>
            </div>
          ))}
          {!indexedRows.length && <div className="notice">Nessuna riga. Aggiungi player manualmente.</div>}
        </div>
      </div>
    );
  }

  return (
    <main className="container wide">
      <section className="card import-hero">
        <div className="import-hero-copy">
          <p className="eyebrow">⚡ Import risultati semplificato</p>
          <h1>Import partita CODM</h1>
          <p className="muted">Carica Excel già compilato e allega la foto prova, oppure usa ancora OCR da screenshot quando serve. I player possono essere collegati al profilo reale registrato.</p>
          <div className="import-hero-pills">
            <span className="pill-chip">📊 Excel senza OCR</span>
            <span className="pill-chip">📸 Foto prova anche dopo</span>
            <span className="pill-chip">🔗 Profili reali</span>
          </div>
        </div>
        <div className="import-actions import-actions-pro import-actions-simple import-template-toolbar-pro">
          <label className="btn secondary">🖼️ Foto OCR opzionale<input type="file" accept="image/*" hidden onChange={(e) => onFileSelected(e.target.files?.[0] || null)} /></label>
          <label className="template-toggle-line"><input type="checkbox" checked={useCalibrationTemplate} onChange={(e) => setUseCalibrationTemplate(e.target.checked)} /> Usa template</label>
          <select className="select pro-select" value={selectedCalibrationTemplate} onFocus={() => refreshCalibrationTemplate('default', selectedCalibrationTemplate)} onChange={(e) => refreshCalibrationTemplate('default', e.target.value)} disabled={!useCalibrationTemplate} title="Template OCR attivo">
            {calibrationTemplateOptions.map((p) => <option key={p} value={p}>{p === 'default' ? '🧩 Default base' : `🧩 ${p}`}</option>)}
          </select>
          <button className="btn secondary" type="button" onClick={() => refreshCalibrationTemplate()}>🔄 Ricarica template</button>
          <a className="btn secondary" href="/calibration">🎯 Calibrazione</a>
          <button className="btn import-main-btn" onClick={runBackendOcr} disabled={working || !file}>{working ? '⏳ Lettura in corso...' : '🚀 Importa risultati'}</button>
        </div>
      </section>

      {linkedEvent && linkedRound && (
        <section className="card top-gap import-linked-event-banner">
          <p className="eyebrow">📥 Import da Eventi</p>
          <h2>Stai importando la Partita {linkedRound.n} da: {linkedEvent.title}</h2><span className="match-code-pill">ID {linkedRound.matchCode || '-'}</span>
          <div className="linked-event-grid">
            <span>Modalità già selezionata: <b>{modeLabel(mode)}</b></span>
            <span>Mappa evento: <b>{mapName || 'da leggere/importare'}</b></span>
            <span>Avversario: <b>{opponent || 'da compilare'}</b></span>
            <span>Orario partita: <b>{linkedRound.startTime || '-'}</b></span>
          </div>
          <p className="muted">Quando salvi la partita, l'evento viene aggiornato automaticamente con score, esito e MVP.</p>
        </section>
      )}

      <section className="grid import-match-geometry-grid top-gap">
        <div className="card import-image-card">
          <h2>Screenshot prova</h2>
          {imageUrl ? (
            <div className="cal-image-wrap ocr-image-wrap import-ocr-same-frame" ref={imageWrapRef}>
              <img className="ocr-overlay-image" src={imageUrl} alt="Scoreboard" draggable={false} />
              {useCalibrationTemplate && !!visibleTemplateRegions.length && (
                <div className="ocr-template-layer editable" aria-label="Template salvato applicato localmente">
                  {visibleTemplateRegions.map((region) => (
                    <div
                      key={`tpl-${region.name}`}
                      className={`ocr-template-box cal-rect ${selectedImportRegionName === region.name ? 'active' : ''} ${region.name.startsWith('BLUE') || region.name.includes('BLUE') ? 'ocr-template-blue' : region.name.startsWith('RED') || region.name.includes('RED') ? 'ocr-template-red' : 'ocr-template-neutral'} ${(ourTeam === 'blue' && region.name.startsWith('BLUE')) || (ourTeam === 'red' && region.name.startsWith('RED')) ? 'ocr-template-own' : ''}`}
                      title={`TRASCINA/ALLARGA: ${region.label || region.name}`}
                      style={regionToImageStyle(region, activeFrame)}
                      onPointerDown={(e) => startRegionDrag(e, region, 'move')}
                      onClick={() => setSelectedImportRegionName(region.name)}
                    >
                      <span>{region.label || region.name}</span>
                      {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => <i key={handle} className={`cal-handle ${handle}`} onPointerDown={(e) => startRegionDrag(e, region, 'resize', handle)} />)}
                    </div>
                  ))}
                </div>
              )}
              {!!visibleBackendBoxes.length && <div className="ocr-overlay-layer">{visibleBackendBoxes.map((box, index) => <div key={`${box.name}-${index}`} className={`ocr-box ${box.team === 'blue' ? 'ocr-box-blue' : box.team === 'red' ? 'ocr-box-red' : 'ocr-box-neutral'}`} title={`BACKEND LETTO: ${box.name} | ${box.role}`} style={{ left: `${box.x_norm * 100}%`, top: `${box.y_norm * 100}%`, width: `${box.w_norm * 100}%`, height: `${box.h_norm * 100}%` }} />)}</div>}
            </div>
          ) : <div className="empty-state">🖼️ Carica lo screenshot della partita.</div>}
          {(working || ocrProgress) && (
            <div className="ak-progress-panel">
              <div className="ak-progress-row"><span>{working ? 'Lavorazione OCR in corso' : 'Stato OCR'}</span><span>{ocrProgressPct}%</span></div>
              <div className="ak-progress-track"><div className="ak-progress-fill" style={{ width: `${ocrProgressPct}%` }} /></div>
              <div className="ak-progress-note">{ocrProgress}</div>
            </div>
          )}
          <div className={`ak-template-status ${templateSaved ? 'ok' : 'warn'}`}>
            <strong>Template:</strong> 🧩 {selectedCalibrationTemplate || 'default'} · {templateSaved ? 'salvato' : 'base'}
          </div>
          <details className="top-gap">
            <summary>🎯 Centratura manuale immagine risultati</summary>
            <div className="cal-buttons top-gap">
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, y: v.y - 0.005 }))}>↑ Su</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, y: v.y + 0.005 }))}>↓ Giù</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, x: v.x - 0.005 }))}>← Sinistra</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, x: v.x + 0.005 }))}>→ Destra</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, w: v.w + 0.01, h: v.h + 0.01 }))}>Allarga</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, w: v.w - 0.01, h: v.h - 0.01 }))}>Stringi</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge({ x: 0, y: 0, w: 0, h: 0 })}>Reset</button>
              <a className="btn small secondary" href="/calibration">Modifica riquadri</a>
            </div>
            <small className="muted">Questa correzione sposta il frame inviato al backend senza cambiare il template salvato.</small>
          </details>
          <details className="top-gap" open>
            <summary>🧩 Regola riquadri direttamente sull'immagine</summary>
            <div className="notice top-gap">Clicca un riquadro nello screenshot, trascinalo con mouse/dito e ridimensionalo dagli angoli. Non devi più scegliere dalla lista e usare i tasti freccia.</div>
            <div className="grid grid-2 top-gap">
              <div className="field"><label>Riquadro selezionato</label><select className="select" value={selectedImportRegionName} onChange={(e) => setSelectedImportRegionName(e.target.value)}>{visibleTemplateRegions.map((r) => <option key={r.name} value={r.name}>{r.label || r.name}</option>)}</select></div>
              <div className="field"><label>Salvataggio</label><button className="btn small" type="button" onClick={() => saveImportTemplateRegions()}>💾 Salva template</button><small className="muted">Le modifiche vengono rilette anche dalla pagina Calibrazione.</small></div>
            </div>
            <div className="pwa-cal-nudge-panel top-gap"><b>Comandi touch PWA</b><div className="cal-buttons top-gap"><button className="btn small secondary" type="button" onClick={() => nudgeImportRegion(selectedImportRegionName, 0, -0.003)}>↑</button><button className="btn small secondary" type="button" onClick={() => nudgeImportRegion(selectedImportRegionName, -0.003, 0)}>←</button><button className="btn small secondary" type="button" onClick={() => nudgeImportRegion(selectedImportRegionName, 0.003, 0)}>→</button><button className="btn small secondary" type="button" onClick={() => nudgeImportRegion(selectedImportRegionName, 0, 0.003)}>↓</button><button className="btn small secondary" type="button" onClick={() => nudgeImportRegion(selectedImportRegionName, 0, 0, 0.004, 0.004)}>Allarga</button><button className="btn small secondary" type="button" onClick={() => nudgeImportRegion(selectedImportRegionName, 0, 0, -0.004, -0.004)}>Riduci</button></div><small className="muted">Su telefono usa questi tasti se l'angolo del riquadro è difficile da prendere.</small></div>
          </details>
          {message && <div className="notice top-gap">{message}</div>}
          <details className="top-gap">
            <summary>⚙️ Impostazioni avanzate OCR</summary>
            <div className="grid grid-2 top-gap">
              <div className="field"><label>Usa calibrazione</label><select className="select" value={useCalibrationTemplate ? 'yes' : 'no'} onChange={(e) => setUseCalibrationTemplate(e.target.value === 'yes')}><option value="yes">Sì, usa template salvato</option><option value="no">No, layout automatico</option></select></div>
              <div className="field"><label>Template OCR</label><select className="select" value={selectedCalibrationTemplate} onChange={(e) => refreshCalibrationTemplate('default', e.target.value)} disabled={!useCalibrationTemplate}>{calibrationTemplateOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select><small className="muted">Default o template salvato da Calibrazione.</small></div>
              <div className="field"><label>Modo template</label><select className="select" value={calibrationMode} onChange={(e) => setCalibrationMode(e.target.value as 'table_lock' | 'content_frame' | 'strict_image')} disabled={!useCalibrationTemplate}><option value="content_frame">Content frame consigliato</option><option value="table_lock">Table-lock fallback</option><option value="strict_image">Coordinate immagine esatta</option></select><small className="muted">V4.6 invia anche il frame calcolato dal frontend: {activeFrame.reason} ({Math.round(activeFrame.x * 100)}%, {Math.round(activeFrame.y * 100)}%, {Math.round(activeFrame.w * 100)}% x {Math.round(activeFrame.h * 100)}%).</small></div>
              <div className="field"><label>Conferma nostro team</label><select className="select" value={ourTeam} onChange={(e) => setOurTeam(e.target.value as 'blue' | 'red')}><option value="blue">Blu / sinistra</option><option value="red">Rosso / destra</option></select></div>
            </div>
            <div className="top-gap"><a className="btn small secondary" href="/calibration">🎯 Apri calibrazione</a></div>
          </details>
          {rawText && <details><summary>Debug OCR grezzo</summary><div className="raw-box">{rawText}</div></details>}
          {backendRawJson && <details><summary>JSON Backend OCR</summary><div className="raw-box">{backendRawJson}</div></details>}
        </div>

        <div className="card">
          <h2>Dati partita</h2>
          <details className="top-gap import-table-entry" open>
            <summary>📋 Importa risultato da Excel o tabella</summary>
            <div className="import-excel-panel">
              <p className="muted">Usa il template Excel ufficiale per caricare risultato partita e K/D/A con numeri precisi. Lo screenshot resta disponibile per prova visiva.</p>
              <div className="cal-buttons">
                <a className="btn small secondary" href="/templates/TEMPLATE_IMPORT_RISULTATI_CODM_CLAN_MANAGER_V12_1_FOTO_PROFILI.xlsx" download>⬇️ Scarica template Excel foto + profili</a>
                <label className="btn small">📥 Carica Excel<input type="file" accept=".xlsx,.xls" hidden onChange={(e) => applyExcelResultsImport(e.target.files?.[0] || null)} /></label>
              </div>
              {excelImportSummary && <div className="notice top-gap">{excelImportSummary}</div>}
              {excelBatches.length > 1 && (
                <div className="field top-gap">
                  <label>Partita trovata nel file Excel</label>
                  <select className="select" value={selectedExcelBatchId} onChange={(e) => applyExcelBatch(e.target.value)}>
                    {excelBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}</option>)}
                  </select>
                  <small className="muted">Una riga = un player. Stesso ID_PARTITA = stessa partita. Puoi allegare ora lo screenshot oppure aggiungerlo dopo.</small>
                </div>
              )}
              <div className="proof-photo-card top-gap">
                <div className="proof-photo-head"><strong>📸 Foto prova risultato</strong><span className="badge ok">opzionale ora · obbligatoria se vuoi prova</span></div>
                <p className="muted">Con Excel non serve OCR. Qui alleghi la foto prova vicino alla tabella, oppure la aggiungi dopo caricando la partita registrata e premendo Aggiorna.</p>
                <div className="grid grid-2">
                  <label className="btn small">📎 Allegare foto prova<input type="file" accept="image/*" hidden onChange={(e) => onProofFileSelected(e.target.files?.[0] || null)} /></label>
                  <input className="input" value={proofPhotoUrl} onChange={(e) => { setProofPhotoUrl(e.target.value); if (e.target.value) setImageUrl(e.target.value); }} placeholder="Oppure incolla URL foto già caricata" />
                </div>
                {(proofPhotoName || proofPhotoUrl) && <div className="notice top-gap">Foto collegata alla bozza: <b>{proofPhotoName || proofPhotoUrl}</b>. Verrà salvata/aggiornata su Supabase quando premi Salva partita.</div>}
              </div>
            </div>
            <p className="muted top-gap">Alternativa rapida: mappa; data; ora; risultato; giocatore; kill; death; assist.</p>
            <textarea className="textarea" rows={5} value={manualTableText} onChange={(e) => setManualTableText(e.target.value)} placeholder="Standoff; 2026-07-08; 21:00; 6-0; MIRZA; 18; 7; 4" />
            <button className="btn small top-gap" type="button" onClick={applyManualTableImport}>Carica dati tabella</button>
          </details>
          <div className="form">
            <div className="grid grid-2">
              <div className="field"><label>Tipo partita CODM</label><select className="select" value={matchType} onChange={(e) => setMatchType(e.target.value as MatchType)}>{codmMatchTypes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
              <div className="field"><label>Modalità CODM</label><select className="select" value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>{modes.map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}</select></div>
            </div>
            <div className="grid grid-2">
              <div className="field"><label>Mappa CODM</label><select className="select" value={codmMaps.includes(mapName) ? mapName : (mapName ? 'CUSTOM' : '')} onChange={(e) => { if (e.target.value === 'CUSTOM') setMapName(''); else setMapName(e.target.value); }}><option value="">Seleziona mappa</option>{codmMaps.map((m) => <option key={m} value={m}>{m}</option>)}<option value="CUSTOM">Altro / manuale</option></select>{(!mapName || !codmMaps.includes(mapName)) && <input className="input top-gap" value={mapName} onChange={(e) => setMapName(e.target.value)} placeholder="Scrivi mappa manuale" />}</div>
              <div className="field"><label>Data/ora partita</label><input className="input" type="datetime-local" value={matchDateLocal} onChange={(e) => setMatchDateLocal(e.target.value)} /><small className="muted">Testo OCR: {matchDateText || 'non letto'} </small></div>
            </div>
            <div className="card subtle-card import-edit-existing-card"><h3>Modifica partita già registrata</h3><div className="grid grid-2"><div className="field"><label>Partite salvate</label><select className="select" value={selectedExistingMatchId} onChange={(e) => setSelectedExistingMatchId(e.target.value)}><option value="">Seleziona partita salvata</option>{recentMatches.map((m) => <option key={m.id} value={m.id}>{m.screenshot_url ? '📸 ' : ''}{new Date(m.match_date || m.created_at || Date.now()).toLocaleString('it-IT')} · {m.map_name || '-'} · {m.opponent || '-'} · {m.team_score ?? '-'}:{m.enemy_score ?? '-'}</option>)}</select></div><div className="field"><label>Azione</label><button className="btn secondary" type="button" disabled={!selectedExistingMatchId || loadingExistingMatch} onClick={() => loadExistingMatchForEdit(selectedExistingMatchId)}>{loadingExistingMatch ? 'Carico...' : '✏️ Carica per modifica'}</button></div></div><small className="muted">Quando carichi una partita, Salva aggiorna quella esistente e non crea doppioni.</small></div>
            <div className="ak-import-mode-card"><div className="field"><label>Nostro team nello screenshot</label><select className="select" value={ourTeam} onChange={(e) => setOurTeam(e.target.value as 'blue' | 'red')}><option value="blue">Noi siamo BLU / sinistra</option><option value="red">Noi siamo ROSSI / destra</option></select></div><p className="muted">L'OCR importerà solo la squadra scelta. Puoi cambiare BLU/ROSSO anche dopo una lettura e premere di nuovo Importa risultati per ricalcolare.</p></div><div className="grid grid-2"><div className="field"><label>Clan avversario</label><input className="input" value={opponent} onChange={(e) => { setOpponent(e.target.value); setRows((current) => current.map((r) => r.teamSide === 'ENEMY' && (!r.playerClanName || r.playerClanName === 'Avversari') ? { ...r, playerClanName: e.target.value } : r)); }} placeholder="AP / clan avversario" /></div><div className="field"><label>Squadra vincente</label><select className="select" value={winningTeam} onChange={(e) => setWinningTeam(e.target.value as 'blue' | 'red' | 'draw' | '')}><option value="">Da verificare</option><option value="blue">Blu / sinistra</option><option value="red">Rosso / destra</option><option value="draw">Pareggio</option></select></div></div>
            <div className="grid grid-3 import-result-score-grid"><div className="field"><label>{ourTeam === 'blue' ? 'Risultato BLU / nostro team' : 'Risultato ROSSO / nostro team'}</label><input className="input score-input" inputMode="numeric" value={teamScore} onChange={(e) => setTeamScore(e.target.value.replace(/[^0-9]/g, ''))} placeholder="6" /></div><div className="field"><label>{ourTeam === 'blue' ? 'Risultato ROSSO / avversario' : 'Risultato BLU / avversario'}</label><input className="input score-input" inputMode="numeric" value={enemyScore} onChange={(e) => setEnemyScore(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div><div className="field"><label>Esito nostro team</label><select className="select" value={result} onChange={(e) => setResult(e.target.value as MatchResult)}><option>WIN</option><option>LOSE</option><option>DRAW</option></select><small className="muted">Se inserisci 6 e 0 l'esito si aggiorna automaticamente.</small></div></div>
            <div className="field"><label>Note partita</label><textarea className="input" rows={4} value={matchNotes} onChange={(e) => setMatchNotes(e.target.value)} placeholder="Note scrim, correzioni OCR, contestazioni, strategia, ecc." /></div>
          </div>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Statistiche nostro team — Kill / Death / Assist</h2>
        <p className="muted">Vengono salvati solo i player del tuo clan. Importiamo nickname e K/D/A dei player del tuo clan. Il risultato partita alto resta manuale/modificabile qui sotto; l'avversario resta solo come clan, risultato ed esito.</p><div className="profile-link-toolbar"><button className="btn small secondary" type="button" onClick={autoLinkRowsToRoster}>🔗 Abbina automaticamente ai profili registrati</button><span className="muted">Puoi anche assegnare manualmente ogni riga al profilo reale con email dal menu “Profilo reale”.</span></div>
        <div className="team-grid ak-ally-only-table ak-full-width-import-table">
          {renderRowsTable('ALLY', ourTeam === 'blue' ? '🔵 Nostro team: blu / sinistra' : '🔴 Nostro team: rosso / destra', allyRows, ourTeam === 'blue' ? 'team-blue' : 'team-red')}
          <div className="ak-opponent-summary"><strong>Avversario:</strong> {opponent || 'da compilare'}<br /><span>Esito nostro: {result}</span><br /><small>Le statistiche dei player avversari non vengono importate né salvate.</small></div>
        </div>
        <div className="top-gap save-row import-save-sticky-fix">
          <button className="btn" onClick={saveMatch} disabled={savingMatch || saveCompleted}>{savingMatch ? '⏳ Salvataggio...' : saveCompleted ? '✅ Salvato' : editingMatchId ? '💾 Aggiorna partita registrata' : '💾 Salva partita, ranking e statistiche'}</button>
          {saveCompleted && <button className="btn secondary" type="button" onClick={() => setSaveCompleted(false)}>✏️ Modifica ancora</button>}
          {savedMatchId && <button className="btn secondary" type="button" onClick={() => loadExistingMatchForEdit(savedMatchId)}>🔄 Ricarica partita salvata</button>}
          <a className="btn secondary" href="/matches">🗂️ Vai ad archivio partite</a>
        </div>
      </section>
    </main>
  );
}
