'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { parseCodmProfileText, type ParsedProfileStats } from '@/lib/ocrParsers';
import { recognizeCodmImage, type CodmOcrProgress } from '@/lib/codmOcrEngine';
import { getActivePhoneProfile, listCalibrationPhoneProfiles, loadCalibration, loadCalibrationBundle, setActivePhoneProfile } from '@/lib/calibration';
import { ACCEPTED_OCR_BACKEND_VERSIONS, EXPECTED_OCR_BACKEND_VERSION, getOcrBackendCandidates } from '@/lib/ocrBackend';
import { detectImageContentFrameFromUrl } from '@/lib/imageFrame';
import type { Player, ProfileImportType } from '@/lib/types';

const importTypes: Array<{ value: ProfileImportType; label: string; hint: string }> = [
  { value: 'profile_base', label: 'Profilo base CODM', hint: 'Nickname, UID, livello, rank e avatar.' },
  { value: 'multiplayer', label: 'Statistiche Multigiocatore', hint: 'MVP, partite, top 3, uccisioni, U/M e precisione.' },
  { value: 'battle_royale', label: 'Statistiche Battle Royale', hint: 'MVP, vittorie, partite, uccisioni, danni medi e precisione.' },
  { value: 'zombie', label: 'Statistiche Zombi', hint: 'MVP, partite, zombi ultimate, compagni salvati, ondate.' },
  { value: 'dmz', label: 'Statistiche DMZ: Recon', hint: 'Partite, estrazioni, patrimonio, uccisioni, contratti.' }
 ];

const EXPECTED_BACKEND_VERSION = EXPECTED_OCR_BACKEND_VERSION;
const ACCEPTED_BACKEND_VERSIONS = ACCEPTED_OCR_BACKEND_VERSIONS;

function backendCandidates() {
  return getOcrBackendCandidates();
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

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
  boxes?: Array<{ name: string; role: string; x_norm: number; y_norm: number; w_norm: number; h_norm: number; confidence?: number }>;
  warnings?: string[];
  diagnostics?: Record<string, unknown>;
  raw_text?: string;
};

