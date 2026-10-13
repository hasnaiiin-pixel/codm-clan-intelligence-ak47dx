'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import type {BracketMatch,BracketPlan,BracketResolution,BracketResult} from '@/lib/advancedBracket';
import {tournamentMatchCodes,shortDestination} from '@/lib/tournamentMatchCodes';

export type FlowAssignment={mode:string;map:string;weapon:string;at?:string};
type Props={plan:BracketPlan;state:Map<string,BracketResolution>;results:Record<string,BracketResult>;assignments:Record<string,FlowAssignment>;selectedKey:string;onSelect:(match:BracketMatch)=>void;nameFor:(id:string|null|undefined)=>string;playersFor:(id:string|null|undefined)=>string;sourceName:(match:BracketMatch,side:'a'|'b')=>string};
type Node={match:BracketMatch;x:number;y:number};
export const FLOW_CARD_WIDTH=228,FLOW_CARD_HEIGHT=142;
const PITCH_X=252,PITCH_Y=153,LEFT=18,HEADER=47,BETWEEN=78,RIGHT=24;
const lanes=['W','L'] as const;
const labels={W:'WINNERS',L:'LOSERS',GF:'GRAND FINAL'};
function sortedRounds(matches:BracketMatch[]){return [...new Set(matches.map(m=>m.round))].sort((a,b)=>a-b);}

