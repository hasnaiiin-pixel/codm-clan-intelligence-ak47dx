'use client';
import { useCodmAuth } from '@/lib/authRoles';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';


import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  clampRegion,
  defaultCalibration,
  exportCalibration,
  getActivePhoneProfile,
  importCalibration,
  listCalibrationPhoneProfiles,
  listCalibrationPhones,
  listCalibrationTemplatesForPhone,
  makeCalibrationProfileKey,
  splitCalibrationProfileKey,
  loadCalibrationBundle,
  resetCalibration,
  saveCalibration,
  setActivePhoneProfile,
  setActiveUserContext,
  type CalibratedRegion,
  type CalibrationKind
} from '@/lib/calibration';
import { FULL_IMAGE_FRAME, detectImageContentFrameFromUrl, frameToStyle, imagePointToFrameNorm, regionToImageStyle, type ImageContentFrame } from '@/lib/imageFrame';

const kinds: Array<{ value: CalibrationKind; label: string; help: string }> = [
  { value: 'scoreboard_ced', label: 'Scoreboard / punteggio CED', help: 'Risultato alto, data, mappa, score blu/rosso, team blu/rosso e celle K/D/A.' },
  { value: 'profile_base', label: 'Profilo base', help: 'Nickname, livello, UID, like e rank nel profilo base.' }
];

function pct(value: number) { return `${(value * 100).toFixed(2)}%`; }
function slug(value: string) { return (value || 'default').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'default'; }

type DragMode = 'move' | 'resize';
type DragState = { name: string; mode: DragMode; startX: number; startY: number; start: CalibratedRegion; handle?: 'se' | 'sw' | 'ne' | 'nw' } | null;


export default function CalibrationPage() {
  const codmAuth = useCodmAuth();
  if (codmAuth.loading) return <WriteAccessBlock loading />;
  if (!codmAuth.canWrite) return <WriteAccessBlock role={codmAuth.role} title="Solo Staff, Coach o Owner può usare la calibrazione" description="La calibrazione OCR modifica impostazioni operative e resta riservata agli utenti autorizzati." />;
  return <CalibrationEditor />;
}