export default function ImportProfilePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
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
  const [debugImages, setDebugImages] = useState<Array<{ name: string; dataUrl: string; notes: string }>>([]);
  const [backendRawJson, setBackendRawJson] = useState('');
  const [calibrationProfiles, setCalibrationProfiles] = useState<string[]>(['default']);
  const [selectedCalibrationPhone, setSelectedCalibrationPhone] = useState('default');
  const [useCalibrationTemplate, setUseCalibrationTemplate] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    loadPlayers();
    const activePhone = getActivePhoneProfile('profile_base');
    setSelectedCalibrationPhone(activePhone);
    setCalibrationProfiles(listCalibrationPhoneProfiles('profile_base'));
  }, []);

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('nickname');
    setPlayers((data || []) as Player[]);
  }

  function numText(value?: number | null) {
    return value === null || value === undefined ? '' : String(value);
  }

  function applyParsed(parsed: ParsedProfileStats) {
    setNickname(parsed.nickname || nickname);
    setUid(parsed.uid || uid);
    setLevel(numText(parsed.level));
    setRankMp(parsed.rankMp || rankMp);
    setRankBr(parsed.rankBr || rankBr);
    setRankCurrent(parsed.rankCurrent || rankCurrent);
    setRankBest(parsed.rankBest || rankBest);
    setMvp(numText(parsed.mvp));
    setMatches(numText(parsed.matches));
    setWins(numText(parsed.wins));
    setTop3(numText(parsed.top3));
    setKills(numText(parsed.kills));
    setKd(numText(parsed.kd));
    setAccuracy(numText(parsed.accuracy));
    setAvgDamage(numText(parsed.avgDamage));
    setZombieUltimate(numText(parsed.zombieUltimateDefeated));
    setTeammatesSaved(numText(parsed.teammatesSaved));
    setWavesSolo(numText(parsed.wavesClearedSolo));
    setExtractionRate(numText(parsed.extractionRate));
    setProfitLoss(numText(parsed.profitLossRatio));
    setTotalWealth(numText(parsed.totalWealth));
    setContracts(numText(parsed.contractsCompleted));
  }

  function onFileSelected(selected: File | null) {
    setFile(selected);
    setRawText('');
    setDebugImages([]);
    setBackendRawJson('');
    setOcrProgress('');
    setOcrProgressPct(0);
    if (!selected) return setImageUrl('');
    setImageUrl(URL.createObjectURL(selected));
  }

  function postProfileFormDataWithProgress(
    url: string,
    formData: FormData,
    timeoutMs: number,
    onProgress: (percent: number, label: string) => void
  ): Promise<BackendProfileResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = timeoutMs;
      xhr.responseType = 'text';

      let fakeProgress = 58;
      let serverTimer: number | null = null;
      const startServerTimer = () => {
        if (serverTimer !== null) return;
        serverTimer = window.setInterval(() => {
          fakeProgress = Math.min(88, fakeProgress + 4);
          onProgress(fakeProgress, 'Profile FastLane: Render sta leggendo i riquadri profilo. Attendi, non chiudere.');
        }, 1800);
      };
      const clearServerTimer = () => {
        if (serverTimer !== null) window.clearInterval(serverTimer);
        serverTimer = null;
      };

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const uploadPct = 30 + Math.round((event.loaded / event.total) * 28);
          onProgress(Math.min(58, uploadPct), 'Caricamento screenshot profilo verso OCR Render...');
        } else {
          onProgress(42, 'Caricamento screenshot profilo verso OCR Render...');
        }
      };
      xhr.upload.onload = () => {
        onProgress(58, 'Upload completato. OCR profilo in lavorazione...');
        startServerTimer();
      };

      xhr.onload = () => {
        clearServerTimer();
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            onProgress(92, 'Risposta profilo OCR ricevuta. Applico dati ai campi...');
            resolve(JSON.parse(xhr.responseText || '{}') as BackendProfileResult);
          } catch (error) {
            reject(new Error(`Risposta OCR profilo non valida: ${error instanceof Error ? error.message : 'JSON non leggibile'}`));
          }
          return;
        }
        reject(new Error(`Backend OCR profilo non risponde correttamente (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
      };

      xhr.onerror = () => { clearServerTimer(); reject(new Error('Errore rete verso Backend OCR Render per profilo. Controlla NEXT_PUBLIC_OCR_BACKEND_URL e CORS.')); };
      xhr.ontimeout = () => { clearServerTimer(); reject(new DOMException('OCR profilo timeout', 'AbortError')); };

      onProgress(30, 'Invio screenshot profilo al backend OCR...');
      xhr.send(formData);
    });
  }

  async function runBackendProfileOcr() {
    if (!file) return setMessage('Seleziona prima uno screenshot profilo CODM.');
    setWorking(true);
    setDebugImages([]);
    setBackendRawJson('');
    setOcrProgressPct(4);
    setOcrProgress('Preparazione profilo FastLane V5.7 con frame calibrazione frontend...');
    setMessage('OCR profilo V5.7: usa lo stesso frame della calibrazione frontend, poi fallback backend/full-frame se non legge i numeri.');
    try {
      const candidates = backendCandidates();
      if (!candidates.length) {
        throw new Error('NEXT_PUBLIC_OCR_BACKEND_URL non configurato. Su Vercel serve URL HTTPS Render, esempio https://ak47dx-ocr-backend.onrender.com');
      }
      const backendUrl = candidates[0];
      let backendVersion = 'direct-profile-fastlane';
      setOcrProgressPct(12);
      setOcrProgress(`V5.7 Profile OCR: provo import diretto su ${backendUrl}. /health è solo informativo.`);

      try {
        const healthResponse = await fetchWithTimeout(`${backendUrl}/health`, { cache: 'no-store' }, 7000);
        if (healthResponse.ok) {
          const health = await healthResponse.json() as { version?: string };
          backendVersion = health.version || backendVersion;
          setOcrProgressPct(18);
          setOcrProgress(`Backend OCR risponde (${backendVersion}). Avvio OCR profilo V5.7 con frame frontend...`);
        } else {
          setOcrProgressPct(18);
          setOcrProgress(`Health HTTP ${healthResponse.status}. Avvio comunque OCR profilo diretto...`);
        }
      } catch {
        setOcrProgressPct(18);
        setOcrProgress('Health Render lento/cold start. Avvio comunque OCR profilo diretto...');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('profile_mode', 'v5_7_template_frame_ocr');
      formData.append('import_type', importType);
      if (useCalibrationTemplate) {
        setActivePhoneProfile('profile_base', selectedCalibrationPhone);
        const calibrationBundle = loadCalibrationBundle('profile_base', selectedCalibrationPhone);
        formData.append('calibration_template', JSON.stringify(calibrationBundle));
        formData.append('template_source', `profile_v5_7_frame:${calibrationBundle.meta?.phoneProfile || selectedCalibrationPhone}`);
      }
      try {
        const frameUrl = imageUrl || URL.createObjectURL(file);
        const frame = await detectImageContentFrameFromUrl(frameUrl);
        formData.append('calibration_frame', JSON.stringify(frame));
        setOcrProgressPct(24);
        setOcrProgress(`Frame frontend profilo inviato: ${Math.round(frame.x * 1000) / 10}%,${Math.round(frame.y * 1000) / 10}% ${Math.round(frame.w * 1000) / 10}%x${Math.round(frame.h * 1000) / 10}%.`);
      } catch {
        setOcrProgressPct(24);
        setOcrProgress('Frame frontend non calcolato: backend userà fallback automatico.');
      }

      const parsed = await postProfileFormDataWithProgress(`${backendUrl}/ocr/profile`, formData, 150000, (percent, label) => {
        setOcrProgressPct(percent);
        setOcrProgress(label);
      });
      setBackendRawJson(JSON.stringify(parsed, null, 2));
      setRawText(parsed.raw_text || JSON.stringify(parsed, null, 2));

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
      const warnings = parsed.warnings?.length ? ` Warning: ${parsed.warnings.join(' | ')}` : '';
      setOcrProgressPct(100);
      setOcrProgress('OCR profilo completato. Controlla i campi gialli e salva.');
      setMessage(`OCR profilo V5.7 completato. Layout=${Math.round((parsed.layout_confidence || 0) * 100)}%, OCR=${Math.round((parsed.ocr_confidence || 0) * 100)}%. Usa frame frontend + fallback backend/full-frame. Controlla i campi gialli prima di salvare.${warnings}`);
    } catch (error) {
      setOcrProgressPct(100);
      setOcrProgress('OCR profilo fermato. Controlla messaggio e backend.');
      setMessage(error instanceof Error ? (error.name === 'AbortError' ? 'OCR profilo fermato per timeout dopo 120 secondi. Il backend Render è troppo lento: prova prima /health, poi riprova; l’import partite resta invariato.' : error.message) : 'Errore OCR profilo backend.');
    } finally {
      setWorking(false);
    }
  }

  async function runOcr() {
    if (!file) return setMessage('Seleziona prima uno screenshot profilo/statistiche CODM.');
    setWorking(true);
    setDebugImages([]);
    setOcrProgress('Preparazione immagine: ritaglio, contrasto e conversione per testo bianco CODM.');
    setMessage('OCR profilo 0.7 in corso. Usa template calibrato per nickname, livello, UID e riquadri rank se disponibile.');
    try {
      const calibratedRegions = importType === 'profile_base' ? loadCalibration('profile_base') : undefined;
      const result = await recognizeCodmImage(file, 'profile', (progress: CodmOcrProgress) => {
        if (progress.stage === 'ocr') {
          const pct = Math.round((progress.progress || 0) * 100);
          setOcrProgress(`OCR ${progress.current}/${progress.total}: ${progress.variantName} ${pct}%`);
        } else if (progress.stage === 'preprocess') {
          setOcrProgress('Pre-processing screenshot profilo in corso...');
        }
      }, calibratedRegions);
      const parsed = parseCodmProfileText(result.rawText, importType);
      setRawText(result.rawText);
      setDebugImages(result.debugImages);
      applyParsed(parsed);
      setMessage('Lettura completata con motore 0.7. Controlla nickname, UID, livello e like/statistiche e correggi solo quello che serve.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore OCR profilo.');
    } finally {
      setWorking(false);
      setOcrProgress('');
    }
  }

  function toInt(value: string) {
    const parsed = Number(String(value).replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }

  function toNum(value: string) {
    const parsed = Number(String(value).replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
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
    const clans = (clansData || []) as Array<{ id: string }>;
    const clanId = clans?.[0]?.id;
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
        notes: `Creato da import ${importType}`
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
        rank_mp_best: rankBest || undefined
      }).eq('id', finalPlayerId);
    }

    if (!finalPlayerId) return setMessage('Player non trovato o non creato.');

    const snapshotData = {
      importType,
      rankCurrent,
      rankBest,
      mvp: toInt(mvp),
      matches: toInt(matches),
      wins: toInt(wins),
      top3: toInt(top3),
      kills: toInt(kills),
      kd: toNum(kd),
      accuracy: toNum(accuracy),
      avgDamage: toNum(avgDamage),
      zombieUltimate: toInt(zombieUltimate),
      teammatesSaved: toInt(teammatesSaved),
      wavesSolo: toInt(wavesSolo),
      extractionRate: toNum(extractionRate),
      profitLoss: toNum(profitLoss),
      totalWealth: toInt(totalWealth),
      contracts: toInt(contracts),
      legendaryMp: toInt(legendaryMp),
      legendaryBr: toInt(legendaryBr),
      legendaryDmz: toInt(legendaryDmz),
      legendaryZombie: toInt(legendaryZombie)
    };

    const { error: snapError } = await supabase.from('player_snapshots').insert({
      clan_id: clanId,
      player_id: finalPlayerId,
      screenshot_url: screenshotUrl,
      source_type: importType,
      mvp_count: toInt(mvp),
      games_count: toInt(matches),
      wins_count: toInt(wins),
      top3_count: toInt(top3),
      total_kills: toInt(kills),
      kd: toNum(kd),
      avg_accuracy: toNum(accuracy),
      avg_damage: toNum(avgDamage),
      zombie_ultimate_defeated: toInt(zombieUltimate),
      teammates_saved: toInt(teammatesSaved),
      waves_cleared_solo: toInt(wavesSolo),
      extraction_rate: toNum(extractionRate),
      profit_loss_ratio: toNum(profitLoss),
      total_wealth: toInt(totalWealth),
      contracts_completed: toInt(contracts),
      snapshot_data: snapshotData,
      ocr_raw_text: rawText || null,
      confidence_score: rawText ? 70 : 100
    });
    if (snapError) return setMessage(snapError.message);

    if (screenshotUrl || rawText) {
      await supabase.from('screenshot_imports').insert({
        clan_id: clanId,
        import_type: importType,
        file_url: screenshotUrl,
        ocr_raw_text: rawText || null,
        parser_status: 'confirmed'
      });
    }

    await loadPlayers();
    setMessage('Profilo/statistiche salvate. Le trovi in Player roster e Dashboard.');
  }

  return (
    <main className="container wide profile-fastlane-page">
      <section className="profile-fastlane-layout">
        <div className="card">
          <h1>Import profilo / statistiche CODM</h1>
          <p className="muted">
            Usa questa pagina per screenshot profilo base, Multigiocatore, Battle Royale, Zombi e DMZ.
            L'OCR V5.7 usa lo stesso frame della calibrazione frontend e prova fallback backend/full-frame se i numeri non vengono letti.
          </p>
          <div className="form">
            <div className="field">
              <label>Tipo screenshot</label>
              <select className="select" value={importType} onChange={(e) => setImportType(e.target.value as ProfileImportType)}>
                {importTypes.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
              <small className="muted">{importTypes.find((x) => x.value === importType)?.hint}</small>
            </div>
            <div className="notice"><strong>Template profilo:</strong> {useCalibrationTemplate ? `ATTIVO: ${selectedCalibrationPhone}` : 'DISATTIVATO'} — crea/regola i box in /calibration tipo Profilo base.</div>
            <div className="grid grid-3">
              <div className="field"><label>Usa calibrazione profilo</label><select className="select" value={useCalibrationTemplate ? 'yes' : 'no'} onChange={(e) => setUseCalibrationTemplate(e.target.value === 'yes')}><option value="yes">Sì, usa template salvato</option><option value="no">No</option></select></div>
              <div className="field"><label>Template telefono</label><select className="select" value={selectedCalibrationPhone} onChange={(e) => { setSelectedCalibrationPhone(e.target.value); setActivePhoneProfile('profile_base', e.target.value); }} disabled={!useCalibrationTemplate}>{calibrationProfiles.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="field"><label>Azioni</label><div className="cal-buttons"><button className="btn small secondary" type="button" onClick={() => { const active = getActivePhoneProfile('profile_base'); setSelectedCalibrationPhone(active); setCalibrationProfiles(listCalibrationPhoneProfiles('profile_base')); setMessage(`Template profilo aggiornati. Attivo: ${active}`); }}>Ricarica</button><a className="btn small secondary" href="/calibration">Calibra</a></div></div>
            </div>
            <input className="input" type="file" accept="image/*" onChange={(e) => onFileSelected(e.target.files?.[0] || null)} />
            {imageUrl && <img className="preview" src={imageUrl} alt="Screenshot profilo" />}
            <div className="grid grid-2">
              <button className="btn" onClick={runBackendProfileOcr} disabled={working}>{working ? '⏳ Lettura...' : '🪪 OCR Profilo V5.7 frame-lock'}</button>
              <button className="btn secondary" onClick={runOcr} disabled={working}>{working ? 'Lettura...' : 'OCR browser fallback 0.7'}</button>
            </div>
            {ocrProgress && <div className="notice"><strong>Avanzamento OCR profilo: {ocrProgressPct}%</strong><div className="ak-progress-track"><div className="ak-progress-bar" style={{ width: `${ocrProgressPct}%` }} /></div><span>{ocrProgress}</span></div>}
            {message && <div className="notice">{message}</div>}
            {!!debugImages.length && (
              <details>
                <summary>Anteprime ritagli OCR 0.7</summary>
                <div className="ocr-debug-grid">
                  {debugImages.map((img) => (
                    <div className="ocr-debug-card" key={img.name}>
                      <strong>{img.name}</strong>
                      <img src={img.dataUrl} alt={img.name} />
                      <small className="muted">{img.notes}</small>
                    </div>
                  ))}
                </div>
              </details>
            )}
            {rawText && <details><summary>Testo OCR grezzo / debug</summary><div className="raw-box">{rawText}</div></details>}
            {backendRawJson && <details><summary>JSON Backend OCR Profilo</summary><div className="raw-box">{backendRawJson}</div></details>}
          </div>
        </div>

        <div className="card">
          <h2>Dati letti / conferma</h2>
          <div className="form">
            <div className="field">
              <label>Associa a player esistente oppure lascia vuoto per crearne uno nuovo</label>
              <select className="select" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                <option value="">Crea/aggiorna da nickname o UID</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </select>
            </div>

            <div className="grid grid-2">
              <div className="field"><label>Nickname</label><input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="AKঐMIRZA" /></div>
              <div className="field"><label>UID</label><input className="input" value={uid} onChange={(e) => setUid(e.target.value)} /></div>
            </div>

            <div className="grid grid-3">
              <div className="field"><label>Livello</label><input className="input" value={level} onChange={(e) => setLevel(e.target.value)} /></div>
              <div className="field"><label>Rank attuale / MP</label><input className="input" value={rankMp || rankCurrent} onChange={(e) => { setRankMp(e.target.value); setRankCurrent(e.target.value); }} /></div>
              <div className="field"><label>Rank BR / migliore</label><input className="input" value={rankBr || rankBest} onChange={(e) => { setRankBr(e.target.value); setRankBest(e.target.value); }} /></div>
            </div>

            <h3>Numeri Leggendario per modalità</h3>
            <p className="muted">Sono i numeri piccoli accanto al simbolo Leggendario. Calibrali da /calibration → Profilo base.</p>
            <div className="grid grid-4">
              <div className="field"><label>Leggendario MG</label><input className="input" value={legendaryMp} onChange={(e) => setLegendaryMp(e.target.value)} /></div>
              <div className="field"><label>Leggendario BR</label><input className="input" value={legendaryBr} onChange={(e) => setLegendaryBr(e.target.value)} /></div>
              <div className="field"><label>Leggendario DMZ</label><input className="input" value={legendaryDmz} onChange={(e) => setLegendaryDmz(e.target.value)} /></div>
              <div className="field"><label>Leggendario Zombie</label><input className="input" value={legendaryZombie} onChange={(e) => setLegendaryZombie(e.target.value)} /></div>
            </div>

            <h3>Statistiche principali</h3>
            <div className="grid grid-3">
              <div className="field"><label>MVP</label><input className="input" value={mvp} onChange={(e) => setMvp(e.target.value)} /></div>
              <div className="field"><label>Partite</label><input className="input" value={matches} onChange={(e) => setMatches(e.target.value)} /></div>
              <div className="field"><label>Vittorie</label><input className="input" value={wins} onChange={(e) => setWins(e.target.value)} /></div>
              <div className="field"><label>Top 3</label><input className="input" value={top3} onChange={(e) => setTop3(e.target.value)} /></div>
              <div className="field"><label>Uccisioni</label><input className="input" value={kills} onChange={(e) => setKills(e.target.value)} /></div>
              <div className="field"><label>U/M - K/D</label><input className="input" value={kd} onChange={(e) => setKd(e.target.value)} /></div>
              <div className="field"><label>Precisione %</label><input className="input" value={accuracy} onChange={(e) => setAccuracy(e.target.value)} /></div>
              <div className="field"><label>Danni medi BR</label><input className="input" value={avgDamage} onChange={(e) => setAvgDamage(e.target.value)} /></div>
            </div>

            <h3>Zombi / DMZ</h3>
            <div className="grid grid-3">
              <div className="field"><label>Zombi ultimate sconfitti</label><input className="input" value={zombieUltimate} onChange={(e) => setZombieUltimate(e.target.value)} /></div>
              <div className="field"><label>Compagni salvati</label><input className="input" value={teammatesSaved} onChange={(e) => setTeammatesSaved(e.target.value)} /></div>
              <div className="field"><label>Ondate solo</label><input className="input" value={wavesSolo} onChange={(e) => setWavesSolo(e.target.value)} /></div>
              <div className="field"><label>Tasso estrazioni %</label><input className="input" value={extractionRate} onChange={(e) => setExtractionRate(e.target.value)} /></div>
              <div className="field"><label>Profitti/perdite</label><input className="input" value={profitLoss} onChange={(e) => setProfitLoss(e.target.value)} /></div>
              <div className="field"><label>Patrimonio totale</label><input className="input" value={totalWealth} onChange={(e) => setTotalWealth(e.target.value)} /></div>
              <div className="field"><label>Contratti completati</label><input className="input" value={contracts} onChange={(e) => setContracts(e.target.value)} /></div>
            </div>

            <button className="btn" onClick={saveProfileSnapshot}>Salva profilo/statistiche</button>
          </div>
        </div>
      </section>
    </main>
  );
}
