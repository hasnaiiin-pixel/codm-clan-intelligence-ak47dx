'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { parseCodmProfileText, type ParsedProfileStats } from '@/lib/ocrParsers';
import { recognizeCodmImage } from '@/lib/codmOcrEngine';
import {
  clampRegion,
  getActivePhoneProfile,
  getBestCalibrationPhoneProfile,
  listCalibrationPhoneProfiles,
  listCalibrationTemplatesForPhone,
  makeCalibrationProfileKey,
  splitCalibrationProfileKey,
  loadCalibrationBundle,
  saveCalibration,
  setActivePhoneProfile,
  type CalibratedRegion,
} from '@/lib/calibration';
import { getOcrBackendCandidates } from '@/lib/ocrBackend';
import {
  detectImageContentFrameFromUrl,
  frameToStyle,
  imagePointToFrameNorm,
  regionToImageStyle,
  type ImageContentFrame,
  FULL_IMAGE_FRAME,
} from '@/lib/imageFrame';
import type { Player, ProfileImportType } from '@/lib/types';

const importTypes: Array<{ value: ProfileImportType; label: string; hint: string }> = [
  { value: 'profile_base', label: 'Profilo base CODM', hint: 'Nickname, UID, livello, like e rank.' },
  { value: 'multiplayer', label: 'Statistiche Multigiocatore', hint: 'MVP, partite, top 3, uccisioni, U/M e precisione.' },
  { value: 'battle_royale', label: 'Statistiche Battle Royale', hint: 'MVP, vittorie, partite, uccisioni, danni medi e precisione.' },
  { value: 'zombie', label: 'Statistiche Zombi', hint: 'MVP, partite, zombi ultimate, compagni salvati, ondate.' },
  { value: 'dmz', label: 'Statistiche DMZ: Recon', hint: 'Partite, estrazioni, patrimonio, uccisioni, contratti.' },
];

type BackendProfileBox = { name: string; role: string; x_norm: number; y_norm: number; w_norm: number; h_norm: number; confidence?: number };
type BackendProfileResult = {
  engine_version?: string;
  nickname?: string;
  uid?: string;
  level?: number | null;
  likes?: number | null;
  rank_text?: string;
  legendary_mp?: number | null;
  legendary_br?: number | null;
  legendary_dmz?: number | null;
  legendary_zombie?: number | null;
  layout_confidence?: number;
  ocr_confidence?: number;
  needs_manual_review?: boolean;
  boxes?: BackendProfileBox[];
  warnings?: string[];
  diagnostics?: Record<string, unknown>;
  raw_text?: string;
};

type FrameNudge = { x: number; y: number; w: number; h: number };
type DragMode = 'move' | 'resize';
type DragState = { name: string; mode: DragMode; startX: number; startY: number; start: CalibratedRegion; handle?: 'se' | 'sw' | 'ne' | 'nw' } | null;

