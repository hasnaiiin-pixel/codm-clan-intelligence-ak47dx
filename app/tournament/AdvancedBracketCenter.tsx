'use client';

import {useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {autoCapacity,buildAdvancedBracket,resolveBracket,validateBracketResult,roundName,BracketPlan,BracketResult,BracketTeam,BracketMatch} from '@/lib/advancedBracket';
import {CODM_MULTIPLAYER_MAPS,CODM_WEAPONS,eligibleWeapons,randomFrom} from '@/lib/codmTournamentCatalog';

type Props={tournamentId:string;participants:Array<{id:string;name:string}>;canWrite:boolean;rules:Record<string,any>;legacyMatchCount:number;eligible:boolean;teamLabel?:(name:string)=>string;onSaved:(rules:Record<string,any>)=>void};
type Assignment={mode:string;map:string;weapon:string;category:string;scoreLimit:number;bo3Maps?:string[];bo3Weapons?:Array<{category:string;weapon:string}>;at?:string};
type BracketConfig={capacityMode:'auto'|'manual';manualCapacity:number;seedMode:'ranking'|'shuffle';modes:string[];mapModePool:Record<string,string[]>;weapons:Record<string,string[]>;customMaps:string[];customWeapons:Record<string,string[]>};
type SavedBracket={version:2;revision:number;plan:BracketPlan;results:Record<string,BracketResult>;assignments:Record<string,Assignment>;config:BracketConfig};
const MODES:Record<string,string>={CED:'Cerca e Distruggi',POSTAZIONE:'Postazione',DOMINIO:'Dominio',CONTROL:'Controllo',TDM:'Deathmatch a squadre',PRIMA_LINEA:'Prima linea',KILL_CONFIRMED:'Uccisione confermata'};
const defaultModes=['CED','POSTAZIONE','DOMINIO','CONTROL'];
const DEFAULT_LIMITS:Record<string,number>={CED:7,POSTAZIONE:250,DOMINIO:150,CONTROL:3,TDM:50,PRIMA_LINEA:50,KILL_CONFIRMED:40};
const defaultConfig=():BracketConfig=>({capacityMode:'auto',manualCapacity:16,seedMode:'ranking',modes:[...defaultModes],mapModePool:Object.fromEntries(Object.keys(MODES).map(mode=>[mode,[]])),weapons:{},customMaps:[],customWeapons:{}});
function uniqueness<T>(xs:T[]):T[]{return Array.from(new Set(xs));}
function dateDisplay(iso?:string){if(!iso)return 'Da programmare';const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'Da programmare';}
function dateInput(iso?:string){if(!iso)return '';const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';const pad=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function matchCount(n:number){return {w:n-1,l:n-3,total:2*n-3};}
function makeAssignments(plan:BracketPlan,config:BracketConfig):Record<string,Assignment>{
  const pool=eligibleWeapons(config.weapons);
  if(!pool.length)throw new Error('Seleziona almeno un’arma consentita.');
  const allowedModes=config.modes.filter(m=>config.mapModePool[m]?.length);
  const finalModes=allowedModes.filter(m=>uniqueness(config.mapModePool[m]||[]).length>=3);
  if(!allowedModes.length)throw new Error('Seleziona una modalità con almeno una mappa compatibile.');
  if(!finalModes.length)throw new Error('Per la Grand Final BO3 servono almeno 3 mappe distinte in una modalità.');
  const result:Record<string,Assignment>={};
  for(const match of plan.matches){
    const mode=randomFrom(match.lane==='GF'?finalModes:allowedModes)!;
    const playable=config.mapModePool[mode];
    const weapon=randomFrom(pool)!;
    const map=randomFrom(playable)!;
    const bo3Maps:string[]=[];
    if(match.lane==='GF'){
      const remaining=uniqueness([...playable]);
      for(let i=0;i<3;i++){
        const chosen=randomFrom(remaining)!;
        bo3Maps.push(chosen);remaining.splice(remaining.indexOf(chosen),1);
      }
    }
    result[match.key]={mode,map:bo3Maps[0]||map,bo3Maps:match.lane==='GF'?bo3Maps:undefined,bo3Weapons:match.bestOf===3?Array.from({length:3},()=>{const w=randomFrom(pool)!;return {category:w.category,weapon:w.name};}):undefined,weapon:weapon.name,category:weapon.category,scoreLimit:match.bestOf===3?2:(DEFAULT_LIMITS[mode]||50)};
  }
  return result;
}
function validateAssignment(a:Assignment,m:BracketMatch,config:BracketConfig){
  if(!a)throw new Error('Partita senza mappa/arma assegnata.');
  if(!Number.isInteger(a.scoreLimit)||a.scoreLimit<1)throw new Error('Limite punteggio non valido.');
  if(!config.modes.includes(a.mode))throw new Error('Modalità non ammessa nel torneo.');
  const allowed=config.mapModePool[a.mode]||[];
  if(!allowed.includes(a.map))throw new Error('Mappa non consentita per la modalità scelta.');
  if(!config.weapons[a.category]?.includes(a.weapon))throw new Error('Arma non consentita dalle regole.');
  if(m.bestOf===3){const maps=a.bo3Maps||[];if(maps.length!==3||new Set(maps).size!==3||maps.some(x=>!allowed.includes(x)))throw new Error('Grand Final BO3: servono tre mappe diverse, compatibili con la modalità.');const weapons=a.bo3Weapons||[];if(weapons.length!==3||weapons.some(w=>!config.weapons[w.category]?.includes(w.weapon)))throw new Error('Grand Final BO3: scegli un’arma valida per ciascuna delle tre partite.');}
}
export default function AdvancedBracketCenter({tournamentId,participants,canWrite,rules,legacyMatchCount,eligible,teamLabel,onSaved}:Props){
  const saved=(rules?.advanced_bracket_v2?.version===2?rules.advanced_bracket_v2:null) as SavedBracket|null;
  const [config,setConfig]=useState<BracketConfig>(()=>saved?.config||defaultConfig());
  const [plan,setPlan]=useState<BracketPlan|null>(saved?.plan||null);
  const [results,setResults]=useState<Record<string,BracketResult>>(saved?.results||{});
  const [assignments,setAssignments]=useState<Record<string,Assignment>>(saved?.assignments||{});
  const [manualSeeds,setManualSeeds]=useState('');
  const [mapMode,setMapMode]=useState('CED');
  const [expandedWeaponCat,setExpandedWeaponCat]=useState('Fucili d’assalto (AR)');
  const [newMap,setNewMap]=useState('');
  const [newWeapon,setNewWeapon]=useState('');
  const [activeLane,setActiveLane]=useState<'W'|'L'|'GF'>('W');
  const [selectedKey,setSelectedKey]=useState('');
  const [entryScores,setEntryScores]=useState({a:'',b:''});
  const [scale,setScale]=useState(100);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    const snap=rules?.advanced_bracket_v2 as SavedBracket|undefined;
    setPlan(snap?.version===2?snap.plan:null);setResults(snap?.version===2?snap.results||{}:{});
    setAssignments(snap?.version===2?snap.assignments||{}:{});setConfig(snap?.version===2?snap.config:defaultConfig());
    setSelectedKey('');setEntryScores({a:'',b:''});setNotice('');
  },[tournamentId]);
  const count=participants.length;
  const minCap=count>=5&&count<=64?autoCapacity(count):8;
  const capacity=config.capacityMode==='auto'?minCap:Math.max(config.manualCapacity,minCap);
  const eligibleCaps=([8,16,32,64] as const).filter(x=>x>=minCap);
  const [previewCap,byeCount]=[capacity,Math.max(0,capacity-count)];
  const state=useMemo(()=>plan?resolveBracket(plan,results):new Map(),[plan,results]);
  const selected=plan?.matches.find(x=>x.key===selectedKey)||null;
  const selectedState=selected?state.get(selected.key):null;
  const assigned=selected?assignments[selected.key]:undefined;
  const allMaps=uniqueness([...CODM_MULTIPLAYER_MAPS,...config.customMaps]);
  const allWeapons=Object.fromEntries(Object.entries(CODM_WEAPONS).map(([c,items])=>[c,uniqueness([...items,...(config.customWeapons[c]||[])])])) as Record<string,string[]>;
  const selectedMaps=allMaps.filter(m=>config.mapModePool[mapMode]?.includes(m));
  const total=plan?matchCount(plan.teams.length):matchCount(Math.max(5,Math.min(count,64)));
  const nameFor=(id:string|null|undefined)=>{if(!id)return 'Da definire';const name=plan?.teams.find(t=>t.id===id)?.name||id;return teamLabel?teamLabel(name):name;};
  const invalidTeamCount=new Set(participants.map(t=>t.id)).size!==count;

  function setModeMaps(mode:string,maps:string[]){setConfig(c=>({...c,mapModePool:{...c.mapModePool,[mode]:uniqueness(maps)}}));}
  function assignMatch(patch:Partial<Assignment>){if(!selected)return;setAssignments(a=>({...a,[selected.key]:{...a[selected.key],...patch}}));}
  function generate(){
    try{
      if(!canWrite)throw new Error('Solo lo staff può generare il tabellone.');
      if(plan)throw new Error('Un tabellone è già stato generato. Crea un nuovo torneo per cambiarlo senza perdere i risultati.');
      if(legacyMatchCount)throw new Error('Questo torneo contiene incontri nel formato precedente. Crea un nuovo torneo per il bracket 64, così non alteri lo storico.');
      if(!eligible)throw new Error('Completa prima i gironi e il ripescaggio (oppure scegli nessun ripescaggio).');
      if(invalidTeamCount)throw new Error('Ci sono squadre duplicate negli iscritti.');
      if(config.capacityMode==='manual'&&(![8,16,32,64].includes(capacity)||capacity<minCap))throw new Error('Il formato scelto è troppo piccolo.');
      let arranged=[...participants];
      if(config.seedMode==='ranking'){
        if(manualSeeds.trim()){
          const entered=manualSeeds.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
          const names=participants.map(p=>p.name);
          if(entered.length!==count||new Set(entered).size!==count||entered.some(x=>!names.includes(x)))throw new Error('Teste di serie: inserisci una sola volta tutti i nomi esatti delle squadre.');
          arranged=entered.map(n=>participants.find(p=>p.name===n)!);
        }
      }else for(let i=arranged.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arranged[i],arranged[j]]=[arranged[j],arranged[i]];}
      const teams:BracketTeam[]=arranged.map((t,i)=>({...t,seed:i+1}));
      const built=buildAdvancedBracket(teams,capacity);
      const assigned=makeAssignments(built,config);
      setPlan(built);setAssignments(assigned);setResults({});setActiveLane('W');setSelectedKey('');
      setNotice(`Anteprima pronta: ${built.matches.length} serie, ${built.byes} BYE senza partite fittizie. Premi Salva per registrare il torneo.`);
    }catch(e:any){setNotice(`Errore: ${e?.message||String(e)}`);}
  }
  async function save(updatedResults=results,updatedAssignments=assignments):Promise<boolean>{
    if(!plan||!canWrite||busy||!tournamentId)return false;
    try{
      setBusy(true);
      for(const match of plan.matches)validateAssignment(updatedAssignments[match.key],match,config);
      const {data,error:readError}=await supabase.from('codm_tournaments').select('rules').eq('id',tournamentId).single();
      if(readError)throw readError;
      const freshRules=(data?.rules&&typeof data.rules==='object'?data.rules:{}) as Record<string,any>;
      const revision=Number(freshRules.advanced_bracket_v2?.revision||0);
      const expected=Number(saved?.revision||0);
      if(revision!==expected)throw new Error('Il tabellone è stato modificato da un altro dispositivo. Ricarica la pagina prima di salvare.');
      const snapshot:SavedBracket={version:2,revision:revision+1,plan,results:updatedResults,assignments:updatedAssignments,config};
      const next={...freshRules,advanced_bracket_v2:snapshot};
      const {error}=await supabase.from('codm_tournaments').update({rules:next}).eq('id',tournamentId);
      if(error)throw error;
      onSaved(next);
      setNotice('Tabellone salvato su Supabase. Nessuna partita dei tornei precedenti è stata modificata.');
      return true;
    }catch(e:any){setNotice(`Salvataggio non riuscito: ${e?.message||String(e)}`);return false;}finally{setBusy(false);}
  }
  async function saveScore(){
    if(!plan||!selected)return;
    try{
      const a=Number(entryScores.a),b=Number(entryScores.b);
      if(entryScores.a.trim()===''||entryScores.b.trim()==='')throw new Error('Inserisci entrambi i punteggi.');
      validateBracketResult(plan,results,selected.key,a,b);
      if(selected.bestOf===1&&(a>assigned!.scoreLimit||b>assigned!.scoreLimit))throw new Error(`Punteggio superiore al limite ${assigned!.scoreLimit} della modalità.`);
      const next={...results,[selected.key]:{scoreA:a,scoreB:b}};
      if(await save(next)){setResults(next);setEntryScores({a:String(a),b:String(b)});}
    }catch(e:any){setNotice(`Risultato non salvato: ${e?.message||String(e)}`);}
  }
  async function clearScore(){
    if(!plan||!selected)return;
    try{
      const already=results[selected.key];if(!already)return;
      const rest={...results};delete rest[selected.key];
      const probe=resolveBracket(plan,rest);
      if(plan.matches.some(m=>rest[m.key]&&!probe.get(m.key)?.teamA))throw new Error('Cancella prima i risultati dei turni successivi.');
      if(plan.matches.some(m=>rest[m.key]&&!probe.get(m.key)?.teamB))throw new Error('Cancella prima i risultati dei turni successivi.');
      if(await save(rest)){setResults(rest);setEntryScores({a:'',b:''});}
    }catch(e:any){setNotice(`Impossibile cancellare: ${e?.message||String(e)}`);}
  }
  function selectMatch(m:BracketMatch){setSelectedKey(m.key);const score=results[m.key];setEntryScores({a:score?String(score.scoreA):'',b:score?String(score.scoreB):''});}
  function reassignAll(){
    if(!plan||Object.keys(results).length) return setNotice('Il nuovo sorteggio di mappe/armi è consentito solo prima dei risultati.');
    try{setAssignments(makeAssignments(plan,config));setNotice('Nuove assegnazioni generate. Premi Salva per confermare.');}catch(e:any){setNotice(e.message)}
  }
  return <section className="card top-gap ak-bracket64">
    <div className="section-title"><div><h2>🏆 Tabelloni 8–64 · Doppia eliminazione modificata</h2><p className="muted">Winners blu, Losers arancione e Grand Final BO3 dorata. Il perdente della Finale Winners è eliminato; nessun bracket reset.</p></div></div>
    {notice&&<p className="notice" role="status">{notice}</p>}
    {!plan&&<>
      <div className="grid grid-3 top-gap">
        <div className="field"><label>Turno iniziale</label><select className="select" value={config.capacityMode} onChange={(e:{target:{value:string}})=>setConfig(c=>({...c,capacityMode:e.target.value as 'auto'|'manual',manualCapacity:Math.max(c.manualCapacity,minCap)}))}><option value="auto">Automatico</option><option value="manual">Manuale</option></select></div>
        <div className="field"><label>Tabellone ({count} squadre)</label><select className="select" disabled={config.capacityMode==='auto'} value={config.capacityMode==='auto'?minCap:config.manualCapacity} onChange={(e:{target:{value:string}})=>setConfig(c=>({...c,manualCapacity:Number(e.target.value)}))}>{eligibleCaps.map(n=><option key={n} value={n}>{roundName(n)} · {n} posti</option>)}</select></div>
        <div className="field"><label>Teste di serie</label><select className="select" value={config.seedMode} onChange={(e:{target:{value:string}})=>setConfig(c=>({...c,seedMode:e.target.value as 'ranking'|'shuffle'}))}><option value="ranking">Manuale / ordine squadre</option><option value="shuffle">Casuale</option></select></div>
      </div>
      {config.seedMode==='ranking'&&<div className="field"><label>Ordine teste di serie (facoltativo: una squadra per riga, prima = testa di serie 1)</label><textarea className="textarea" rows={3} value={manualSeeds} onChange={(e:{target:{value:string}})=>setManualSeeds(e.target.value)} placeholder={participants.slice(0,3).map(p=>p.name).join('\n')}/></div>}
      <div className="ak64-metrics"><span><b>{count}</b> squadre</span><span><b>{previewCap}</b> posti</span><span><b>{byeCount}</b> BYE</span><span><b>{total.w}</b> Winners</span><span><b>{total.l}</b> Losers</span><span><b>{total.total}</b> serie + gruppi esclusi</span></div>
    </>}
    <h3 className="top-gap">🗺️ Mappe CODM · Catalogo completo ({allMaps.length})</h3>
    <p className="muted">Catalogo esteso modificabile. <b>Selezione per modalità:</b> indica quelle effettivamente compatibili con ciascuna modalità e con la lobby del torneo, perché alcune dipendono dalla playlist.</p>
    <div className="ak64-filter-line">{Object.entries(MODES).map(([id,label])=><label key={id}><input type="checkbox" checked={config.modes.includes(id)} disabled={!!plan&&Object.keys(results).length>0} onChange={()=>setConfig(c=>({...c,modes:c.modes.includes(id)?c.modes.filter(x=>x!==id):[...c.modes,id]}))}/>{label}</label>)}</div>
    <div className="field"><label>Mappe da utilizzare per questa modalità</label><select className="select" value={mapMode} onChange={(e:{target:{value:string}})=>setMapMode(e.target.value)}>{Object.entries(MODES).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></div>
    <div className="cal-buttons"><button className="btn small secondary" type="button" onClick={()=>setModeMaps(mapMode,allMaps)}>Seleziona tutte le mappe ({allMaps.length})</button><button className="btn small secondary" type="button" onClick={()=>setModeMaps(mapMode,[])}>Nessuna mappa</button><span className="muted">{selectedMaps.length} abilitate per questa modalità</span></div>
    <div className="ak64-map-scroll">{allMaps.map(map=><label key={map}><input type="checkbox" checked={selectedMaps.includes(map)} onChange={()=>setModeMaps(mapMode,selectedMaps.includes(map)?selectedMaps.filter(x=>x!==map):[...selectedMaps,map])}/>{map}</label>)}</div>
    <div className="ak64-add"><input className="input" value={newMap} onChange={(e:{target:{value:string}})=>setNewMap(e.target.value)} placeholder="Aggiungi mappa assente dal catalogo"/><button className="btn small secondary" type="button" onClick={()=>{const x=newMap.trim();if(!x)return;setConfig(c=>({...c,customMaps:uniqueness([...c.customMaps,x]),mapModePool:{...c.mapModePool,[mapMode]:uniqueness([...(c.mapModePool[mapMode]||[]),x])}}));setNewMap('');}}>+ Mappa</button></div>
    <h3 className="top-gap">🔫 Torneo delle armi: categorie e sorteggio ({eligibleWeapons(config.weapons).length} consentite)</h3>
    <p className="muted">Scegli prima la categoria, poi le singole armi consentite. Nessuna arma è preselezionata; il sorteggio utilizza esclusivamente quelle abilitate.</p>
    <div className="field"><label>Categoria</label><select className="select" value={expandedWeaponCat} onChange={(e:{target:{value:string}})=>setExpandedWeaponCat(e.target.value)}>{Object.keys(allWeapons).map(c=><option key={c}>{c}</option>)}</select></div>
    <div className="cal-buttons"><button type="button" className="btn small secondary" onClick={()=>setConfig(c=>({...c,weapons:{...c.weapons,[expandedWeaponCat]:[...(allWeapons[expandedWeaponCat]||[])]}}))}>Seleziona tutta la categoria</button><button className="btn small secondary" type="button" onClick={()=>setConfig(c=>({...c,weapons:{...c.weapons,[expandedWeaponCat]:[]}}))}>Deseleziona categoria</button></div>
    <div className="ak64-map-scroll">{(allWeapons[expandedWeaponCat]||[]).map(w=><label key={w}><input type="checkbox" checked={(config.weapons[expandedWeaponCat]||[]).includes(w)} onChange={()=>setConfig(c=>({...c,weapons:{...c.weapons,[expandedWeaponCat]:(c.weapons[expandedWeaponCat]||[]).includes(w)?c.weapons[expandedWeaponCat].filter(x=>x!==w):[...(c.weapons[expandedWeaponCat]||[]),w]}}))}/>{w}</label>)}</div>
    <div className="ak64-add"><input className="input" placeholder="Nuova arma in questa categoria" value={newWeapon} onChange={(e:{target:{value:string}})=>setNewWeapon(e.target.value)}/><button className="btn small secondary" type="button" onClick={()=>{const w=newWeapon.trim();if(!w)return;setConfig(c=>({...c,customWeapons:{...c.customWeapons,[expandedWeaponCat]:uniqueness([...(c.customWeapons[expandedWeaponCat]||[]),w])},weapons:{...c.weapons,[expandedWeaponCat]:uniqueness([...(c.weapons[expandedWeaponCat]||[]),w])}}));setNewWeapon('');}}>+ Arma</button></div>
    {saved&&<p className="notice">Per rigenerare il torneo da zero mantenendo gli iscritti, apri <b>Crea / Gestisci → Rigenera torneo da iscritti</b>. I risultati originali rimangono nell’edizione precedente.</p>}
    {!plan&&<div className="cal-buttons top-gap"><button className="btn" disabled={!canWrite||!eligible||count<5||count>64||legacyMatchCount>0||invalidTeamCount} onClick={generate}>⚡ Genera anteprima Winners + Losers + BO3</button>{legacyMatchCount>0&&<p className="muted">Per proteggere gli incontri esistenti, crea un nuovo torneo per utilizzare questo formato.</p>}</div>}
    {plan&&<>
      <div className="ak64-metrics top-gap"><span><b>{plan.teams.length}</b> squadre</span><span><b>{roundName(plan.capacity)}</b> inizio</span><span><b>{plan.byes}</b> BYE</span><span><b>{plan.matches.length}</b> serie effettive</span><span><b>1</b> Grand Final BO3</span></div>
      {!saved&&canWrite&&Object.keys(results).length===0&&<div className="cal-buttons"><button className="btn small secondary" type="button" disabled={busy} onClick={()=>{setPlan(null);setAssignments({});setResults({});setSelectedKey('');setNotice('Anteprima annullata: puoi cambiare turno iniziale, teste di serie e regole, poi generare nuovamente.');}}>↩️ Modifica formato / Rigenera anteprima</button></div>}
      {state.get('GF-BO3')?.winner&&<div className="ak64-champion"><b>🏆 Campione del torneo: {nameFor(state.get('GF-BO3')?.winner)}</b><span>Grand Final BO3 confermata · nessun bracket reset</span></div>}
      <div className="cal-buttons top-gap"><button className="btn small secondary" disabled={!canWrite||busy||Object.keys(results).length>0} onClick={reassignAll}>🎲 Riassegna mappe e armi</button><button className="btn" disabled={!canWrite||busy} onClick={()=>void save()}>💾 {busy?'Salvataggio...':'Salva tabellone e configurazione'}</button></div>
      <div className="ak64-switch top-gap">{(['W','L','GF'] as const).map(lane=><button key={lane} className={`btn small ${activeLane===lane?'':'secondary'}`} onClick={()=>setActiveLane(lane)}>{lane==='W'?'🔵 Winners':lane==='L'?'🟠 Losers':'🏆 Grand Final'}</button>)}<label>Zoom <select className="select" value={scale} onChange={(e:{target:{value:string}})=>setScale(Number(e.target.value))}>{[75,100,125,150].map(n=><option value={n} key={n}>{n}%</option>)}</select></label></div>
      <div className={`ak64-board lane-${activeLane.toLowerCase()}`}><div className="ak64-board-inner" style={{fontSize:`${scale}%`}}>{Array.from(new Set(plan.matches.filter(m=>m.lane===activeLane).map(m=>m.round))).map(round=><div className="ak64-column" key={round}><h3>{plan.matches.find(m=>m.lane===activeLane&&m.round===round)?.name}</h3>{plan.matches.filter(m=>m.lane===activeLane&&m.round===round).map(m=>{const resolved=state.get(m.key)!;const metadata=assignments[m.key];return <button type="button" key={m.key} className={`ak64-match ${selectedKey===m.key?'selected':''}`} onClick={()=>selectMatch(m)}><small>{m.key}{m.bestOf===3?' · BO3':''}</small><div className={resolved.winner&&resolved.winner===resolved.teamA?'ak64-winning':resolved.loser===resolved.teamA?'ak64-losing':''}>{nameFor(resolved.teamA)} <b>{results[m.key]?.scoreA??'–'}</b></div><div className={resolved.winner&&resolved.winner===resolved.teamB?'ak64-winning':resolved.loser===resolved.teamB?'ak64-losing':''}>{nameFor(resolved.teamB)} <b>{results[m.key]?.scoreB??'–'}</b></div><small>{metadata?.mode||'—'} · {metadata?.map||'—'} · {metadata?.weapon||'—'}</small><small>{dateDisplay(metadata?.at)}</small><small className="ak64-destination">✓ {m.winnerTo||'Campione'} · × {m.loserTo||(m.lane==='W'&&m.name==='Finale Winners'?'Eliminata':'Fuori dal torneo')}</small></button>})}</div>)}</div></div>
      <p className="muted">Le teste di serie con BYE avanzano senza risultato e senza partite fittizie. Clicca una partita per registrare punteggio, calendario, mappa e arma.</p>
      {selected&&assigned&&<div className="ak64-editor"><h3>🎮 {selected.name} — {selected.key}</h3><p><b>{nameFor(selectedState?.teamA)}</b> VS <b>{nameFor(selectedState?.teamB)}</b></p><div className="grid grid-3"><div className="field"><label>Modalità</label><select className="select" value={assigned.mode} onChange={(e:{target:{value:string}})=>{const mode=e.target.value;const maps=config.mapModePool[mode]||[];assignMatch({mode,map:maps[0]||'',scoreLimit:selected.bestOf===3?2:DEFAULT_LIMITS[mode]||50,bo3Maps:selected.bestOf===3?maps.slice(0,3):undefined});}}>{config.modes.map(id=><option key={id} value={id}>{MODES[id]}</option>)}</select></div><div className="field"><label>Mappa</label><select className="select" value={assigned.map} onChange={(e:{target:{value:string}})=>assignMatch({map:e.target.value,bo3Maps:selected.bestOf===3?[e.target.value,...(assigned.bo3Maps||[]).slice(1)]:undefined})}>{(config.mapModePool[assigned.mode]||[]).map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>Arma sorteggiata / scelta</label><select className="select" value={`${assigned.category}::${assigned.weapon}`} onChange={(e:{target:{value:string}})=>{const i=e.target.value.indexOf('::');assignMatch({category:e.target.value.slice(0,i),weapon:e.target.value.slice(i+2)});}}>{eligibleWeapons(config.weapons).map(w=><option key={w.category+w.name} value={`${w.category}::${w.name}`}>{w.category} — {w.name}</option>)}</select></div><div className="field"><label>Limite punteggio / round</label><input className="input" type="number" min="1" max="9999" disabled={selected.bestOf===3} value={assigned.scoreLimit} onChange={(e:{target:{value:string}})=>assignMatch({scoreLimit:Math.max(1,Number(e.target.value)||1)})}/></div></div>
      {selected.bestOf===3&&<div className="grid grid-3">{[0,1,2].map(i=><div className="field" key={i}><label>Grand Final · Partita {i+1} · Mappa</label><select className="select" value={assigned.bo3Maps?.[i]||''} onChange={(e:{target:{value:string}})=>{const maps=[...(assigned.bo3Maps||[])];maps[i]=e.target.value;assignMatch({bo3Maps:maps,map:maps[0]||''});}}>{(config.mapModePool[assigned.mode]||[]).map(m=><option key={m}>{m}</option>)}</select><label>Arma partita {i+1}</label><select className="select" value={`${assigned.bo3Weapons?.[i]?.category||''}::${assigned.bo3Weapons?.[i]?.weapon||''}`} onChange={(e:{target:{value:string}})=>{const j=e.target.value.indexOf('::');const weapons=[...(assigned.bo3Weapons||[])];weapons[i]={category:e.target.value.slice(0,j),weapon:e.target.value.slice(j+2)};assignMatch({bo3Weapons:weapons});}}>{eligibleWeapons(config.weapons).map(w=><option key={w.category+w.name} value={`${w.category}::${w.name}`}>{w.category} — {w.name}</option>)}</select></div>)}</div>}
      <div className="grid grid-3"><div className="field"><label>Giorno e ora</label><input className="input" type="datetime-local" value={dateInput(assigned.at)} onChange={(e:{target:{value:string}})=>assignMatch({at:e.target.value?new Date(e.target.value).toISOString():''})}/></div><div className="field"><label>Punti / round A</label><input className="input" inputMode="numeric" type="number" min="0" max={selected.bestOf===3?2:9999} value={entryScores.a} onChange={(e:{target:{value:string}})=>setEntryScores(s=>({...s,a:e.target.value}))}/></div><div className="field"><label>Punti / round B</label><input className="input" inputMode="numeric" type="number" min="0" max={selected.bestOf===3?2:9999} value={entryScores.b} onChange={(e:{target:{value:string}})=>setEntryScores(s=>({...s,b:e.target.value}))}/></div></div>
      <div className="cal-buttons"><button className="btn small" disabled={!canWrite||busy||!selectedState?.teamA||!selectedState?.teamB} onClick={()=>void saveScore()}>💾 Conferma risultato</button><button className="btn small danger" disabled={!canWrite||busy||!results[selected.key]} onClick={()=>void clearScore()}>Cancella risultato</button><button className="btn small secondary" disabled={!canWrite||busy} onClick={()=>void save()}>Salva mappa / arma / orario</button></div></div>}
      <h3 className="top-gap">📅 Calendario del nuovo tabellone</h3>
      <div className="table-scroll"><table className="table compact"><thead><tr><th>Quando</th><th>Fase</th><th>Squadre (giocatori)</th><th>Modalità / Mappa</th><th>Arma</th><th>Risultato</th></tr></thead><tbody>{[...plan.matches].sort((a,b)=>String(assignments[a.key]?.at||'9999').localeCompare(String(assignments[b.key]?.at||'9999'))).map(m=><tr key={m.key}><td>{dateDisplay(assignments[m.key]?.at)}</td><td>{m.name}</td><td>{nameFor(state.get(m.key)?.teamA)} VS {nameFor(state.get(m.key)?.teamB)}</td><td>{assignments[m.key]?.mode} · {m.bestOf===3?(assignments[m.key]?.bo3Maps||[]).join(' / '):assignments[m.key]?.map}</td><td>{m.bestOf===3?(assignments[m.key]?.bo3Weapons||[]).map(x=>x.weapon).join(' / '):assignments[m.key]?.weapon}</td><td>{results[m.key]?`${results[m.key].scoreA}–${results[m.key].scoreB}`:'–'}</td></tr>)}</tbody></table></div>
      <h3 className="top-gap">Percorso vincitori e perdenti</h3><div className="table-scroll"><table className="table compact"><thead><tr><th>Tabellone</th><th>Incontro</th><th>Vincente →</th><th>Perdente →</th><th>Stato</th></tr></thead><tbody>{plan.matches.map(m=><tr key={m.key}><td>{m.lane}</td><td>{m.key} · {m.name}</td><td>{m.winnerTo||'Campione'}</td><td>{m.loserTo||(m.lane==='W'&&m.name==='Finale Winners'?'Eliminata':'Fine percorso')}</td><td>{state.get(m.key)?.completed?'✓ Completato':'In attesa'}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
