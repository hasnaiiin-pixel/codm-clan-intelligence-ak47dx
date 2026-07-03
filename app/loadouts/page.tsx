'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { parseLoadoutText } from '@/lib/ocrParsers';
import { recognizeCodmImage, type CodmOcrProgress } from '@/lib/codmOcrEngine';
import type { Loadout, Player } from '@/lib/types';

export default function LoadoutsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [clanId, setClanId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('CED');
  const [slot, setSlot] = useState('1');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [lethal, setLethal] = useState('');
  const [tactical, setTactical] = useState('');
  const [operatorSkill, setOperatorSkill] = useState('');
  const [perks, setPerks] = useState('');
  const [scorestreaks, setScorestreaks] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [message, setMessage] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');
  const [debugImages, setDebugImages] = useState<Array<{ name: string; dataUrl: string; notes: string }>>([]);
  const [working, setWorking] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: clans } = await supabase.from('clans').select('id').limit(1);
    if (clans?.[0]?.id) setClanId(clans[0].id);
    const { data: playerData } = await supabase.from('players').select('*').order('nickname');
    const { data: loadoutData } = await supabase.from('loadouts').select('*, players(nickname)').order('created_at', { ascending: false });
    setPlayers((playerData || []) as Player[]);
    setLoadouts((loadoutData || []) as Loadout[]);
  }

  function onFileSelected(selected: File | null) {
    setFile(selected);
    setRawText('');
    setDebugImages([]);
    setOcrProgress('');
    if (!selected) return setImageUrl('');
    setImageUrl(URL.createObjectURL(selected));
  }

  async function runOcr() {
    if (!file) return setMessage('Seleziona screenshot loadout/gunsmith.');
    setWorking(true);
    setDebugImages([]);
    setOcrProgress('Preparazione immagine loadout: ritagli armi, pannello destro e gunsmith.');
    setMessage('OCR 0.3 loadout in corso. Controlla e correggi i campi.');
    try {
      const ocr = await recognizeCodmImage(file, 'loadout', (progress: CodmOcrProgress) => {
        if (progress.stage === 'ocr') {
          const pct = Math.round((progress.progress || 0) * 100);
          setOcrProgress(`OCR ${progress.current}/${progress.total}: ${progress.variantName} ${pct}%`);
        } else if (progress.stage === 'preprocess') {
          setOcrProgress('Pre-processing loadout in corso...');
        }
      });
      const parsed = parseLoadoutText(ocr.rawText);
      setRawText(parsed.rawText);
      setDebugImages(ocr.debugImages);
      setName(parsed.name || name || 'Loadout CODM');
      setMode(parsed.mode || mode);
      setSlot(parsed.slotIndex ? String(parsed.slotIndex) : slot);
      setPrimary(parsed.primaryWeapon || parsed.weaponBuild?.weaponName || primary);
      setSecondary(parsed.secondaryWeapon || secondary);
      setCharacterName(parsed.characterName || characterName);
      setLethal(parsed.lethal || lethal);
      setTactical(parsed.tactical || tactical);
      setOperatorSkill(parsed.operatorSkill || operatorSkill);
      setPerks(parsed.perks.join(', ') || perks);
      setScorestreaks(parsed.scorestreaks.join(', ') || scorestreaks);
      setMessage('Lettura completata con OCR 0.3. Conferma o correggi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore OCR loadout.');
    } finally {
      setWorking(false);
      setOcrProgress('');
    }
  }

  async function uploadScreenshot() {
    if (!file || !clanId) return null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${clanId}/loadouts/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('codm-screenshots').upload(path, file, { upsert: false });
    if (error) {
      setMessage(error.message);
      return null;
    }
    return supabase.storage.from('codm-screenshots').getPublicUrl(path).data.publicUrl;
  }

  async function saveLoadout() {
    setMessage('');
    if (!clanId) return setMessage('Prima crea il clan.');
    const screenshotUrl = await uploadScreenshot();
    const { error } = await supabase.from('loadouts').insert({
      clan_id: clanId,
      player_id: playerId || null,
      name: name || 'Loadout CODM',
      weapon: primary || 'Arma non letta',
      secondary_weapon: secondary || null,
      character_name: characterName || null,
      slot_index: slot ? Number(slot) : null,
      mode: mode || null,
      lethal: lethal || null,
      tactical: tactical || null,
      operator_skill: operatorSkill || null,
      perks: perks.split(',').map((x) => x.trim()).filter(Boolean),
      scorestreaks: scorestreaks.split(',').map((x) => x.trim()).filter(Boolean),
      screenshot_url: screenshotUrl,
      notes: notes || rawText || null,
      active: true
    });
    if (error) return setMessage(error.message);

    if (screenshotUrl || rawText) {
      await supabase.from('screenshot_imports').insert({
        clan_id: clanId,
        import_type: 'loadout',
        file_url: screenshotUrl,
        ocr_raw_text: rawText || null,
        parser_status: 'confirmed'
      });
    }

    setMessage('Loadout salvato.');
    load();
  }

  return (
    <main className="container">
      <section className="grid grid-2">
        <div className="card">
          <h1>Loadout Center</h1>
          <p className="muted">Versione base: salva loadout MP/BR, screenshot, arma primaria/secondaria, perk, scorestreak e note.</p>
          <div className="form">
            <input className="input" type="file" accept="image/*" onChange={(e) => onFileSelected(e.target.files?.[0] || null)} />
            {imageUrl && <img className="preview" src={imageUrl} alt="Loadout" />}
            <button className="btn" onClick={runOcr} disabled={working}>{working ? 'Lettura...' : 'Leggi screenshot loadout'}</button>
            {ocrProgress && <div className="notice">{ocrProgress}</div>}
            {message && <div className="notice">{message}</div>}
            {!!debugImages.length && (
              <details>
                <summary>Anteprime ritagli OCR 0.3</summary>
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
            {rawText && <div className="raw-box">{rawText}</div>}
          </div>
        </div>

        <div className="card">
          <h2>Dati loadout</h2>
          <div className="form">
            <div className="field"><label>Player</label><select className="select" value={playerId} onChange={(e) => setPlayerId(e.target.value)}><option value="">Clan / non assegnato</option>{players.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}</select></div>
            <div className="grid grid-2">
              <div className="field"><label>Nome loadout</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="CED-ENERGY" /></div>
              <div className="field"><label>Slot</label><input className="input" value={slot} onChange={(e) => setSlot(e.target.value)} /></div>
            </div>
            <div className="grid grid-2">
              <div className="field"><label>Modalità</label><input className="input" value={mode} onChange={(e) => setMode(e.target.value)} /></div>
              <div className="field"><label>Personaggio / operatore</label><input className="input" value={characterName} onChange={(e) => setCharacterName(e.target.value)} /></div>
            </div>
            <div className="grid grid-2">
              <div className="field"><label>Arma primaria</label><input className="input" value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="AK117 - Finale tetro" /></div>
              <div className="field"><label>Arma secondaria</label><input className="input" value={secondary} onChange={(e) => setSecondary(e.target.value)} /></div>
            </div>
            <div className="grid grid-3">
              <div className="field"><label>Lethal</label><input className="input" value={lethal} onChange={(e) => setLethal(e.target.value)} /></div>
              <div className="field"><label>Tactical</label><input className="input" value={tactical} onChange={(e) => setTactical(e.target.value)} /></div>
              <div className="field"><label>Operator skill</label><input className="input" value={operatorSkill} onChange={(e) => setOperatorSkill(e.target.value)} /></div>
            </div>
            <div className="field"><label>Perk / specialità, separati da virgola</label><input className="input" value={perks} onChange={(e) => setPerks(e.target.value)} /></div>
            <div className="field"><label>Serie di punti, separate da virgola</label><input className="input" value={scorestreaks} onChange={(e) => setScorestreaks(e.target.value)} /></div>
            <div className="field"><label>Note</label><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <button className="btn" onClick={saveLoadout}>Salva loadout</button>
          </div>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Loadout salvati</h2>
        <table className="table">
          <thead><tr><th>Nome</th><th>Player</th><th>Mode</th><th>Slot</th><th>Arma</th><th>Secondaria</th></tr></thead>
          <tbody>
            {loadouts.map((l) => <tr key={l.id}><td>{l.name}</td><td>{l.players?.nickname || '-'}</td><td>{l.mode || '-'}</td><td>{l.slot_index || '-'}</td><td>{l.weapon}</td><td>{l.secondary_weapon || '-'}</td></tr>)}
            {!loadouts.length && <tr><td colSpan={6} className="muted">Nessun loadout.</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
