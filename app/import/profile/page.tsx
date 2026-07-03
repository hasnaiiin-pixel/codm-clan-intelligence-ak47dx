'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { parseCodmProfileText, type ParsedProfileStats } from '@/lib/ocrParsers';
import { recognizeCodmImage, type CodmOcrProgress } from '@/lib/codmOcrEngine';
import { getActivePhoneProfile, listCalibrationPhoneProfiles, loadCalibration, loadCalibrationBundle, setActivePhoneProfile } from '@/lib/calibration';
import type { Player, ProfileImportType } from '@/lib/types';

const importTypes: Array<{ value: ProfileImportType; label: string; hint: string }> = [
  { value: 'profile_base', label: 'Profilo base CODM', hint: 'Nickname, UID, livello, rank e avatar.' },
  { value: 'multiplayer', label: 'Statistiche Multigiocatore', hint: 'MVP, partite, top 3, uccisioni, U/M e precisione.' },
  { value: 'battle_royale', label: 'Statistiche Battle Royale', hint: 'MVP, vittorie, partite, uccisioni, danni medi e precisione.' },
  { value: 'zombie', label: 'Statistiche Zombi', hint: 'MVP, partite, zombi ultimate, compagni salvati, ondate.' },
  { value: 'dmz', label: 'Statistiche DMZ: Recon', hint: 'Partite, estrazioni, patrimonio, uccisioni, contratti.' }
 ];

const EXPECTED_BACKEND_VERSION = '2.0.0-definitive-ak47dx';
const ENV_BACKEND_URL = process.env.NEXT_PUBLIC_OCR_BACKEND_URL || '';
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8780';

function backendCandidates() {
  const urls = [DEFAULT_BACKEND_URL, ENV_BACKEND_URL, 'http://localhost:8780', 'http://127.0.0.1:8770', 'http://localhost:8770', 'http://127.0.0.1:8765', 'http://localhost:8765']
    .map((url) => url.trim())
    .filter(Boolean);
  return Array.from(new Set(urls));
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
    if (!selected) return setImageUrl('');
    setImageUrl(URL.createObjectURL(selected));
  }

  async function runBackendProfileOcr() {
    if (!file) return setMessage('Seleziona prima uno screenshot profilo CODM.');
    setWorking(true);
    setDebugImages([]);
    setBackendRawJson('');
    setOcrProgress('Invio screenshot al Backend OCR Profile 2.0...');
    setMessage('OCR profilo 2.0 in corso: usa calibrazione profilo + voto OCR su numeri Leggendario MG/BR/DMZ/Zombie.');
    try {
      let backendUrl = '';
      let backendVersion = 'unknown';
      const attempts: string[] = [];
      for (const candidate of backendCandidates()) {
        try {
          const healthResponse = await fetch(`${candidate}/health`, { cache: 'no-store' });
          if (!healthResponse.ok) {
            attempts.push(`${candidate} -> HTTP ${healthResponse.status}`);
            continue;
          }
          const health = await healthResponse.json() as { version?: string };
          backendVersion = health.version || 'unknown';
          if (backendVersion !== EXPECTED_BACKEND_VERSION) {
            attempts.push(`${candidate} -> versione ${backendVersion}, attesa ${EXPECTED_BACKEND_VERSION}`);
            continue;
          }
          backendUrl = candidate;
          break;
        } catch (healthError) {
          attempts.push(`${candidate} -> ${healthError instanceof Error ? healthError.message : 'Failed to fetch'}`);
        }
      }
      if (!backendUrl) throw new Error(`Backend OCR 2.0 non raggiungibile/allineato. Verifica http://127.0.0.1:8780/health = ${EXPECTED_BACKEND_VERSION}. Tentativi: ${attempts.join(' | ')}`);

      const formData = new FormData();
      formData.append('file', file);
      if (useCalibrationTemplate) {
        setActivePhoneProfile('profile_base', selectedCalibrationPhone);
        const calibrationBundle = loadCalibrationBundle('profile_base', selectedCalibrationPhone);
        formData.append('calibration_template', JSON.stringify(calibrationBundle));
      }
      const response = await fetch(`${backendUrl}/ocr/profile`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Backend profilo non risponde (${response.status}): ${await response.text()}`);
      const parsed = await response.json() as BackendProfileResult;
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
      setMessage(`OCR profilo 2.0 completato. Layout=${Math.round((parsed.layout_confidence || 0) * 100)}%, OCR=${Math.round((parsed.ocr_confidence || 0) * 100)}%. Controlla numeri Leggendario prima di salvare.${warnings}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore OCR profilo backend.');
    } finally {
      setWorking(false);
      setOcrProgress('');
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
    <main className="container">
      <section className="grid grid-2">
        <div className="card">
          <h1>Import profilo / statistiche CODM</h1>
          <p className="muted">
            Usa questa pagina per screenshot profilo base, Multigiocatore, Battle Royale, Zombi e DMZ.
            L'OCR 2.0 usa il backend Python, template profilo calibrato e voto su più letture per nickname, UID, livello e numeri Leggendario MG/BR/DMZ/Zombie.
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
              <button className="btn" onClick={runBackendProfileOcr} disabled={working}>{working ? '⏳ Lettura...' : '🪪 OCR Profile Hybrid 2.0'}</button>
              <button className="btn secondary" onClick={runOcr} disabled={working}>{working ? 'Lettura...' : 'OCR browser fallback 0.7'}</button>
            </div>
            {ocrProgress && <div className="notice">{ocrProgress}</div>}
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