function slug(value: string) {
  return (value || 'default').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'default';
}
function joinPhoneTemplate(phone: string, template: string) {
  const p = slug(phone);
  const t = slug(template);
  return t === 'default' ? p : `${p}__${t}`;
}
function splitPhoneTemplate(value: string) {
  const safe = slug(value || 'default');
  const parts = safe.split('__');
  return { phone: parts[0] || 'default', template: parts.slice(1).join('__') || 'default' };
}
function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
function numText(value?: number | null) {
  return value === null || value === undefined ? '' : String(value);
}
function toInt(value: string) {
  const parsed = Number(String(value).replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
function toNum(value: string) {
  const parsed = Number(String(value).replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
function adjustFrame(frame: ImageContentFrame, nudge: FrameNudge): ImageContentFrame {
  const x = Math.max(0, Math.min(0.98, frame.x + nudge.x));
  const y = Math.max(0, Math.min(0.98, frame.y + nudge.y));
  const w = Math.max(0.5, Math.min(1 - x, frame.w + nudge.w));
  const h = Math.max(0.5, Math.min(1 - y, frame.h + nudge.h));
  return { ...frame, x, y, w, h, reason: `${frame.reason}+manual_profile_v59` };
}
function hasUsefulProfile(result: BackendProfileResult) {
  return Boolean(
    result.nickname || result.uid || result.level || result.likes ||
    result.legendary_mp || result.legendary_br || result.legendary_dmz || result.legendary_zombie,
  );
}
function candidates() {
  return getOcrBackendCandidates();
}

export default function ImportProfilePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [backendRawJson, setBackendRawJson] = useState('');
  const [backendBoxes, setBackendBoxes] = useState<BackendProfileBox[]>([]);
  const [importType, setImportType] = useState<ProfileImportType>('profile_base');
  const [playerId, setPlayerId] = useState('');
  const [nickname, setNickname] = useState('');
  const [uid, setUid] = useState('');
  const [level, setLevel] = useState('');
  const [rankMp, setRankMp] = useState('');
  const [rankBr, setRankBr] = useState('');
  const [rankCurrent, setRankCurrent] = useState('');
  const [rankBest, setRankBest] = useState('');
  const [mvp, setMvp] = useState('');
  const [matches, setMatches] = useState('');
  const [wins, setWins] = useState('');
  const [top3, setTop3] = useState('');
  const [kills, setKills] = useState('');
  const [kd, setKd] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [avgDamage, setAvgDamage] = useState('');
  const [zombieUltimate, setZombieUltimate] = useState('');
  const [teammatesSaved, setTeammatesSaved] = useState('');
  const [wavesSolo, setWavesSolo] = useState('');
  const [extractionRate, setExtractionRate] = useState('');
  const [profitLoss, setProfitLoss] = useState('');
  const [totalWealth, setTotalWealth] = useState('');
  const [contracts, setContracts] = useState('');
  const [legendaryMp, setLegendaryMp] = useState('');
  const [legendaryBr, setLegendaryBr] = useState('');
  const [legendaryDmz, setLegendaryDmz] = useState('');
  const [legendaryZombie, setLegendaryZombie] = useState('');
  const [message, setMessage] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');
  const [ocrProgressPct, setOcrProgressPct] = useState(0);
  const [working, setWorking] = useState(false);
  const [useCalibrationTemplate, setUseCalibrationTemplate] = useState(true);
  const [calibrationPhones, setCalibrationPhones] = useState<string[]>(['default']);
  const [calibrationTemplates, setCalibrationTemplates] = useState<string[]>(['default']);
  const [phone, setPhone] = useState('default');
  const [template, setTemplate] = useState('default');
  const [templateRegions, setTemplateRegions] = useState<CalibratedRegion[]>([]);
  const [selectedProfileRegionName, setSelectedProfileRegionName] = useState('PROFILE_LEGENDARY_MG_COUNT');
  const [templateSummary, setTemplateSummary] = useState('Template non caricato');
  const [imageFrame, setImageFrame] = useState<ImageContentFrame>(FULL_IMAGE_FRAME);
  const [frameNudge, setFrameNudge] = useState<FrameNudge>({ x: 0, y: 0, w: 0, h: 0 });

  const activeKey = useMemo(() => joinPhoneTemplate(phone, template), [phone, template]);
  const activeFrame = useMemo(() => adjustFrame(imageFrame, frameNudge), [imageFrame, frameNudge]);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);

  function refreshTemplateLists(nextPhone?: string, nextTemplate?: string) {
    const profiles = listCalibrationPhoneProfiles('profile_base');
    const bestKey = getBestCalibrationPhoneProfile('profile_base');
    const bestSplit = splitCalibrationProfileKey(bestKey);
    const fromDefault = listCalibrationTemplatesForPhone('profile_base', 'default');
    const fromProfiles = profiles.map((key) => splitCalibrationProfileKey(key).template || 'default');
    const options = uniqueSorted(['default', ...fromDefault, ...fromProfiles]);
    const previous = template && template !== 'default' ? template : '';
    const chosenTemplate = nextTemplate !== undefined
      ? (nextTemplate || 'default')
      : (previous && options.includes(previous)
          ? previous
          : (bestSplit.template && bestSplit.template !== 'default' && options.includes(bestSplit.template)
              ? bestSplit.template
              : (options.find((t) => t !== 'default') || 'default')));
    const key = makeCalibrationProfileKey('default', chosenTemplate);
    setCalibrationPhones(['default']);
    setCalibrationTemplates(uniqueSorted(['default', ...options, chosenTemplate]));
    setPhone('default');
    setTemplate(chosenTemplate);
    setActivePhoneProfile('profile_base', key);
    const bundle = loadCalibrationBundle('profile_base', key);
    setTemplateRegions(bundle.regions || []);
    if (!selectedProfileRegionName && bundle.regions?.[0]?.name) setSelectedProfileRegionName(bundle.regions[0].name);
    setTemplateSummary(`${chosenTemplate || 'default'} · ${bundle.regions?.length || 0} riquadri · ${chosenTemplate === 'default' ? 'base' : 'salvato'}`);
    return { key, bundle };
  }

  function updateProfileRegion(name: string, patch: Partial<CalibratedRegion>) {
    setTemplateRegions((current) => current.map((region) => region.name === name ? clampRegion({ ...region, ...patch }) : region));
  }

  function nudgeProfileRegion(name: string, dx = 0, dy = 0, dw = 0, dh = 0) {
    const region = templateRegions.find((r) => r.name === name);
    if (!region) return;
    updateProfileRegion(name, { x: region.x + dx, y: region.y + dy, w: region.w + dw, h: region.h + dh });
  }


  function pointerToNorm(event: PointerEvent | React.PointerEvent) {
    const rect = imageWrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    return imagePointToFrameNorm(px, py, activeFrame);
  }

  function startProfileRegionDrag(event: React.PointerEvent, region: CalibratedRegion, mode: DragMode, handle?: 'se' | 'sw' | 'ne' | 'nw') {
    event.preventDefault();
    event.stopPropagation();
    setSelectedProfileRegionName(region.name);
    const point = pointerToNorm(event);
    dragRef.current = { name: region.name, mode, startX: point.x, startY: point.y, start: region, handle };
    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', stopProfileRegionDrag);
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
    updateProfileRegion(drag.name, { x: nx, y: ny, w: nw, h: nh });
  }

  function stopProfileRegionDrag() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onGlobalPointerMove);
    window.removeEventListener('pointerup', stopProfileRegionDrag);
  }

  function saveProfileTemplateFromImport() {
    const cleanTemplate = String(template || 'Profilo salvato').trim() || 'Profilo salvato';
    const key = makeCalibrationProfileKey('default', cleanTemplate);
    saveCalibration('profile_base', templateRegions, key, cleanTemplate, 'import-profile');
    refreshTemplateLists('default', cleanTemplate);
    setMessage(`Template profilo salvato: ${cleanTemplate}. Lo trovi subito nel menu Import profilo e Calibrazione.`);
  }

  async function runBrowserProfileFallback() {
    if (!file) return false;
    setOcrProgressPct(90);
    setOcrProgress('Backend profilo lento: provo fallback OCR locale nel browser senza resettare immagine...');
    try {
      const result = await recognizeCodmImage(file, 'profile', (progress) => {
        const base = progress.total ? progress.current || 1 : 1;
        const total = progress.total || 1;
        const localPct = 90 + Math.min(9, Math.round(((base - 1 + (progress.progress || 0)) / total) * 9));
        setOcrProgressPct(localPct);
        setOcrProgress(`Fallback profilo browser: ${progress.variantName || progress.stage}`);
      }, templateRegions);
      setRawText(result.rawText);
      const parsed = parseCodmProfileText(result.rawText, importType);
      applyParsed(parsed);
      setMessage('Profilo: backend lento o lettura debole. Ho applicato fallback OCR locale; controlla i campi e salva manualmente.');
      return true;
    } catch (fallbackError) {
      setMessage(`Profilo non letto dal backend e fallback browser fallito: ${fallbackError instanceof Error ? fallbackError.message : 'errore sconosciuto'}. L’immagine resta caricata: puoi correggere i campi o regolare i riquadri.`);
      return false;
    }
  }

  useEffect(() => {
    loadPlayers();
    const active = splitCalibrationProfileKey(getActivePhoneProfile('profile_base'));
    setPhone('default');
    setTemplate(active.template || 'default');
    setTimeout(() => refreshTemplateLists('default', active.template || undefined), 0);
  }, []);

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('nickname');
    setPlayers((data || []) as Player[]);
  }

  async function onFileSelected(selected: File | null) {
    setFile(selected);
    setRawText('');
    setBackendRawJson('');
    setBackendBoxes([]);
    setOcrProgress('');
    setOcrProgressPct(0);
    setMessage('');
    setFrameNudge({ x: 0, y: 0, w: 0, h: 0 });
    if (!selected) {
      setImageUrl('');
      setImageFrame(FULL_IMAGE_FRAME);
      return;
    }
    const url = URL.createObjectURL(selected);
    setImageUrl(url);
    const detected = await detectImageContentFrameFromUrl(url);
    setImageFrame(detected);
    refreshTemplateLists(phone, template);
  }

  function applyParsed(parsed: ParsedProfileStats) {
    if (parsed.nickname) setNickname(parsed.nickname);
    if (parsed.uid) setUid(parsed.uid);
    setLevel(numText(parsed.level) || level);
    if (parsed.rankMp) setRankMp(parsed.rankMp);
    if (parsed.rankBr) setRankBr(parsed.rankBr);
    if (parsed.rankCurrent) setRankCurrent(parsed.rankCurrent);
    if (parsed.rankBest) setRankBest(parsed.rankBest);
    setMvp(numText(parsed.mvp) || mvp);
    setMatches(numText(parsed.matches) || matches);
    setWins(numText(parsed.wins) || wins);
    setTop3(numText(parsed.top3) || top3);
    setKills(numText(parsed.kills) || kills);
    setKd(numText(parsed.kd) || kd);
    setAccuracy(numText(parsed.accuracy) || accuracy);
    setAvgDamage(numText(parsed.avgDamage) || avgDamage);
    setZombieUltimate(numText(parsed.zombieUltimateDefeated) || zombieUltimate);
    setTeammatesSaved(numText(parsed.teammatesSaved) || teammatesSaved);
    setWavesSolo(numText(parsed.wavesClearedSolo) || wavesSolo);
    setExtractionRate(numText(parsed.extractionRate) || extractionRate);
    setProfitLoss(numText(parsed.profitLossRatio) || profitLoss);
    setTotalWealth(numText(parsed.totalWealth) || totalWealth);
    setContracts(numText(parsed.contractsCompleted) || contracts);
  }

  function applyBackend(parsed: BackendProfileResult) {
    if (parsed.nickname) setNickname(parsed.nickname);
    if (parsed.uid) setUid(parsed.uid);
    if (parsed.level !== null && parsed.level !== undefined) setLevel(String(parsed.level));
    if (parsed.likes !== null && parsed.likes !== undefined) setMvp(String(parsed.likes));
    if (parsed.rank_text) {
      setRankCurrent(parsed.rank_text);
      setRankMp(parsed.rank_text);
    }
    if (parsed.legendary_mp !== null && parsed.legendary_mp !== undefined) setLegendaryMp(String(parsed.legendary_mp));
    if (parsed.legendary_br !== null && parsed.legendary_br !== undefined) setLegendaryBr(String(parsed.legendary_br));
    if (parsed.legendary_dmz !== null && parsed.legendary_dmz !== undefined) setLegendaryDmz(String(parsed.legendary_dmz));
    if (parsed.legendary_zombie !== null && parsed.legendary_zombie !== undefined) setLegendaryZombie(String(parsed.legendary_zombie));
    if (parsed.raw_text) applyParsed(parseCodmProfileText(parsed.raw_text, importType));
  }

  function postProfile(formData: FormData, backendUrl: string): Promise<BackendProfileResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${backendUrl}/ocr/profile`);
      xhr.responseType = 'text';
      xhr.timeout = 45000;
      let fakePct = 45;
      let timer: number | null = null;
      const startFake = () => {
        if (timer !== null) return;
        timer = window.setInterval(() => {
          fakePct = Math.min(82, fakePct + 5);
          setOcrProgressPct(fakePct);
          setOcrProgress('Profilo in lettura OCR rapida. Se supera 45s passo al fallback browser senza resettare immagine.');
        }, 2500);
      };
      const clearFake = () => { if (timer !== null) window.clearInterval(timer); timer = null; };
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          setOcrProgressPct(10 + Math.round((event.loaded / event.total) * 30));
          setOcrProgress('Caricamento screenshot profilo verso OCR Render...');
        }
      };
      xhr.upload.onload = () => { setOcrProgressPct(45); setOcrProgress('Upload completato. Lettura profilo in corso...'); startFake(); };
      xhr.onload = () => {
        clearFake();
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText || '{}') as BackendProfileResult); }
          catch (error) { reject(new Error(`JSON profilo non valido: ${error instanceof Error ? error.message : 'errore parse'}`)); }
          return;
        }
        reject(new Error(`Backend profilo HTTP ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
      };
      xhr.onerror = () => { clearFake(); reject(new Error('Errore rete verso backend profilo.')); };
      xhr.ontimeout = () => { clearFake(); reject(new Error('Timeout profilo dopo 45 secondi. Avvio fallback browser senza resettare immagine.')); };
      setOcrProgressPct(5);
      setOcrProgress('Preparazione import profilo...');
      xhr.send(formData);
    });
  }

  async function importProfile() {
    if (!file) return setMessage('Seleziona prima uno screenshot profilo/statistiche CODM.');
    const backendUrl = candidates()[0];
    if (!backendUrl) return setMessage('NEXT_PUBLIC_OCR_BACKEND_URL non configurato. Serve link Render HTTPS.');
    setWorking(true);
    setBackendRawJson('');
    setBackendBoxes([]);
    setRawText('');
    setMessage('Import profilo V6.2: un solo tasto, OCR rapido con timeout 45s e fallback browser automatico, immagine sempre mantenuta.');
    try {
      const selected = refreshTemplateLists(phone, template);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('import_type', importType);
      formData.append('calibration_frame', JSON.stringify(activeFrame));
      formData.append('manual_frame_nudge', JSON.stringify(frameNudge));
      formData.append('template_phone', phone);
      formData.append('template_slot', template);
      if (useCalibrationTemplate) formData.append('calibration_template', JSON.stringify(selected.bundle));
      const parsed = await postProfile(formData, backendUrl.replace(/\/$/, ''));
      setOcrProgressPct(93);
      setOcrProgress('Risposta profilo ricevuta. Applico campi letti...');
      setBackendRawJson(JSON.stringify(parsed, null, 2));
      setBackendBoxes(parsed.boxes || []);
      setRawText(parsed.raw_text || JSON.stringify(parsed, null, 2));
      applyBackend(parsed);
      if (!hasUsefulProfile(parsed)) {
        await runBrowserProfileFallback();
      }
      const warnings = parsed.warnings?.length ? ` Warning: ${parsed.warnings.join(' | ')}` : '';
      setOcrProgressPct(100);
      setOcrProgress('Profilo completato. Controlla campi prima di salvare.');
      setMessage(`OCR profilo V6.2 completato. Layout=${Math.round((parsed.layout_confidence || 0) * 100)}%, OCR=${Math.round((parsed.ocr_confidence || 0) * 100)}%. Template=${phone}/${template}. ${hasUsefulProfile(parsed) ? 'Campi applicati.' : 'Nessun numero sicuro letto: correggi manualmente o regola i riquadri.'}${warnings}`);
    } catch (error) {
      const fallbackOk = await runBrowserProfileFallback();
      setOcrProgressPct(100);
      setOcrProgress(fallbackOk ? 'Fallback profilo completato. Controlla campi.' : 'Import profilo fermato.');
      if (!fallbackOk) setMessage(error instanceof Error ? error.message : 'Errore OCR profilo.');
    } finally {
      setWorking(false);
    }
  }

  async function uploadScreenshot(clanId: string) {
    if (!file) return null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${clanId}/profiles/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('codm-screenshots').upload(path, file, { upsert: false });
    if (error) {
      setMessage(`Errore upload screenshot: ${error.message}`);
      return null;
    }
    return supabase.storage.from('codm-screenshots').getPublicUrl(path).data.publicUrl;
  }

  async function saveProfileSnapshot() {
    setMessage('');
    const { data: clansData } = await supabase.from('clans').select('*').limit(1);
    const clanId = ((clansData || []) as Array<{ id: string }>)[0]?.id;
    if (!clanId) return setMessage('Prima crea un clan in Onboarding.');
    const screenshotUrl = await uploadScreenshot(clanId);
    let finalPlayerId = playerId;
    const selectedPlayer = players.find((p) => p.id === playerId);
    const finalNickname = nickname || selectedPlayer?.nickname || '';
    if (!finalPlayerId) {
      const byUid = uid ? players.find((p) => p.uid_codm === uid) : undefined;
      const byNick = finalNickname ? players.find((p) => p.nickname.toLowerCase() === finalNickname.toLowerCase()) : undefined;
      finalPlayerId = byUid?.id || byNick?.id || '';
    }
    if (!finalPlayerId) {
      if (!finalNickname) return setMessage('Inserisci nickname o seleziona un player esistente.');
      const { data: created, error } = await supabase.from('players').insert({
        clan_id: clanId,
        nickname: finalNickname,
        uid_codm: uid || null,
        avatar_url: screenshotUrl,
        account_level: toInt(level),
        rank_mp_current: rankMp || rankCurrent || null,
        rank_br_current: rankBr || null,
        rank_mp_best: rankBest || null,
        status: 'active',
        notes: `Creato da import profilo V6.3 ${phone}/${template}`,
      }).select('id').single();
      if (error) return setMessage(error.message);
      finalPlayerId = created?.id || '';
    } else {
      await supabase.from('players').update({
        uid_codm: uid || undefined,
        avatar_url: screenshotUrl || undefined,
        account_level: toInt(level) ?? undefined,
        rank_mp_current: rankMp || rankCurrent || undefined,
        rank_br_current: rankBr || undefined,
        rank_mp_best: rankBest || undefined,
      }).eq('id', finalPlayerId);
    }
    if (!finalPlayerId) return setMessage('Player non trovato o non creato.');
    const snapshotData = {
      importType,
      rankCurrent,
      rankBest,
      legendaryMp: toInt(legendaryMp),
      legendaryBr: toInt(legendaryBr),
      legendaryDmz: toInt(legendaryDmz),
      legendaryZombie: toInt(legendaryZombie),
      mvp: toInt(mvp), matches: toInt(matches), wins: toInt(wins), top3: toInt(top3), kills: toInt(kills), kd: toNum(kd), accuracy: toNum(accuracy), avgDamage: toNum(avgDamage),
      zombieUltimate: toInt(zombieUltimate), teammatesSaved: toInt(teammatesSaved), wavesSolo: toInt(wavesSolo), extractionRate: toNum(extractionRate), profitLoss: toNum(profitLoss), totalWealth: toInt(totalWealth), contracts: toInt(contracts),
      templatePhone: phone,
      templateSlot: template,
    };
    const { error: snapError } = await supabase.from('player_snapshots').insert({
      clan_id: clanId,
      player_id: finalPlayerId,
      screenshot_url: screenshotUrl,
      source_type: importType,
      mvp_count: toInt(mvp), games_count: toInt(matches), wins_count: toInt(wins), top3_count: toInt(top3), total_kills: toInt(kills), kd: toNum(kd), avg_accuracy: toNum(accuracy), avg_damage: toNum(avgDamage),
      zombie_ultimate_defeated: toInt(zombieUltimate), teammates_saved: toInt(teammatesSaved), waves_cleared_solo: toInt(wavesSolo), extraction_rate: toNum(extractionRate), profit_loss_ratio: toNum(profitLoss), total_wealth: toInt(totalWealth), contracts_completed: toInt(contracts),
      snapshot_data: snapshotData,
      ocr_raw_text: rawText || null,
      confidence_score: rawText ? 70 : 100,
    });
    if (snapError) return setMessage(snapError.message);
    if (screenshotUrl || rawText) {
      await supabase.from('screenshot_imports').insert({ clan_id: clanId, import_type: importType, file_url: screenshotUrl, ocr_raw_text: rawText || null, parser_status: 'confirmed' });
    }
    await loadPlayers();
    setMessage('Profilo/statistiche salvate. Database aggiornato.');
  }

  return (
    <main className="container wide">
      <section className="card import-hero">
        <div>
          <p className="eyebrow">🪪 Import profilo V6.3</p>
          <h1>Import profilo / statistiche giocatore</h1>
          <p className="muted">Un solo tasto di import. Seleziona il template salvato, centra il frame se serve, poi controlla i campi e salva.</p>
        </div>
        <div className="import-actions">
          <input className="input" type="file" accept="image/*" onChange={(e) => onFileSelected(e.target.files?.[0] || null)} />
          <button className="btn import-main-btn" onClick={importProfile} disabled={working || !file}>{working ? '⏳ Lettura profilo...' : '🚀 Importa profilo'}</button>
        </div>
      </section>

      <section className="grid grid-2 top-gap profile-import-layout">
        <div className="card">
          <h2>Screenshot e template</h2>
          {imageUrl ? (
            <div className="ocr-image-wrap profile-image-tall" ref={imageWrapRef}>
              <img className="preview ocr-overlay-image" src={imageUrl} alt="Screenshot profilo" />
              <div className="cal-content-frame" style={frameToStyle(activeFrame)} />
              {useCalibrationTemplate && <div className="ocr-template-layer editable">{templateRegions.map((region) => (
                <div
                  key={region.name}
                  className={`ocr-template-box cal-rect ocr-template-neutral ${selectedProfileRegionName === region.name ? 'active' : ''}`}
                  title={`TRASCINA/ALLARGA PROFILO: ${region.label || region.name}`}
                  style={regionToImageStyle(region, activeFrame)}
                  onPointerDown={(e) => startProfileRegionDrag(e, region, 'move')}
                  onClick={() => setSelectedProfileRegionName(region.name)}
                >
                  <span>{region.label || region.name}</span>
                  {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => <i key={handle} className={`cal-handle ${handle}`} onPointerDown={(e) => startProfileRegionDrag(e, region, 'resize', handle)} />)}
                </div>
              ))}</div>}
              {!!backendBoxes.length && <div className="ocr-overlay-layer">{backendBoxes.map((box, index) => <div key={`${box.name}-${index}`} className="ocr-box ocr-box-neutral" title={`BACKEND: ${box.name} | ${box.role}`} style={{ left: `${box.x_norm * 100}%`, top: `${box.y_norm * 100}%`, width: `${box.w_norm * 100}%`, height: `${box.h_norm * 100}%` }} />)}</div>}
            </div>
          ) : <div className="empty-state">Carica screenshot profilo CODM.</div>}

          {(working || ocrProgress) && <div className="ak-progress-panel"><div className="ak-progress-row"><span>Import profilo</span><span>{ocrProgressPct}%</span></div><div className="ak-progress-track"><div className="ak-progress-fill" style={{ width: `${ocrProgressPct}%` }} /></div><div className="ak-progress-note">{ocrProgress}</div></div>}

          <div className={`ak-template-status ${template === 'default' ? 'warn' : 'ok'}`}><strong>Template profilo:</strong> 🧩 {templateSummary}</div>
          <div className="grid grid-2 top-gap">
            <div className="field"><label>Tipo screenshot</label><select className="select pro-select" value={importType} onChange={(e) => setImportType(e.target.value as ProfileImportType)}>{importTypes.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select><small className="muted">{importTypes.find((x) => x.value === importType)?.hint}</small></div>
            <div className="field"><label>Usa template profilo</label><label className="template-toggle-line"><input type="checkbox" checked={useCalibrationTemplate} onChange={(e) => setUseCalibrationTemplate(e.target.checked)} /> Usa template salvato</label></div>
            <div className="field grid-span-2"><label>Template salvato</label><div className="import-actions import-actions-pro import-template-toolbar-pro"><select className="select pro-select" value={template} onFocus={() => refreshTemplateLists('default', template)} onChange={(e) => refreshTemplateLists('default', e.target.value)} disabled={!useCalibrationTemplate} title="Template profilo salvato">{calibrationTemplates.map((t) => <option key={t} value={t}>{t === 'default' ? '🧩 Default base' : `🧩 ${t}`}</option>)}</select><button className="btn secondary" type="button" onClick={() => refreshTemplateLists('default', template)}>🔄 Ricarica template</button><a className="btn small secondary" href="/calibration">🎯 Modifica template</a></div><small className="muted">Stesso formato di Import partita: menu dark/gaming, un solo nome template.</small></div>
          </div>

          <details className="top-gap" open>
            <summary>🎯 Centratura manuale immagine</summary>
            <div className="cal-buttons top-gap">
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, y: v.y - 0.005 }))}>↑ Su</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, y: v.y + 0.005 }))}>↓ Giù</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, x: v.x - 0.005 }))}>← Sinistra</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, x: v.x + 0.005 }))}>→ Destra</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, w: v.w + 0.01, h: v.h + 0.01 }))}>Allarga</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge((v) => ({ ...v, w: v.w - 0.01, h: v.h - 0.01 }))}>Stringi</button>
              <button className="btn small secondary" type="button" onClick={() => setFrameNudge({ x: 0, y: 0, w: 0, h: 0 })}>Reset</button>
              <a className="btn small secondary" href="/calibration">Modifica riquadri template</a>
            </div>
            <small className="muted">Questa centratura sposta il frame inviato al backend senza modificare il template salvato.</small>
          </details>
          <details className="top-gap" open>
            <summary>🧩 Regola riquadri profilo direttamente sull'immagine</summary>
            <div className="notice top-gap">Clicca un riquadro nello screenshot profilo, trascinalo con mouse/dito e ridimensionalo dagli angoli. Poi salva il template con un solo nome.</div>
            <div className="grid grid-2 top-gap">
              <div className="field"><label>Riquadro selezionato</label><select className="select" value={selectedProfileRegionName} onChange={(e) => setSelectedProfileRegionName(e.target.value)}>{templateRegions.map((r) => <option key={r.name} value={r.name}>{r.label || r.name}</option>)}</select></div>
              <div className="field"><label>Salvataggio template</label><button className="btn small" type="button" onClick={saveProfileTemplateFromImport}>💾 Salva riquadri profilo</button><small className="muted">Salva con il nome template selezionato sopra, senza doppio nome.</small></div>
            </div>
          </details>
          {message && <div className="notice top-gap">{message}</div>}
          {rawText && <details><summary>Testo OCR grezzo</summary><div className="raw-box">{rawText}</div></details>}
          {backendRawJson && <details><summary>JSON Backend OCR Profilo</summary><div className="raw-box">{backendRawJson}</div></details>}
        </div>

        <div className="card profile-confirm-card">
          <h2>Dati letti / conferma</h2>
          <div className="form">
            <div className="field"><label>Associa a player esistente oppure crea da nickname/UID</label><select className="select" value={playerId} onChange={(e) => setPlayerId(e.target.value)}><option value="">Crea/aggiorna da nickname o UID</option>{players.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}</select></div>
            <div className="grid grid-2"><div className="field"><label>Nickname</label><input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} /></div><div className="field"><label>UID</label><input className="input" value={uid} onChange={(e) => setUid(e.target.value)} /></div></div>
            <div className="grid grid-3"><div className="field"><label>Livello</label><input className="input" value={level} onChange={(e) => setLevel(e.target.value)} /></div><div className="field"><label>Rank MP / attuale</label><input className="input" value={rankMp || rankCurrent} onChange={(e) => { setRankMp(e.target.value); setRankCurrent(e.target.value); }} /></div><div className="field"><label>Rank BR / migliore</label><input className="input" value={rankBr || rankBest} onChange={(e) => { setRankBr(e.target.value); setRankBest(e.target.value); }} /></div></div>
            <h3>Numeri Leggendario</h3>
            <div className="grid grid-4"><div className="field"><label>MG</label><input className="input" value={legendaryMp} onChange={(e) => setLegendaryMp(e.target.value)} /></div><div className="field"><label>BR</label><input className="input" value={legendaryBr} onChange={(e) => setLegendaryBr(e.target.value)} /></div><div className="field"><label>DMZ</label><input className="input" value={legendaryDmz} onChange={(e) => setLegendaryDmz(e.target.value)} /></div><div className="field"><label>Zombie</label><input className="input" value={legendaryZombie} onChange={(e) => setLegendaryZombie(e.target.value)} /></div></div>
            <h3>Statistiche principali</h3>
            <div className="grid grid-3"><div className="field"><label>MVP / Like</label><input className="input" value={mvp} onChange={(e) => setMvp(e.target.value)} /></div><div className="field"><label>Partite</label><input className="input" value={matches} onChange={(e) => setMatches(e.target.value)} /></div><div className="field"><label>Vittorie</label><input className="input" value={wins} onChange={(e) => setWins(e.target.value)} /></div><div className="field"><label>Top 3</label><input className="input" value={top3} onChange={(e) => setTop3(e.target.value)} /></div><div className="field"><label>Uccisioni</label><input className="input" value={kills} onChange={(e) => setKills(e.target.value)} /></div><div className="field"><label>U/M - K/D</label><input className="input" value={kd} onChange={(e) => setKd(e.target.value)} /></div><div className="field"><label>Precisione %</label><input className="input" value={accuracy} onChange={(e) => setAccuracy(e.target.value)} /></div><div className="field"><label>Danni medi BR</label><input className="input" value={avgDamage} onChange={(e) => setAvgDamage(e.target.value)} /></div></div>
            <h3>Zombi / DMZ</h3>
            <div className="grid grid-3"><div className="field"><label>Zombi ultimate</label><input className="input" value={zombieUltimate} onChange={(e) => setZombieUltimate(e.target.value)} /></div><div className="field"><label>Compagni salvati</label><input className="input" value={teammatesSaved} onChange={(e) => setTeammatesSaved(e.target.value)} /></div><div className="field"><label>Ondate solo</label><input className="input" value={wavesSolo} onChange={(e) => setWavesSolo(e.target.value)} /></div><div className="field"><label>Tasso estrazioni %</label><input className="input" value={extractionRate} onChange={(e) => setExtractionRate(e.target.value)} /></div><div className="field"><label>Profitti/perdite</label><input className="input" value={profitLoss} onChange={(e) => setProfitLoss(e.target.value)} /></div><div className="field"><label>Patrimonio totale</label><input className="input" value={totalWealth} onChange={(e) => setTotalWealth(e.target.value)} /></div><div className="field"><label>Contratti completati</label><input className="input" value={contracts} onChange={(e) => setContracts(e.target.value)} /></div></div>
            <button className="btn" onClick={saveProfileSnapshot}>💾 Salva profilo/statistiche</button>
          </div>
        </div>
      </section>
    </main>
  );
}
