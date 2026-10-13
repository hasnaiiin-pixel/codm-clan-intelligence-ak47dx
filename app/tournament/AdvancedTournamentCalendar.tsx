'use client';

import {useMemo} from 'react';
import {resolveBracket,type BracketPlan,type BracketResult,type BracketSource} from '@/lib/advancedBracket';
type Assignment={mode:string;map:string;weapon:string;at?:string;bo3Maps?:string[];bo3Weapons?:Array<{category:string;weapon:string}>};
type Snapshot={version:2;plan:BracketPlan;results:Record<string,BracketResult>;assignments:Record<string,Assignment>};
type Props={snapshot:Snapshot;resolvedSlotNames:Record<string,string>;teamPlayers:(name?:string|null)=>string;onEdit:()=>void};
const LANE_NAME:Record<string,string>={W:'WINNERS',L:'LOSERS',GF:'GRAND FINAL'};
export default function AdvancedTournamentCalendar({snapshot,resolvedSlotNames,teamPlayers,onEdit}:Props){
  const state=useMemo(()=>resolveBracket(snapshot.plan,snapshot.results||{}),[snapshot]);
  const names=new Map(snapshot.plan.teams.map(t=>[t.id,t.name]));
  const label=(ref:BracketSource,teamId:string|null)=>{
    if(teamId)return resolvedSlotNames[teamId]||names.get(teamId)||teamId;
    return ref.type==='team'?resolvedSlotNames[ref.ref]||names.get(ref.ref)||'In attesa':`${ref.type==='winner'?'Vincente':'Perdente'} ${ref.ref}`;
  };
  const playerNames=(ref:BracketSource,id:string|null)=>{
    const name=id?(resolvedSlotNames[id]||names.get(id)||id):ref.type==='team'?(resolvedSlotNames[ref.ref]||names.get(ref.ref)||''):'';
    return teamPlayers(name)||'Giocatori da confermare';
  };
  const dateLabel=(at?:string)=>{if(!at)return 'Da programmare';const d=new Date(at);return Number.isFinite(d.valueOf())?d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Da programmare';};
  const sorted=[...snapshot.plan.matches].sort((a,b)=>String(snapshot.assignments[a.key]?.at||'9999').localeCompare(String(snapshot.assignments[b.key]?.at||'9999'))||a.round-b.round);
  return <section className="ak22-advanced-calendar"><h3>🏆 Calendario playoff predefinito · {sorted.length} incontri</h3><p className="muted">Tutti gli incontri Winners e Losers, compresi quelli ancora in attesa dei qualificati. Mappa e arma sono sorteggiate tra quelle consentite e modificabili dal tabellone.</p>
    <div className="ak22-calendar-grid">{sorted.map(m=>{
      const a=snapshot.assignments[m.key];const s=state.get(m.key);const res=snapshot.results[m.key];
      return <article key={m.key} className={`ak22-fixture ak22-fixture-${m.lane.toLowerCase()}`}>
        <header><b>{LANE_NAME[m.lane]} · {m.name}</b><span>{m.key}</span></header>
        <div className="ak22-fixture-time">🕒 {dateLabel(a?.at)}</div>
        <div className="ak22-fixture-vs"><div><strong className="ak22-team-name">{label(m.a,s?.teamA||null)}</strong><small className="ak22-team-players">{playerNames(m.a,s?.teamA||null)}</small><b className="ak22-score">{res?.scoreA??'–'}</b></div><span>VS</span><div><strong className="ak22-team-name">{label(m.b,s?.teamB||null)}</strong><small className="ak22-team-players">{playerNames(m.b,s?.teamB||null)}</small><b className="ak22-score">{res?.scoreB??'–'}</b></div></div>
        <footer><span>🎮 {a?.mode||'Modalità da scegliere'}</span><span>🗺️ {m.bestOf===3?(a?.bo3Maps||[]).join(' / '):a?.map||'Mappa da scegliere'}</span><span>🔫 {m.bestOf===3?(a?.bo3Weapons||[]).map(w=>w.weapon).join(' / '):a?.weapon||'Arma da scegliere'}</span></footer>
        <div className="ak22-fixture-route"><span>✓ {m.winnerTo||'Campione'}</span><span>✕ {m.loserTo||'Eliminata'}</span></div>
        <button type="button" className="btn small secondary" onClick={onEdit}>Apri nel tabellone</button>
      </article>;
    })}</div>
  </section>;
}
