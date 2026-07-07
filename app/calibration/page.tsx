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
  { value: 'scoreboard_ced', label: 'Scoreboard CED', help: 'Risultato partita, data, mappa/modalità, Nick e K/D/A. Punteggio player, impatto e vittoria sono esclusi.' },
  { value: 'profile_base', label: 'Profilo base', help: 'Nickname, livello, UID, like e rank nel profilo base.' }
];

function pct(value: number) { return `${(value * 100).toFixed(2)}%`; }
function slug(value: string) { return (value || 'default').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'default'; }
function softSlug(value: string) { return String(value || '').trim().replace(/\s+/g, ' ').replace(/__/g, '_').slice(0, 90); }

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
  const [templateSource, setTemplateSource] = useState<'default' | 'phone' | 'saved'>('default');
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
  const [regionSearch, setRegionSearch] = useState('');
  const [regionGroupFilter, setRegionGroupFilter] = useState('Tutti');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);

  const selected = regions.find((region) => region.name === selectedName) || regions[0];
  const groups = useMemo(() => Array.from(new Set(regions.map((region) => region.group || 'Altro'))), [regions]);
  const filteredRegions = useMemo(() => {
    const query = regionSearch.trim().toLowerCase();
    return regions.filter((region) => {
      const groupOk = regionGroupFilter === 'Tutti' || (region.group || 'Altro') === regionGroupFilter;
      const text = `${region.name} ${region.label || ''} ${region.group || ''}`.toLowerCase();
      return groupOk && (!query || text.includes(query));
    });
  }, [regions, regionGroupFilter, regionSearch]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      const name = user?.user_metadata?.display_name || user?.email || '';
      setOwnerName(String(name || ''));
      setActiveUserContext(user?.id || 'anonymous', String(name || ''));
      const activePhone = getActivePhoneProfile(kind);
      const split = splitCalibrationProfileKey(activePhone);
      const normalizedProfile = makeCalibrationProfileKey('default', split.template || 'default');
      setPhoneProfile(normalizedProfile);
      setPhoneDevice('default');
      setTemplateSlot(split.template || 'default');
      setTemplateSource((split.template || 'default') === 'default' ? 'default' : 'saved');
      const bundle = loadCalibrationBundle(kind, normalizedProfile);
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
    const normalizedProfile = makeCalibrationProfileKey('default', split.template || 'default');
    setPhoneProfile(normalizedProfile);
    setPhoneDevice('default');
    setTemplateSlot(split.template || 'default');
    setTemplateSource((split.template || 'default') === 'default' ? 'default' : 'saved');
    setActivePhoneProfile(nextKind, normalizedProfile);
    const bundle = loadCalibrationBundle(nextKind, normalizedProfile);
    setRegions(bundle.regions);
    setTemplateName(bundle.meta.templateName);
    setSelectedName(bundle.regions[0]?.name || '');
    setProfiles(listCalibrationPhoneProfiles(nextKind));
    setPhoneOptions(listCalibrationPhones(nextKind));
    setTemplateOptions(listCalibrationTemplatesForPhone(nextKind, 'default'));
    setMessage(`Template ${nextKind} / telefono ${split.phone} / template ${split.template} caricato. Puoi trascinare i riquadri o ridimensionarli dagli angoli.`);
  }

  function changeKind(nextKind: CalibrationKind) { loadTemplate(nextKind, getActivePhoneProfile(nextKind)); }
  function applyTemplateSource(nextSource: 'default' | 'phone' | 'saved') {
    setTemplateSource(nextSource);
    if (nextSource === 'default') {
      loadTemplate(kind, makeCalibrationProfileKey('default', 'default'));
      return;
    }
    const phone = softSlug(phoneDevice) || '';
    if (!phone) {
      setPhoneDevice('');
      setMessage('Tipologia telefono vuota: puoi lasciarla vuota mentre prepari il nome, oppure scegliere default/telefono/template salvato.');
      return;
    }
    loadTemplate(kind, makeCalibrationProfileKey(phone, nextSource === 'saved' ? (softSlug(templateSlot) || 'default') : 'default'));
  }
  function changePhone(nextPhoneRaw: string) { if (softSlug(nextPhoneRaw)) loadTemplate(kind, softSlug(nextPhoneRaw)); }
  function changePhoneDevice(nextPhoneRaw: string) {
    const nextPhone = softSlug(nextPhoneRaw);
    if (!nextPhone) {
      setPhoneDevice('');
      setTemplateOptions(['default']);
      setMessage('Tipologia telefono cancellata. Non viene più riscritta default automaticamente; scegli Default o scrivi una tipologia telefono quando vuoi caricare/salvare.');
      return;
    }
    const templates = listCalibrationTemplatesForPhone(kind, nextPhone);
    const nextTemplate = templateSource === 'saved' && templates.includes(templateSlot) ? templateSlot : 'default';
    loadTemplate(kind, makeCalibrationProfileKey(nextPhone, nextTemplate));
  }
  function changeTemplateSlot(nextTemplateRaw: string) {
    const nextTemplate = softSlug(nextTemplateRaw) || 'default';
    setTemplateSlot(nextTemplate);
    loadTemplate(kind, makeCalibrationProfileKey('default', nextTemplate));
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
    setMessage(`Nuovo template ${next}. Regola i riquadri e premi Salva template.`);
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
  function nudgeSelected(dx = 0, dy = 0, dw = 0, dh = 0) {
    if (!selected) return;
    updateRegionByName(selected.name, { x: selected.x + dx, y: selected.y + dy, w: selected.w + dw, h: selected.h + dh }, true);
  }

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
    const cleanTemplateName = softSlug(templateSlot) || 'default';
    const nextProfile = makeCalibrationProfileKey('default', cleanTemplateName);
    setPhoneProfile(nextProfile);
    setPhoneDevice('default');
    setTemplateSlot(cleanTemplateName);
    setTemplateSource(cleanTemplateName === 'default' ? 'default' : 'saved');
    setActivePhoneProfile(kind, nextProfile);
    saveCalibration(kind, regions, nextProfile, cleanTemplateName, ownerName);
    setProfiles(listCalibrationPhoneProfiles(kind));
    setPhoneOptions(['default']);
    setTemplateOptions(Array.from(new Set(['default', ...listCalibrationTemplatesForPhone(kind, 'default'), cleanTemplateName])).sort());
    setMessage(`Template salvato correttamente: ${cleanTemplateName}. In Import selezioni solo questo nome template.`);
  }
  function reset() {
    resetCalibration(kind, phoneProfile);
    const defaults = defaultCalibration(kind);
    setRegions(defaults);
    setSelectedName(defaults[0]?.name || '');
    setMessage('Template riportato ai valori di fabbrica.');
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
        <div className="grid grid-2 calibration-template-flow">
          <div className="field"><label>Tipo template</label><select className="select" value={kind} onChange={(e) => changeKind(e.target.value as CalibrationKind)}>{kinds.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select><small className="muted">{kinds.find((e) => e.value === kind)?.help}</small></div>
          <div className="field"><label>Nome template</label><div className="cal-template-picker-stack single-template-picker"><input className="input" list="cal-template-options" value={templateSlot} onChange={(e) => setTemplateSlot(e.target.value)} placeholder="default oppure nome template" /><datalist id="cal-template-options"><option value="default" />{templateOptions.filter((p) => p !== 'default').map((p) => <option key={p} value={p} />)}</datalist><button className="btn small secondary" type="button" onClick={() => changeTemplateSlot(templateSlot || 'default')}>Carica template</button></div><small className="muted">Un solo nome template: puoi scrivere maiuscole, spazi e simboli. Premi Salva template per memorizzarlo; poi lo selezioni da Import.</small></div>
        </div>
        <div className="grid grid-2 top-gap">
          <div className="field"><label>Login/profilo collegato</label><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome login" /><small className="muted">Chiave tecnica: {phoneProfile}</small></div>
          <div className="notice"><b>Flusso template semplificato:</b> usi default oppure un solo nome template selezionabile. Non c'è più doppio nome telefono/template.</div>
        </div>
        <div className="grid grid-3 top-gap">
          <div className="field"><label>Screenshot campione</label><input className="input" type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0] || null)} /></div>
          <div className="field"><label>Comandi</label><div className="cal-buttons"><button className="btn small" type="button" onClick={save}>Salva template</button><button className="btn small secondary" type="button" onClick={reset}>Reset</button><button className="btn small secondary" type="button" onClick={exportJson}>Esporta</button></div></div>
          <div className="notice">V8.2F: risultato partita alto ripristinato in Import; comandi touch PWA e template non resta più bloccato su default.</div>
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
              {filteredRegions.map((region) => (
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
          <div className="grid grid-2">
            <div className="field"><label>Filtro gruppo</label><select className="select" value={regionGroupFilter} onChange={(e) => setRegionGroupFilter(e.target.value)}><option value="Tutti">Tutti</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></div>
            <div className="field"><label>Cerca riquadro</label><div className="input-clear-row"><input className="input" value={regionSearch} onChange={(e) => setRegionSearch(e.target.value)} placeholder="BLUE_R1_NICK" /><button className="btn small secondary" type="button" onClick={() => setRegionSearch('')}>X</button></div></div>
          </div>
          <div className="cal-chip-row top-gap"><button className="btn small secondary" type="button" onClick={() => { setRegionGroupFilter('Tutti'); setRegionSearch(''); }}>Tutti</button>{groups.map((group) => <button key={group} className="btn small secondary" type="button" onClick={() => setRegionGroupFilter(group)}>{group}</button>)}</div>
          <div className="field top-gap"><label>Campo</label><select className="select" value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>{groups.map((group) => <optgroup key={group} label={group}>{regions.filter((r) => (r.group || 'Altro') === group).map((r) => <option key={r.name} value={r.name}>{r.label || r.name}</option>)}</optgroup>)}</select></div>
          {selected && <>
            <div className="grid grid-4 top-gap">{(['x', 'y', 'w', 'h'] as const).map((key) => <div className="field" key={key}><label>{key.toUpperCase()}</label><input className="input mini" value={selected[key].toFixed(4)} onChange={(e) => updateSelected({ [key]: Number(e.target.value) } as Partial<CalibratedRegion>)} /></div>)}</div>
            <div className="pwa-cal-nudge-panel top-gap"><b>Comandi touch PWA</b><div className="cal-buttons top-gap"><button className="btn small secondary" type="button" onClick={() => nudgeSelected(0, -0.003)}>↑</button><button className="btn small secondary" type="button" onClick={() => nudgeSelected(-0.003, 0)}>←</button><button className="btn small secondary" type="button" onClick={() => nudgeSelected(0.003, 0)}>→</button><button className="btn small secondary" type="button" onClick={() => nudgeSelected(0, 0.003)}>↓</button><button className="btn small secondary" type="button" onClick={() => nudgeSelected(0, 0, 0.004, 0.004)}>Allarga</button><button className="btn small secondary" type="button" onClick={() => nudgeSelected(0, 0, -0.004, -0.004)}>Riduci</button></div><small className="muted">Da PWA puoi sistemare il riquadro anche senza prendere l'angolo con il dito.</small></div>
            <small className="muted">Per Scoreboard CED: usa risultato partita, data/ora, mappa/modalità, nickname e K/D/A. Vittoria, riquadri grandi team, impatto e punteggio player sono esclusi. Per profilo: i campi Leggendario MG/BR/DMZ/Zombie devono coprire solo il numero accanto al simbolo, non l'icona.</small>
          </>}
          <details className="top-gap"><summary>Importa / esporta JSON template</summary><textarea className="textarea" value={jsonBox} onChange={(e) => setJsonBox(e.target.value)} placeholder="Incolla qui JSON template" /><div className="cal-buttons top-gap"><button className="btn small" type="button" onClick={importJson}>Importa JSON</button><button className="btn small secondary" type="button" onClick={exportJson}>Genera JSON</button></div></details>
        </div>
      </section>
    </main>
  );
}
