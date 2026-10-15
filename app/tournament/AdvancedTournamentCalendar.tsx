'use client';

import {useMemo,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {resolveBracket,validateBracketResult,type BracketPlan,type BracketResult,type BracketSource} from '@/lib/advancedBracket';
import {CODM_MULTIPLAYER_MAPS,CODM_WEAPONS,eligibleWeapons} from '@/lib/codmTournamentCatalog';
import {tournamentMatchCodes,shortDestination} from '@/lib/tournamentMatchCodes';

type Assignment={mode:string;map:string;weapon:string;category:string;scoreLimit:number;at?:string;bo3Maps?:string[];bo3Weapons?:Array<{category:string;weapon:string}>};
type Config={modes:string[];mapModePool:Record<string,string[]>;weapons:Record<string,string[]>;customMaps?:string[];customWeapons?:Record<string,string[]>};
type Snapshot={version:2;revision:number;plan:BracketPlan;results:Record<string,BracketResult>;assignments:Record<string,Assignment>;config:Config};
type Props={snapshot:Snapshot;resolvedSlotNames:Record<string,string>;teamPlayers:(name?:string|null)=>string;onEdit:()=>void;canWrite?:boolean;tournamentId?:string;rules?:Record<string,any>;onSaved?:(rules:Record<string,any>)=>void};
const LANE_NAME:Record<string,string>={W:'WINNERS',L:'LOSERS',GF:'GRAND FINAL'};
const pad=(n:number)=>String(n).padStart(2,'0');
function dateInput(iso?:string){if(!iso)return '';const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function dateLabel(at?:string){if(!at)return 'Da programmare';const d=new Date(at);return Number.isFinite(d.getTime())?d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Da programmare';}
export default function AdvancedTournamentCalendar({snapshot,resolvedSlotNames,teamPlayers,onEdit,canWrite=false,tournamentId,rules,onSaved}:Props){
  const state=useMemo(()=>resolveBracket(snapshot.plan,snapshot.results||{}),[snapshot]);
  const names=new Map(snapshot.plan.teams.map(t=>[t.id,t.name]));
  const shortCodes=tournamentMatchCodes(snapshot.plan);
  const [popupKey,setPopupKey]=useState('');
  const [draft,setDraft]=useState({at:'',mode:'CED',map:'',category:'',weapon:'',scoreLimit:'50',scoreA:'',scoreB:'',bo3Maps:['','',''],bo3Weapons:[{category:'',weapon:''},{category:'',weapon:''},{category:'',weapon:''}]});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const current=snapshot.plan.matches.find(m=>m.key===popupKey);
  const label=(ref:BracketSource,teamId:string|null)=>{
    if(teamId)return resolvedSlotNames[teamId]||names.get(teamId)||teamId;
    return ref.type==='team'?resolvedSlotNames[ref.ref]||names.get(ref.ref)||'In attesa':`${ref.type==='winner'?'Vincente':'Perdente'} ${shortDestination(ref.ref,shortCodes,ref.ref)}`;
  };
  const playerNames=(ref:BracketSource,id:string|null)=>{
    const name=id?(resolvedSlotNames[id]||names.get(id)||id):ref.type==='team'?(resolvedSlotNames[ref.ref]||names.get(ref.ref)||''):'';
    return teamPlayers(name)||'Giocatori da confermare';
  };
  const sorted=[...snapshot.plan.matches].sort((a,b)=>String(snapshot.assignments[a.key]?.at||'9999').localeCompare(String(snapshot.assignments[b.key]?.at||'9999'))||a.round-b.round);
  const poolMaps=Array.from(new Set([...(Array.isArray(rules?.allowed_maps)?rules.allowed_maps:[]),...CODM_MULTIPLAYER_MAPS,...(snapshot.config.customMaps||[])]));
  const allowedMaps=Array.isArray(rules?.allowed_maps)&&rules.allowed_maps.length?rules.allowed_maps as string[]:poolMaps;
  const allWeapons=Object.entries(CODM_WEAPONS).flatMap(([category,list])=>[...list,...(snapshot.config.customWeapons?.[category]||[])].map(weapon=>({category,weapon})));
  const allowedWeapons=Array.isArray(rules?.allowed_weapons)&&rules.allowed_weapons.length?allWeapons.filter(w=>rules.allowed_weapons.includes(w.weapon)):allWeapons;
  function openPopup(key:string){
    const a=snapshot.assignments[key];if(!a)return;
    const score=snapshot.results[key];setPopupKey(key);setError('');setSuccess('');
    setDraft({at:dateInput(a.at),mode:a.mode,map:a.map,category:a.category,weapon:a.weapon,scoreLimit:String(a.scoreLimit||50),scoreA:score?String(score.scoreA):'',scoreB:score?String(score.scoreB):'',bo3Maps:[...(a.bo3Maps||[a.map,'',''])].slice(0,3),bo3Weapons:[...(a.bo3Weapons||Array.from({length:3},()=>({category:a.category,weapon:a.weapon})))].slice(0,3)});
  }
  async function persist(clear=false){
    if(!canWrite||!tournamentId||!current||busy)return;
    try{
      setBusy(true);setError('');setSuccess('');
      const old=snapshot.assignments[current.key];
      const map=String(draft.map||'').trim(),weapon=String(draft.weapon||'').trim();
      if(!map||!weapon)throw Error('Seleziona mappa e arma.');
      const limit=Number(draft.scoreLimit);
      if(!Number.isInteger(limit)||limit<1||limit>9999)throw Error('Limite punteggio non valido.');
      const maps=current.bestOf===3?draft.bo3Maps.map(x=>x.trim()):undefined;
      const weapons=current.bestOf===3?draft.bo3Weapons:undefined;
      if(current.bestOf===3&&(maps?.some(x=>!x)||new Set(maps).size!==3||weapons?.some(w=>!w.weapon||!w.category)))throw Error('Grand Final: seleziona tre mappe diverse e tre armi.');
      const newAssignment:Assignment={...old,mode:draft.mode,map:current.bestOf===3?maps![0]:map,weapon,category:draft.category,scoreLimit:current.bestOf===3?2:limit,at:draft.at?new Date(draft.at).toISOString():'',bo3Maps:maps,bo3Weapons:weapons};
      const currentResult=snapshot.results[current.key];
      const resultChanged=clear||draft.scoreA!==String(currentResult?.scoreA??'')||draft.scoreB!==String(currentResult?.scoreB??'');
      const scores={...snapshot.results};
      if(clear){delete scores[current.key];const probe=resolveBracket(snapshot.plan,scores);if(snapshot.plan.matches.some(m=>scores[m.key]&&(!probe.get(m.key)?.teamA||!probe.get(m.key)?.teamB)))throw Error('Prima elimina i risultati dei turni successivi.');}
      else if(currentResult&&draft.scoreA===''&&draft.scoreB==='')throw Error('Per togliere il risultato usa il pulsante Cancella risultato.');
      else if(draft.scoreA!==''||draft.scoreB!==''){
        if(draft.scoreA===''||draft.scoreB==='')throw Error('Inserisci entrambi i punteggi.');
        const a=Number(draft.scoreA),b=Number(draft.scoreB);
        const resolved=state.get(current.key);
        if([resolved?.teamA,resolved?.teamB].some(id=>id?.startsWith('QS-')&&!resolvedSlotNames[id!]))throw Error('Attendi la qualificazione delle squadre dai gironi.');
        if(resultChanged)validateBracketResult(snapshot.plan,snapshot.results,current.key,a,b);
        if(current.bestOf===1&&(a>limit||b>limit))throw Error(`Punteggio superiore al limite ${limit}.`);
        scores[current.key]={scoreA:a,scoreB:b};
      }
      const config:Config={...snapshot.config,mapModePool:{...snapshot.config.mapModePool,[draft.mode]:Array.from(new Set([...(snapshot.config.mapModePool[draft.mode]||[]),newAssignment.map,...(maps||[])]))},weapons:{...snapshot.config.weapons,[draft.category]:Array.from(new Set([...(snapshot.config.weapons[draft.category]||[]),weapon]))}};
      for(const w of weapons||[])config.weapons[w.category]=Array.from(new Set([...(config.weapons[w.category]||[]),w.weapon]));
      const {data,error:readError}=await supabase.from('codm_tournaments').select('rules').eq('id',tournamentId).single();
      if(readError)throw readError;
      const fresh=data?.rules||{};
      if(Number(fresh.advanced_bracket_v2?.revision||0)!==Number(snapshot.revision||0))throw Error('Il tabellone è stato aggiornato da un altro dispositivo: ricarica i dati prima di salvare.');
      const nextSnapshot={...snapshot,revision:Number(snapshot.revision||0)+1,assignments:{...snapshot.assignments,[current.key]:newAssignment},results:scores,config};
      const nextRules={...fresh,advanced_bracket_v2:nextSnapshot,advanced_bracket_config_v2:config};
      const {data:updated,error:updateError}=await supabase.from('codm_tournaments').update({rules:nextRules}).eq('id',tournamentId).eq('rules->advanced_bracket_v2->>revision',String(snapshot.revision||0)).select('id').maybeSingle();
      if(updateError||!updated)throw updateError||Error('Salvataggio non confermato: un altro dispositivo potrebbe aver modificato il torneo. Aggiorna i dati.');
      onSaved?.(nextRules);setSuccess(clear?'Risultato rimosso.':'Incontro aggiornato senza rigenerare il tabellone.');setPopupKey('');
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  }
  return <section className="ak22-advanced-calendar"><h3>🏆 Calendario playoff predefinito · {sorted.length} incontri</h3><p className="muted">Clicca un incontro per cambiare giorno, ora, mappa, arma o risultato senza rigenerare gironi e tabelloni.</p>
    {success&&<p className="notice" role="status">{success}</p>}
    <div className="ak22-calendar-grid">{sorted.map(m=>{
      const a=snapshot.assignments[m.key];const s=state.get(m.key);const res=snapshot.results[m.key];
      return <button type="button" key={m.key} className={`ak22-fixture ak22-fixture-${m.lane.toLowerCase()} ak29-advanced-match`} onClick={()=>canWrite?openPopup(m.key):onEdit()}>
        <header><b>{LANE_NAME[m.lane]} · {m.name}</b><span className="ak23-short-code">{shortCodes[m.key]}</span></header>
        <div className="ak22-fixture-time">🕒 {dateLabel(a?.at)}</div>
        <div className="ak22-fixture-vs"><div><strong className="ak22-team-name">{label(m.a,s?.teamA||null)}</strong><small className="ak22-team-players">{playerNames(m.a,s?.teamA||null)}</small><b className="ak22-score">{res?.scoreA??'–'}</b></div><span>VS</span><div><strong className="ak22-team-name">{label(m.b,s?.teamB||null)}</strong><small className="ak22-team-players">{playerNames(m.b,s?.teamB||null)}</small><b className="ak22-score">{res?.scoreB??'–'}</b></div></div>
        <footer><span>🎮 {a?.mode||'Modalità da scegliere'}</span><span>🗺️ {m.bestOf===3?(a?.bo3Maps||[]).join(' / '):a?.map||'Mappa da scegliere'}</span><span>🔫 {m.bestOf===3?(a?.bo3Weapons||[]).map(w=>w.weapon).join(' / '):a?.weapon||'Arma da scegliere'}</span></footer>
        <div className="ak22-fixture-route"><span>✓ {shortDestination(m.winnerTo,shortCodes,'Campione')}</span><span>✕ {shortDestination(m.loserTo,shortCodes,'Eliminata')}</span></div>
        <span className="ak29-open-hint">✏️ Modifica incontro</span>
      </button>;
    })}</div>
    {current&&<div className="ak29-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setPopupKey('');}}><section role="dialog" aria-modal="true" aria-label="Modifica partita playoff" className="ak29-modal"><header className="ak29-modal-head"><div><h3>{shortCodes[current.key]} · {current.name}</h3><p>{label(current.a,state.get(current.key)?.teamA||null)} <b>VS</b> {label(current.b,state.get(current.key)?.teamB||null)}</p></div><button type="button" aria-label="Chiudi" className="btn small secondary" onClick={()=>setPopupKey('')} disabled={busy}>✕</button></header>
      <div className="ak29-modal-grid"><label>📅 Giorno e ora<input className="input" type="datetime-local" value={draft.at} onChange={e=>setDraft(v=>({...v,at:e.target.value}))}/></label><label>🎮 Modalità<select className="select" value={draft.mode} onChange={e=>setDraft(v=>({...v,mode:e.target.value}))}>{Array.from(new Set([...snapshot.config.modes,draft.mode])).map(m=><option key={m}>{m}</option>)}</select></label><label>🗺️ Mappa<select className="select" value={draft.map} onChange={e=>setDraft(v=>({...v,map:e.target.value}))}>{Array.from(new Set([draft.map,...allowedMaps])).filter(Boolean).map(m=><option key={m}>{m}</option>)}</select></label><label>🔫 Arma<select className="select" value={`${draft.category}::${draft.weapon}`} onChange={e=>{const [category,weapon]=e.target.value.split('::');setDraft(v=>({...v,category,weapon}));}}>{Array.from(new Map<string,{category:string;weapon:string}>([{category:draft.category,weapon:draft.weapon},...allowedWeapons].filter(w=>w.weapon).map(w=>[`${w.category}::${w.weapon}`,w] as const)).values()).map(w=><option key={`${w.category}::${w.weapon}`} value={`${w.category}::${w.weapon}`}>{w.weapon}</option>)}</select></label>
        {current.bestOf===3&&[0,1,2].map(i=><div className="ak29-bo3-row" key={i}><label>Finale · Mappa {i+1}<select className="select" value={draft.bo3Maps[i]} onChange={e=>setDraft(v=>({...v,bo3Maps:v.bo3Maps.map((x,j)=>j===i?e.target.value:x)}))}>{Array.from(new Set([draft.bo3Maps[i],...allowedMaps])).filter(Boolean).map(m=><option key={m}>{m}</option>)}</select></label><label>Arma {i+1}<select className="select" value={`${draft.bo3Weapons[i]?.category}::${draft.bo3Weapons[i]?.weapon}`} onChange={e=>{const [category,weapon]=e.target.value.split('::');setDraft(v=>({...v,bo3Weapons:v.bo3Weapons.map((x,j)=>j===i?{category,weapon}:x)}));}}>{Array.from(new Map<string,{category:string;weapon:string}>([draft.bo3Weapons[i],...allowedWeapons].filter(w=>w?.weapon).map(w=>[`${w.category}::${w.weapon}`,w] as const)).values()).map(w=><option key={w.category+w.weapon} value={`${w.category}::${w.weapon}`}>{w.weapon}</option>)}</select></label></div>)}
        <label>🎯 Limite<input className="input" type="number" min="1" disabled={current.bestOf===3} value={current.bestOf===3?2:draft.scoreLimit} onChange={e=>setDraft(v=>({...v,scoreLimit:e.target.value}))}/></label></div>
      <div className="ak29-score-block"><h4>🏆 Risultato {current.bestOf===3?'(BO3)':''}</h4><div className="ak29-score-row"><label>{label(current.a,state.get(current.key)?.teamA||null)}<input type="number" min="0" className="input" value={draft.scoreA} onChange={e=>setDraft(v=>({...v,scoreA:e.target.value}))}/></label><strong>:</strong><label>{label(current.b,state.get(current.key)?.teamB||null)}<input type="number" min="0" className="input" value={draft.scoreB} onChange={e=>setDraft(v=>({...v,scoreB:e.target.value}))}/></label></div></div>
      {error&&<p className="notice" role="alert">⚠️ {error}</p>}
      <div className="ak29-modal-actions"><button className="btn" type="button" disabled={busy} onClick={()=>void persist()}>💾 {busy?'Salvataggio…':'Salva incontro'}</button>{snapshot.results[current.key]&&<button className="btn small danger" type="button" disabled={busy} onClick={()=>void persist(true)}>Cancella risultato</button>}<button className="btn small secondary" type="button" disabled={busy} onClick={()=>setPopupKey('')}>Annulla</button></div>
    </section></div>}
  </section>;
}
