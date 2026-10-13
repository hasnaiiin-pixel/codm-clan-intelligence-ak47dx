'use client';

import {useMemo} from 'react';
import type {BracketMatch,BracketPlan,BracketResolution,BracketResult} from '@/lib/advancedBracket';

export type FlowAssignment={mode:string;map:string;weapon:string;at?:string};
type Props={plan:BracketPlan;state:Map<string,BracketResolution>;results:Record<string,BracketResult>;assignments:Record<string,FlowAssignment>;selectedKey:string;onSelect:(match:BracketMatch)=>void;nameFor:(id:string|null|undefined)=>string;playersFor:(id:string|null|undefined)=>string;sourceName:(match:BracketMatch,side:'a'|'b')=>string};
type LayoutNode={match:BracketMatch;x:number;y:number};
const CARD_WIDTH=294,CARD_HEIGHT=224,COL_PITCH=372,ROW_PITCH=254,MARGIN_X=26,LANE_TITLE_HEIGHT=74;
const lanes=['W','L','GF'] as const;
const laneNames={W:'WINNERS • Percorso dei vincenti',L:'LOSERS • Seconda possibilità',GF:'GRAND FINAL • Best of Three'};
const laneColors={W:'#5b9cf5',L:'#f5a45d',GF:'#e8c66a'};
function laneFor(m:BracketMatch){return m.lane;}
export function buildFlowLayout(plan:BracketPlan,visible:'ALL'|'W'|'L'|'GF'='ALL'){
  const requested=visible==='ALL'?lanes:[visible];
  const positions=new Map<string,LayoutNode>();
  const headings:Array<{lane:'W'|'L'|'GF';y:number;count:number}>=[];
  let laneStart=0,width=560;
  for(const lane of requested){
    const matches=plan.matches.filter(m=>laneFor(m)===lane);
    if(!matches.length)continue;
    const rounds=Array.from(new Set(matches.map(m=>m.round))).sort((a,b)=>a-b);
    const maxRows=Math.max(1,...rounds.map(round=>matches.filter(m=>m.round===round).length));
    headings.push({lane,y:laneStart,count:matches.length});
    for(let c=0;c<rounds.length;c++){
      const rMatches=matches.filter(m=>m.round===rounds[c]);
      for(let row=0;row<rMatches.length;row++){
        // Rounds are aligned to the top of their lane; no dummy BYE cards.
        positions.set(rMatches[row].key,{match:rMatches[row],x:MARGIN_X+c*COL_PITCH,y:laneStart+LANE_TITLE_HEIGHT+row*ROW_PITCH});
      }
    }
    width=Math.max(width,MARGIN_X+(rounds.length-1)*COL_PITCH+CARD_WIDTH+80);
    laneStart+=LANE_TITLE_HEIGHT+maxRows*ROW_PITCH+35;
  }
  const links:Array<{from:string;to:string;kind:'win'|'loss';crossLane:boolean;path:string}>=[];
  for(const target of plan.matches){
    const dest=positions.get(target.key);if(!dest)continue;
    for(const [side,source] of [target.a,target.b].entries()){
      if(source.type==='team')continue;
      const origin=positions.get(source.ref);if(!origin)continue;
      const crossLane=origin.match.lane!==dest.match.lane;
      const sx=origin.x+CARD_WIDTH,sy=origin.y+CARD_HEIGHT/2;
      const tx=dest.x-10,ty=dest.y+(side===0?79:149);
      let path:string;
      if(tx>sx+28){const bend=sx+(tx-sx)/2;path=`M ${sx} ${sy} C ${bend} ${sy}, ${bend} ${ty}, ${tx} ${ty}`;}
      else{const bend=Math.max(sx+37,tx+48);path=`M ${sx} ${sy} L ${bend} ${sy} Q ${bend+16} ${sy} ${bend+16} ${sy+16} L ${bend+16} ${ty-16} Q ${bend+16} ${ty} ${bend} ${ty} L ${tx} ${ty}`;}
      links.push({from:source.ref,to:target.key,kind:source.type==='loser'?'loss':'win',crossLane,path});
    }
  }
  return {positions,headings,links,width,height:Math.max(laneStart,300)};
}
function prettyDate(value?:string){if(!value)return 'Orario da definire';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Orario da definire';}
export default function BracketFlowBoard({plan,state,results,assignments,selectedKey,onSelect,nameFor,playersFor,sourceName}:Props){
  const layout=useMemo(()=>buildFlowLayout(plan,'ALL'),[plan]);
  return <section className="ak22-graph-wrap" aria-label="Tabellone completo con collegamenti tra vincenti e perdenti">
    <div className="ak22-graph-legend"><span><i className="ak22-legend-win"/> Vincente →</span><span><i className="ak22-legend-loss"/> Perdente → Losers</span><span><i className="ak22-legend-gf"/> Grand Final</span><small>Scorri orizzontalmente e verticalmente. Seleziona un incontro per evidenziarne il percorso.</small></div>
    <div className="ak22-graph-scroll" tabIndex={0} role="region" aria-label="Grafico completo del torneo scorrevole">
      <div className="ak22-graph-canvas" style={{width:layout.width,height:layout.height}}>
        {layout.headings.map(heading=><div key={heading.lane} className={`ak22-lane-header ak22-lane-${heading.lane.toLowerCase()}`} style={{top:heading.y}}><b>{laneNames[heading.lane]}</b><span>{heading.count} incontri</span></div>)}
        <svg className="ak22-lines" xmlns="http://www.w3.org/2000/svg" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
          <defs>
            <marker id="ak22-win-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill={laneColors.W}/></marker>
            <marker id="ak22-loss-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill={laneColors.L}/></marker>
          </defs>
          {layout.links.map(link=><path key={`${link.from}-${link.to}-${link.kind}`} className={`ak22-connector ${link.kind==='loss'?'ak22-loss-route':'ak22-win-route'} ${link.crossLane?'ak22-cross-route':''} ${selectedKey&&(link.from===selectedKey||link.to===selectedKey)?'ak22-route-active':''}`} d={link.path} markerEnd={link.kind==='loss'?'url(#ak22-loss-arrow)':'url(#ak22-win-arrow)'}/>)}
        </svg>
        {Array.from(layout.positions.values()).map(({match,x,y})=>{
          const s=state.get(match.key);const a=assignments[match.key];
          const teamA=s?.teamA||null,teamB=s?.teamB||null;
          const labelA=teamA?nameFor(teamA):sourceName(match,'a');
          const labelB=teamB?nameFor(teamB):sourceName(match,'b');
          const destWin=match.winnerTo||'Campione';const destLoss=match.loserTo||'Eliminata';
          return <button key={match.key} type="button" onClick={()=>onSelect(match)} style={{left:x,top:y,width:CARD_WIDTH,height:CARD_HEIGHT}} className={`ak22-flow-match ak22-card-${match.lane.toLowerCase()} ${selectedKey===match.key?'ak22-card-selected':''}`}>
            <div className="ak22-flow-head"><b>{match.name}</b><span>{match.key}{match.bestOf===3?' · BO3':''}</span></div>
            <div className="ak22-flow-teams">
              <div className={`ak22-flow-team ${s?.winner===teamA&&teamA?'won':''}`}><strong className="ak22-team-name">{labelA}</strong><small className="ak22-team-players">{teamA?playersFor(teamA):'In attesa qualificazione'}</small><span className="ak22-team-score">{results[match.key]?.scoreA??'–'}</span></div>
              <span className="ak22-team-vs">VS</span>
              <div className={`ak22-flow-team ${s?.winner===teamB&&teamB?'won':''}`}><strong className="ak22-team-name">{labelB}</strong><small className="ak22-team-players">{teamB?playersFor(teamB):'In attesa qualificazione'}</small><span className="ak22-team-score">{results[match.key]?.scoreB??'–'}</span></div>
            </div>
            <div className="ak22-flow-details"><span>🗺️ {a?.map||'Mappa da assegnare'}</span><span>🔫 {a?.weapon||'Arma da assegnare'}</span><span>🕒 {prettyDate(a?.at)}</span></div>
            <div className="ak22-flow-routing"><span>✓ → {destWin}</span><span>✕ → {destLoss}</span></div>
          </button>;
        })}
      </div>
    </div>
  </section>;
}