function CalibrationEditor() {
  const [kind, setKind] = useState<CalibrationKind>('scoreboard_ced');
  const [phoneProfile, setPhoneProfile] = useState('default');
  const [phoneDevice, setPhoneDevice] = useState('default');
  const [templateSlot, setTemplateSlot] = useState('default');
  const [templateName, setTemplateName] = useState('Scoreboard CED');
  const [ownerName, setOwnerName] = useState('');
  const [profiles, setProfiles] = useState<string[]>(['default']);
  const [phoneOptions, setPhoneOptions] = useState<string[]>(['default']);
  const [templateOptions, setTemplateOptions] = useState<string[]>(['default']);
  const [regions, setRegions] = useState<CalibratedRegion[]>(() => loadCalibrationBundle('scoreboard_ced').regions);
  const [selectedName, setSelectedName] = useState('SCOREBOARD_SCORE_BLUE');
  const [imageUrl, setImageUrl] = useState('');
  const [contentFrame, setContentFrame] = useState<ImageContentFrame>(FULL_IMAGE_FRAME);
  const [message, setMessage] = useState('');
  const [jsonBox, setJsonBox] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);

  const selected = regions.find((region) => region.name === selectedName) || regions[0];
  const groups = useMemo(() => Array.from(new Set(regions.map((region) => region.group || 'Altro'))), [regions]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      const name = user?.user_metadata?.display_name || user?.email || '';
      setOwnerName(String(name || ''));
      setActiveUserContext(user?.id || 'anonymous', String(name || ''));
      const activePhone = getActivePhoneProfile(kind);
      const split = splitCalibrationProfileKey(activePhone);
      setPhoneProfile(activePhone);
      setPhoneDevice(split.phone);
      setTemplateSlot(split.template);
      const bundle = loadCalibrationBundle(kind, activePhone);
      setRegions(bundle.regions);
      setTemplateName(bundle.meta.templateName);
      setProfiles(listCalibrationPhoneProfiles(kind));
      setPhoneOptions(listCalibrationPhones(kind));
      setTemplateOptions(listCalibrationTemplatesForPhone(kind, split.phone));
    });
  }, []);

  function loadTemplate(nextKind: CalibrationKind, nextPhone = getActivePhoneProfile(nextKind)) {
    setKind(nextKind);
    const split = splitCalibrationProfileKey(nextPhone);
    setPhoneProfile(nextPhone);
    setPhoneDevice(split.phone);
    setTemplateSlot(split.template);
    setActivePhoneProfile(nextKind, nextPhone);
    const bundle = loadCalibrationBundle(nextKind, nextPhone);
    setRegions(bundle.regions);
    setTemplateName(bundle.meta.templateName);
    setSelectedName(bundle.regions[0]?.name || '');
    setProfiles(listCalibrationPhoneProfiles(nextKind));
    setPhoneOptions(listCalibrationPhones(nextKind));
    setTemplateOptions(listCalibrationTemplatesForPhone(nextKind, split.phone));
    setMessage(`Template ${nextKind} / telefono ${split.phone} / template ${split.template} caricato. Puoi trascinare i riquadri o ridimensionarli dagli angoli.`);
  }

  function changeKind(nextKind: CalibrationKind) { loadTemplate(nextKind, getActivePhoneProfile(nextKind)); }
  function changePhone(nextPhoneRaw: string) { loadTemplate(kind, slug(nextPhoneRaw)); }
  function changePhoneDevice(nextPhoneRaw: string) {
    const nextPhone = slug(nextPhoneRaw);
    const templates = listCalibrationTemplatesForPhone(kind, nextPhone);
    const nextTemplate = templates.includes(templateSlot) ? templateSlot : 'default';
    loadTemplate(kind, makeCalibrationProfileKey(nextPhone, nextTemplate));
  }
  function changeTemplateSlot(nextTemplateRaw: string) {
    loadTemplate(kind, makeCalibrationProfileKey(phoneDevice, nextTemplateRaw));
  }
  function newPhoneProfile() {
    const phoneValue = window.prompt('Nome telefono? Esempio: iphone_17px, samsung_s23, ipad');
    if (!phoneValue) return;
    const templateValue = window.prompt('Nome template? Esempio: ced, postazione, dominio, profilo_base') || 'default';
    const next = makeCalibrationProfileKey(phoneValue, templateValue);
    const split = splitCalibrationProfileKey(next);
    setPhoneProfile(next);
    setPhoneDevice(split.phone);
    setTemplateSlot(split.template);
    setActivePhoneProfile(kind, next);
    const defaults = defaultCalibration(kind);
    setRegions(defaults);
    setSelectedName(defaults[0]?.name || '');
    setTemplateName(`${kind === 'profile_base' ? 'Profilo base' : 'Scoreboard CED'} ${next}`);
    setProfiles(Array.from(new Set([...profiles, next])).sort());
    setPhoneOptions(listCalibrationPhones(kind));
    setTemplateOptions(Array.from(new Set([...listCalibrationTemplatesForPhone(kind, split.phone), split.template])).sort());
    saveCalibration(kind, defaults, next, `${kind === 'profile_base' ? 'Profilo base' : 'Scoreboard CED'} ${next}`, ownerName);
    setMessage(`Nuovo template ${next}. Formato: telefono__template. Regola i riquadri e premi Salva template.`);
  }

  async function onFile(file?: File | null) {
    if (!file) {
      setImageUrl('');
      setContentFrame(FULL_IMAGE_FRAME);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const frame = await detectImageContentFrameFromUrl(url);
    setContentFrame(frame);
    // Ricarica sempre il template salvato per il telefono corrente quando cambi screenshot.
    // Le coordinate 0.9E sono riferite al content frame, quindi restano stabili anche se cambia bordo nero/crop telefono.
    const bundle = loadCalibrationBundle(kind, phoneProfile);
    setRegions(bundle.regions);
    setSelectedName(bundle.regions.find((r) => r.name === selectedName)?.name || bundle.regions[0]?.name || '');
    setTemplateName(bundle.meta.templateName);
    setMessage(`Screenshot caricato. Template attivo: ${kind} / ${phoneProfile}. Content frame ${Math.round(frame.x * 1000) / 10}%,${Math.round(frame.y * 1000) / 10}% ${Math.round(frame.w * 1000) / 10}%x${Math.round(frame.h * 1000) / 10}% (${frame.reason}).`);
  }

  function persistRegions(nextRegions: CalibratedRegion[]) {
    saveCalibration(kind, nextRegions, phoneProfile, templateName, ownerName);
  }

  function updateRegionByName(name: string, patch: Partial<CalibratedRegion>, autosave = true) {
    setRegions((current) => {
      const next = current.map((region) => region.name === name ? clampRegion({ ...region, ...patch }) : region);
      if (autosave) persistRegions(next);
      return next;
    });
  }
  function updateSelected(patch: Partial<CalibratedRegion>) { if (selected) updateRegionByName(selected.name, patch, true); }

  function pointerToNorm(event: PointerEvent | React.PointerEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    return imagePointToFrameNorm(px, py, contentFrame);
  }

  function startDrag(event: React.PointerEvent, region: CalibratedRegion, mode: DragMode, handle?: 'se' | 'sw' | 'ne' | 'nw') {
    event.preventDefault();
    event.stopPropagation();
    setSelectedName(region.name);
    const point = pointerToNorm(event);
    dragRef.current = { name: region.name, mode, startX: point.x, startY: point.y, start: region, handle };
    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', stopDrag);
  }

  function onGlobalPointerMove(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerToNorm(event);
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    const r = drag.start;
    if (drag.mode === 'move') {
      updateRegionByName(drag.name, { x: r.x + dx, y: r.y + dy });
      return;
    }
    let nx = r.x;
    let ny = r.y;
    let nw = r.w;
    let nh = r.h;
    if (drag.handle === 'se') { nw = r.w + dx; nh = r.h + dy; }
    if (drag.handle === 'sw') { nx = r.x + dx; nw = r.w - dx; nh = r.h + dy; }
    if (drag.handle === 'ne') { ny = r.y + dy; nw = r.w + dx; nh = r.h - dy; }
    if (drag.handle === 'nw') { nx = r.x + dx; ny = r.y + dy; nw = r.w - dx; nh = r.h - dy; }
    updateRegionByName(drag.name, { x: nx, y: ny, w: nw, h: nh });
  }
  function stopDrag() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onGlobalPointerMove);
    window.removeEventListener('pointerup', stopDrag);
  }

  function save() {
    saveCalibration(kind, regions, phoneProfile, templateName, ownerName);
    setProfiles(listCalibrationPhoneProfiles(kind));
    setMessage(`Template salvato per login ${ownerName || 'utente locale'} / telefono ${phoneDevice} / template ${templateSlot}. Import Partita e Import Profilo useranno questi riquadri.`);
  }
  function reset() {
    resetCalibration(kind, phoneProfile);
    const defaults = defaultCalibration(kind);
    setRegions(defaults);
    setSelectedName(defaults[0]?.name || '');
    setMessage('Template riportato ai valori di fabbrica per questo telefono.');
  }
  function exportJson() {
    const exported = exportCalibration(kind, phoneProfile);
    setJsonBox(exported);
    navigator.clipboard?.writeText(exported).catch(() => undefined);
    setMessage('Template esportato. Puoi copiarlo e conservarlo.');
  }
  function importJson() {
    try {
      const imported = importCalibration(jsonBox);
      const nextPhone = slug(imported.meta?.phoneProfile || phoneProfile);
      const split = splitCalibrationProfileKey(nextPhone);
      setKind(imported.kind);
      setPhoneProfile(nextPhone);
      setPhoneDevice(split.phone);
      setTemplateSlot(split.template);
      setRegions(imported.regions);
      setTemplateName(imported.meta?.templateName || templateName);
      setSelectedName(imported.regions[0]?.name || '');
      saveCalibration(imported.kind, imported.regions, nextPhone, imported.meta?.templateName || templateName, ownerName);
      setProfiles(listCalibrationPhoneProfiles(imported.kind));
      setPhoneOptions(listCalibrationPhones(imported.kind));
      setTemplateOptions(listCalibrationTemplatesForPhone(imported.kind, split.phone));
      setMessage('Template importato e salvato.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Template JSON non valido.');
    }
  }

  return (
    <main className="container wide">
      <section className="card">
        <h1>Calibrazione OCR attiva</h1>
        <p className="muted">
          Ora i riquadri sono riferiti al content frame dell'immagine, non al bordo nero. Puoi trascinarli liberamente, ridimensionarli dagli angoli e salvarli per telefono/login. Questo riduce lo spostamento tra screenshot diversi dello stesso telefono.
        </p>
        <div className="grid grid-4">
          <div className="field"><label>Tipo template</label><select className="select" value={kind} onChange={(e) => changeKind(e.target.value as CalibrationKind)}>{kinds.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select><small className="muted">{kinds.find((e) => e.value === kind)?.help}</small></div>
          <div className="field"><label>Tipologia telefono</label><div className="cal-phone-row"><select className="select" value={phoneDevice} onChange={(e) => changePhoneDevice(e.target.value)}>{phoneOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select><button className="btn small secondary" type="button" onClick={newPhoneProfile}>Nuovo</button></div><small className="muted">Esempio: iphone_17px</small></div>
          <div className="field"><label>Nome template</label><select className="select" value={templateSlot} onChange={(e) => changeTemplateSlot(e.target.value)}>{templateOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select><input className="input top-gap" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Descrizione template" /><small className="muted">Esempio: ced, postazione, dominio, profilo_base</small></div>
          <div className="field"><label>Login/profilo collegato</label><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome login" /><small className="muted">Chiave attiva: {phoneProfile}</small></div>
        </div>
        <div className="grid grid-3 top-gap">
          <div className="field"><label>Screenshot campione</label><input className="input" type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0] || null)} /></div>
          <div className="field"><label>Comandi</label><div className="cal-buttons"><button className="btn small" type="button" onClick={save}>Salva template</button><button className="btn small secondary" type="button" onClick={reset}>Reset</button><button className="btn small secondary" type="button" onClick={exportJson}>Esporta</button></div></div>
          <div className="notice">V5.9: per più template sullo stesso telefono usa formato telefono__template, esempio iphone_17px__ced, iphone_17px__postazione, iphone_17px__dominio. Trascina il riquadro dal centro. Prendi un angolo per cambiare larghezza/altezza. Il salvataggio è automatico. Il bordo tratteggiato indica il content frame usato per non perdere coordinate tra immagini.</div>
        </div>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="grid calibration-layout top-gap">
        <div className="card">
          <h2>Overlay puntamento</h2>
          {!imageUrl && <div className="notice">Carica uno screenshot CED o profilo per vedere i riquadri sopra l'immagine.</div>}
          {imageUrl && (
            <div className="cal-image-wrap" ref={wrapRef}>
              <img src={imageUrl} alt="Calibrazione OCR" draggable={false} />
              <div className="cal-content-frame" style={frameToStyle(contentFrame)} title={`Content frame: ${contentFrame.reason}`} />
              {regions.map((region) => (
                <div
                  key={region.name}
                  className={`cal-rect ${region.name === selectedName ? 'active' : ''} ${region.name.startsWith('RED') || region.name.includes('RED') ? 'red' : region.name.startsWith('BLUE') || region.name.includes('BLUE') ? 'blue' : ''}`}
                  style={regionToImageStyle(region, contentFrame)}
                  onPointerDown={(e) => startDrag(e, region, 'move')}
                  onClick={() => setSelectedName(region.name)}
                  title={region.name}
                >
                  <span>{region.label || region.name}</span>
                  {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => <i key={handle} className={`cal-handle ${handle}`} onPointerDown={(e) => startDrag(e, region, 'resize', handle)} />)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Riquadro selezionato</h2>
          <div className="field"><label>Campo</label><select className="select" value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>{groups.map((group) => <optgroup key={group} label={group}>{regions.filter((r) => (r.group || 'Altro') === group).map((r) => <option key={r.name} value={r.name}>{r.label || r.name}</option>)}</optgroup>)}</select></div>
          {selected && <>
            <div className="grid grid-4 top-gap">{(['x', 'y', 'w', 'h'] as const).map((key) => <div className="field" key={key}><label>{key.toUpperCase()}</label><input className="input mini" value={selected[key].toFixed(4)} onChange={(e) => updateSelected({ [key]: Number(e.target.value) } as Partial<CalibratedRegion>)} /></div>)}</div>
            <small className="muted">Per punteggio CED: Score Blue deve coprire solo il numero blu; Score Red solo il numero rosso. Match Datetime deve coprire solo la riga data/ora. Mode Map solo modalità + mappa. Per profilo: i campi Leggendario MG/BR/DMZ/Zombie devono coprire solo il numero accanto al simbolo, non l'icona.</small>
          </>}
          <details className="top-gap"><summary>Importa / esporta JSON template</summary><textarea className="textarea" value={jsonBox} onChange={(e) => setJsonBox(e.target.value)} placeholder="Incolla qui JSON template" /><div className="cal-buttons top-gap"><button className="btn small" type="button" onClick={importJson}>Importa JSON</button><button className="btn small secondary" type="button" onClick={exportJson}>Genera JSON</button></div></details>
        </div>
      </section>
    </main>
  );
}