/** Layout completo: Winners sopra, Losers sotto, Grand Final a destra di entrambi. */
export function buildFlowLayout(plan:BracketPlan){
  const positions=new Map<string,Node>();
  const headings:Array<{lane:'W'|'L'|'GF';y:number;x:number;width:number;count:number}>=[];
  const wins=plan.matches.filter(m=>m.lane==='W'),losers=plan.matches.filter(m=>m.lane==='L');
  const wr=sortedRounds(wins),lr=sortedRounds(losers);
  const maxRows=(matches:BracketMatch[],rounds:number[])=>Math.max(1,...rounds.map(r=>matches.filter(m=>m.round===r).length));
  const rowsW=maxRows(wins,wr),rowsL=maxRows(losers,lr);
  const topW=HEADER+10,topL=topW+rowsW*PITCH_Y+BETWEEN;
  const regularCols=Math.max(wr.length,lr.length);
  const gfX=LEFT+regularCols*PITCH_X+12;
  const rightEdge=gfX+FLOW_CARD_WIDTH+RIGHT;
  const totalHeight=topL+rowsL*PITCH_Y+25;
  headings.push({lane:'W',y:0,x:LEFT,width:regularCols*PITCH_X,count:wins.length});
  headings.push({lane:'L',y:topL-HEADER,x:LEFT,width:regularCols*PITCH_X,count:losers.length});
  const place=(matches:BracketMatch[],rounds:number[],startY:number)=>{
    for(const [col,round] of rounds.entries()){
      matches.filter(m=>m.round===round).forEach((match,row)=>{
        positions.set(match.key,{match,x:LEFT+col*PITCH_X,y:startY+row*PITCH_Y});
      });
    }
  };
  place(wins,wr,topW);place(losers,lr,topL);
  const gf=plan.matches.filter(m=>m.lane==='GF');
  const gfY=Math.max(topW+25,Math.min(totalHeight-FLOW_CARD_HEIGHT-25,Math.round((topW+topL+rowsL*PITCH_Y)/2-FLOW_CARD_HEIGHT/2)));
  gf.forEach((match,i)=>positions.set(match.key,{match,x:gfX,y:gfY+i*PITCH_Y}));
  headings.push({lane:'GF',y:gfY-HEADER,x:gfX,width:FLOW_CARD_WIDTH,count:gf.length});
  const links:Array<{from:string;to:string;kind:'win'|'loss'|'final';path:string;crossLane:boolean}>=[];
  for(const match of plan.matches){
    const dest=positions.get(match.key);if(!dest)continue;
    for(const [side,source] of [match.a,match.b].entries()){
      if(source.type==='team')continue;
      const from=positions.get(source.ref);if(!from)continue;
      const sx=from.x+FLOW_CARD_WIDTH,sy=from.y+FLOW_CARD_HEIGHT/2;
      const tx=dest.x-7,ty=dest.y+(side===0?45:107);
      const crossLane=from.match.lane!==match.lane;
      const kind=match.lane==='GF'?'final':source.type==='loser'?'loss':'win';
      let path:string;
      if(tx>sx+18){const bend=(sx+tx)/2;path=`M${sx} ${sy} C${bend} ${sy} ${bend} ${ty} ${tx} ${ty}`;}
      else{
        // Ritorno a sinistra: connettore spezzato separato dalle card, senza alterare gli avanzamenti.
        const bend=sx+14+(side*7);
        const level=sy+Math.sign(ty-sy||1)*Math.min(22,Math.abs(ty-sy)/2);
        path=`M${sx} ${sy} L${bend} ${sy} L${bend} ${level} L${tx-15} ${level} L${tx-15} ${ty} L${tx} ${ty}`;
      }
      links.push({from:source.ref,to:match.key,kind,path,crossLane});
    }
  }
  return {positions,headings,links,width:rightEdge,height:Math.max(totalHeight,gfY+FLOW_CARD_HEIGHT+25)};
}
function prettyDate(value?:string){if(!value)return 'Ora da fissare';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Ora da fissare';}
export default function BracketFlowBoard({plan,state,results,assignments,selectedKey,onSelect,nameFor,playersFor,sourceName}:Props){
  const layout=useMemo(()=>buildFlowLayout(plan),[plan]);
  const codes=useMemo(()=>tournamentMatchCodes(plan),[plan]);
  const wrapRef=useRef<HTMLDivElement>(null);
  const [width,setWidth]=useState(1040);
  const [mode,setMode]=useState<'overview'|'detail'>('overview');
  useEffect(()=>{
    const el=wrapRef.current;if(!el)return;
    const update=()=>setWidth(Math.max(250,el.clientWidth-4));
    update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();
  },[]);
  const overviewScale=Math.min(1,Math.max(0.045,Math.min(width/layout.width,640/layout.height)));
  const scale=mode==='overview'?overviewScale:1;
  const showName=(id:string|null,match:BracketMatch,side:'a'|'b')=>id?nameFor(id):sourceName(match,side).replace(/(W-R\d+-M\d+|L-R\d+-M\d+|GF-BO3)/g,k=>codes[k]||k);
  const routeName=(key:string|null|undefined,fallback:string)=>shortDestination(key,codes,fallback);
  const selectedLinks=selectedKey?new Set(layout.links.filter(l=>l.from===selectedKey||l.to===selectedKey).map(l=>`${l.from}:${l.to}`)):new Set<string>();
  return <section className="ak22-graph-wrap ak23-bracket" aria-label="Tabellone completo Winners e Losers">
    <div className="ak22-graph-legend ak23-legend"><span><i className="ak22-legend-win"/> Winners →</span><span><i className="ak22-legend-loss"/> Losers →</span><span><i className="ak22-legend-gf"/> Finale →</span><div className="ak23-view-switch"><button type="button" className={`btn small ${mode==='overview'?'':'secondary'}`} onClick={()=>setMode('overview')}>▣ Panoramica completa</button><button type="button" className={`btn small ${mode==='detail'?'':'secondary'}`} onClick={()=>setMode('detail')}>⌕ Dettaglio leggibile</button></div></div>
    <p className="ak23-view-note">{mode==='overview'?'Winners sopra, Losers sotto e Grand Final a destra: tutto il percorso in una vista. Se le scritte sono troppo piccole passa a Dettaglio.':'Vista a dimensione leggibile: scorri per esplorare il torneo e seleziona un incontro per modificarlo.'}</p>
    <div ref={wrapRef} className={`ak22-graph-scroll ak23-graph-scroll ${mode==='overview'?'ak23-overview':''}`} tabIndex={0} role="region" aria-label="Schema completo torneo">
      <div className="ak23-scaled-frame" style={{width:Math.round(layout.width*scale),height:Math.round(layout.height*scale)}}>
        <div className="ak22-graph-canvas" style={{width:layout.width,height:layout.height,transform:`scale(${scale})`,transformOrigin:'top left'}}>
          {layout.headings.map(h=><div key={h.lane} className={`ak22-lane-header ak22-lane-${h.lane.toLowerCase()}`} style={{top:h.y,left:h.x,width:h.width}}><b>{labels[h.lane]}</b><span>{h.count} incontri</span></div>)}
          <svg className="ak22-lines" xmlns="http://www.w3.org/2000/svg" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
            <defs>
              <marker id="ak23-arrow-win" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="#5b9cf5"/></marker>
              <marker id="ak23-arrow-loss" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="#f5a45d"/></marker>
              <marker id="ak23-arrow-final" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="#e8c66a"/></marker>
            </defs>
            {layout.links.map(link=><path key={`${link.from}-${link.to}`} className={`ak22-connector ${link.kind==='loss'?'ak22-loss-route':''} ${link.kind==='final'?'ak23-final-route':''} ${link.crossLane?'ak22-cross-route':''} ${selectedLinks.has(`${link.from}:${link.to}`)?'ak22-route-active':''}`} d={link.path} markerEnd={`url(#ak23-arrow-${link.kind})`}/>)}
          </svg>
          {Array.from(layout.positions.values()).map(({match,x,y})=>{
            const s=state.get(match.key);const a=assignments[match.key];const teamA=s?.teamA||null,teamB=s?.teamB||null;
            return <button type="button" key={match.key} onClick={()=>onSelect(match)} title={`${codes[match.key]} · ${match.name}. Clicca per modificare`} style={{left:x,top:y,width:FLOW_CARD_WIDTH,height:FLOW_CARD_HEIGHT}} className={`ak22-flow-match ak23-match ak22-card-${match.lane.toLowerCase()} ${selectedKey===match.key?'ak22-card-selected':''}`}>
              <div className="ak22-flow-head"><b>{codes[match.key]}</b><span>{match.name}{match.bestOf===3?' · BO3':''}</span></div>
              <div className="ak22-flow-teams ak23-teams">
                <div className={`ak22-flow-team ${s?.winner===teamA&&teamA?'won':''}`}><strong className="ak22-team-name" title={showName(teamA,match,'a')}>{showName(teamA,match,'a')}</strong><small className="ak22-team-players" title={teamA?playersFor(teamA):''}>{teamA?playersFor(teamA):'Da definire'}</small><span className="ak22-team-score">{results[match.key]?.scoreA??'–'}</span></div>
                <span className="ak22-team-vs ak23-vs">VS</span>
                <div className={`ak22-flow-team ${s?.winner===teamB&&teamB?'won':''}`}><strong className="ak22-team-name" title={showName(teamB,match,'b')}>{showName(teamB,match,'b')}</strong><small className="ak22-team-players" title={teamB?playersFor(teamB):''}>{teamB?playersFor(teamB):'Da definire'}</small><span className="ak22-team-score">{results[match.key]?.scoreB??'–'}</span></div>
              </div>
              <div className="ak22-flow-details ak23-match-info"><span>🎮 {a?.mode||'—'}</span><span>🗺️ {a?.map||'—'}</span><span>🔫 {a?.weapon||'—'}</span><span>🕒 {prettyDate(a?.at)}</span></div>
              <div className="ak22-flow-routing ak23-routing"><span>✓ {routeName(match.winnerTo,'🏆')}</span><span>✕ {routeName(match.loserTo,'Fuori')}</span></div>
            </button>;
          })}
        </div>
      </div>
    </div>
  </section>;
}
