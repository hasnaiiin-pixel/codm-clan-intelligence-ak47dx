'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {supabase} from '@/lib/supabaseClient';
import {resolveBracket} from '@/lib/advancedBracket';
import type {BracketPlan, BracketResult, BracketMatch} from '@/lib/advancedBracket';
import {tournamentMatchCodes} from '@/lib/tournamentMatchCodes';
import BracketFlowBoard from '../../tournament/BracketFlowBoard';

type PublicTournament={
  id:string;name:string;status:string;format:string;type:string;
  tournament_date:string|null;description:string|null;winner:string|null;
  allowed_weapons?:string[];allowed_preset?:string|null;
};
type PublicTeam={id:string;name:string;players:string[];reserves:string[];status:string|null};
type PublicMatch={
  id:string;phase:string|null;group_name:string|null;team_a:string|null;team_b:string|null;
  match_time:string|null;mode:string|null;map_name:string|null;weapon?:string|null;
  score_a:number|null;score_b:number|null;score_limit:number|null;
  lobby_name:string|null;status:string|null;winner:string|null;bracket_order?:number|null;
};
type BracketData={version:number;plan:BracketPlan;results:Record<string,BracketResult>;assignments:Record<string,{mode:string;map:string;weapon:string;at?:string}>};
type Payload={tournament:PublicTournament;teams:PublicTeam[];matches:PublicMatch[];bracket:BracketData|null};
type GroupTable={name:string;finished:boolean;rankings:{team:string;played:number;won:number;lost:number;drawn:number;points:number;diff:number}[]};

function asPlayers(players:unknown):string[]{
  if(!Array.isArray(players))return [];
  return players.map(item=>typeof item==='string'?item:(item&&typeof item==='object'&&'nickname' in item?String(item.nickname):''))
    .map(x=>x.trim()).filter(Boolean);
}
function playerNames(teams:PublicTeam[],name:string|null){
  const team=teams.find(t=>t.name===name);
  return team?asPlayers(team.players).join(' · '):'';
}
function makeGroups(matches:PublicMatch[]):GroupTable[]{
 const byName=new Map<string,PublicMatch[]>();
 for(const m of matches.filter(m=>m.phase==='Girone')){
   const k=m.group_name||'A';byName.set(k,[...(byName.get(k)||[]),m]);
 }
 return Array.from(byName.entries()).sort(([a],[b])=>a.localeCompare(b,'it')).map(([name,games])=>{
   const names=new Set(games.flatMap(m=>[m.team_a,m.team_b]).filter((x):x is string=>Boolean(x)));
   const rankings=Array.from(names).map(team=>{
     let played=0,won=0,lost=0,drawn=0,diff=0;
     for(const m of games){
       if(m.team_a!==team&&m.team_b!==team)continue;
       if(m.score_a==null||m.score_b==null)continue;
       played++;
       const own=m.team_a===team?m.score_a:m.score_b,other=m.team_a===team?m.score_b:m.score_a;
       diff+=own-other;
       if(own>other)won++;else if(own<other)lost++;else drawn++;
     }
     return {team,played,won,lost,drawn,points:won*3+drawn,diff};
   }).sort((a,b)=>b.points-a.points||b.diff-a.diff||a.team.localeCompare(b.team,'it'));
   return {name,finished:games.length>0&&games.every(m=>m.score_a!=null&&m.score_b!=null),rankings};
 });
}
function dateText(value:string|null){
 if(!value)return 'Data e ora da definire';
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'Data e ora da definire':date.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function normalizeWeapons(value:unknown):string[]{return Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'&&x.trim().length>0):[];}

type FixtureCardProps={
 id:string;heading:string;date:string|null;teamA:string;teamB:string;playersA?:string;playersB?:string;
 scoreA:number|null;scoreB:number|null;mode?:string|null;map?:string|null;weapon?:string|null;
 limit?:number|string|null;lobby?:string|null;status?:string|null;
};
function FixtureCard({id,heading,date,teamA,teamB,playersA,playersB,scoreA,scoreB,mode,map,weapon,limit,lobby,status}:FixtureCardProps){
 return <article className="ak26-public-card ak28-fixture-card" aria-label={heading}>
  <div className="ak28-fixture-top"><h3 className="ak26-fixture-heading">{heading}</h3><p className="ak28-fixture-date">🕒 {dateText(date)}</p></div>
  <div className="ak28-fixture-opponents">
   <div className="ak28-fixture-side"><strong className="ak26-fixture-team" title={teamA}>{teamA||'Da assegnare'}</strong><small title={playersA||''}>{playersA||'Giocatori da definire'}</small><b className="ak28-fixture-points">{scoreA??'–'}</b></div>
   <span className="ak28-fixture-vs">VS</span>
   <div className="ak28-fixture-side"><strong className="ak26-fixture-team" title={teamB}>{teamB||'Da assegnare'}</strong><small title={playersB||''}>{playersB||'Giocatori da definire'}</small><b className="ak28-fixture-points">{scoreB??'–'}</b></div>
  </div>
  <div className="ak28-fixture-meta">
    <span>🎮 {mode||'Modalità da assegnare'}</span><span>🗺️ {map||'Mappa da assegnare'}</span>
    <span>🔫 {weapon||'Arma da assegnare'}</span>
    {limit!=null&&<span>🎯 {limit}</span>}{lobby&&<span>🏟️ {lobby}</span>}
    <span className="ak28-fixture-status">{status||'Da giocare'}</span>
  </div>
 </article>;
}

export default function PublicTournamentDetail(){
 const params=useParams();const id=String(params?.id||'');
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[updatedAt,setUpdatedAt]=useState('');
 const [tab,setTab]=useState('overview');
 useEffect(()=>{
  if(!id)return;
  let active=true;let request=0;
  setData(null);setBusy(true);setTab('overview');
  const load=async()=>{
   const current=++request;
   const {data:payload,error:loadError}=await supabase.rpc('codm_fix26_public_tournament',{p_tournament_id:id});
   if(!active||current!==request)return;
   if(loadError)setError('Dati non disponibili. Verifica SQL pubblico FIX28: '+loadError.message);
   else if(!payload){setError('Torneo non trovato o non pubblico.');setData(null);}
   else {setError('');setData(payload as Payload);}
   setBusy(false);setUpdatedAt(new Date().toLocaleTimeString('it-IT'));
  };
  void load();
  const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},20000);
  const refresh=()=>{if(document.visibilityState==='visible')void load();};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const channel=supabase.channel(`ak28-public-${id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_matches',filter:`tournament_id=eq.${id}`},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_teams',filter:`tournament_id=eq.${id}`},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournaments',filter:`id=eq.${id}`},refresh)
    .subscribe();
  return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);void supabase.removeChannel(channel);};
 },[id]);
 const teams=data?.teams||[];const matches=data?.matches||[];
 const groups=useMemo(()=>makeGroups(matches),[matches]);
 const plan=data?.bracket?.version===2?data.bracket.plan:null;
 const results=data?.bracket?.results||{},assignments=data?.bracket?.assignments||{};
 const resolved=useMemo(()=>plan?resolveBracket(plan,results):new Map(),[plan,results]);
 const codes=useMemo(()=>plan?tournamentMatchCodes(plan):{} as Record<string,string>,[plan]);
 const teamName=(teamId:string|null|undefined)=>!teamId?'Da definire':plan?.teams.find(t=>t.id===teamId)?.name||teamId;
 const teamPlayers=(teamId:string|null|undefined)=>playerNames(teams,teamName(teamId));
 const sourceName=(m:BracketMatch,side:'a'|'b')=>m[side].type==='team'?teamName(m[side].ref):`${m[side].type==='winner'?'Vince':'Perde'} ${codes[m[side].ref]||m[side].ref}`;
 const allowedWeapons=normalizeWeapons(data?.tournament.allowed_weapons);
 const legacyElimination=matches.filter(m=>m.phase!=='Girone');
 const labels=[['overview','Panoramica'],['teams','Squadre'],['groups','Gironi'],['bracket','Tabellone'],['calendar','Calendario'],['results','Risultati']];
 const finishedMatches=matches.filter(m=>m.score_a!=null&&m.score_b!=null).length+Object.keys(results).length;
 const tournamentIsLive=String(data?.tournament.status||'').toLowerCase()==='in corso';
 const hasBracket=Boolean(plan||legacyElimination.length);
 const classicCard=(m:PublicMatch)=><FixtureCard key={m.id} id={m.id} heading={`${m.phase||'Incontro'}${m.group_name?` · ${m.phase==='Girone'?'Girone ':''}${m.group_name}`:''}`} date={m.match_time} teamA={m.team_a||'Da assegnare'} teamB={m.team_b||'Da assegnare'} playersA={playerNames(teams,m.team_a)} playersB={playerNames(teams,m.team_b)} scoreA={m.score_a} scoreB={m.score_b} mode={m.mode} map={m.map_name} weapon={m.weapon} limit={m.score_limit} lobby={m.lobby_name} status={m.status}/>;
 const bracketCard=(m:BracketMatch)=>{
   const r=resolved.get(m.key),a=assignments[m.key],score=results[m.key];
   return <FixtureCard key={m.key} id={m.key} heading={`${m.lane==='GF'?'🏆 Grand Final':m.lane==='W'?'🔵 Winners':'🟠 Losers'} · ${codes[m.key]||m.key}${m.bestOf===3?' · BO3':''}`} date={a?.at||null} teamA={r?.teamA?teamName(r.teamA):sourceName(m,'a')} teamB={r?.teamB?teamName(r.teamB):sourceName(m,'b')} playersA={teamPlayers(r?.teamA)} playersB={teamPlayers(r?.teamB)} scoreA={score?.scoreA??null} scoreB={score?.scoreB??null} mode={a?.mode} map={a?.map} weapon={a?.weapon} limit={m.bestOf===3?'BO3':null} status={r?.completed?'Terminata':'Da giocare'}/>;
 };
 return <main className="ak26-public ak27-spectator ak28-spectator">
  <header className="ak26-public-header ak27-spectator-header"><div className="ak27-public-identity"><small className="ak27-eyebrow">🎮 AK47DX · TORNEI LIVE</small><h1>{data?.tournament.name||'Torneo CODM'}</h1><p className="ak27-public-subtitle">{[data?.tournament.format,data?.tournament.type].filter(Boolean).join(' · ')||'Risultati e classifiche'}</p><span className={`ak27-public-status ${tournamentIsLive?'live':''}`}>{tournamentIsLive?'● ':''}{data?.tournament.status||'Caricamento'}</span></div><div className="ak26-public-links2"><Link className="btn small secondary" href="/tornei">← Tutti i tornei</Link>{data?.tournament.status==='Iscrizioni aperte'&&<Link className="btn small" href={`/iscrizione/${id}`}>📝 Iscriviti</Link>}<small className="ak27-update">↻ Aggiornato: {updatedAt||'–'}</small></div></header>
  {busy&&!data&&<p className="muted">Caricamento...</p>}{error&&<p className="notice" role="alert">{error}</p>}
  {data&&<>
   <div className="ak27-public-kpis" aria-label="Riepilogo torneo"><div><b>{teams.length}</b><span>Squadre</span></div><div><b>{groups.length}</b><span>Gironi</span></div><div><b>{finishedMatches}</b><span>Incontri conclusi</span></div><div><b>{matches.length+(plan?.matches.length||0)}</b><span>Incontri totali</span></div></div>
   <nav className="ak26-public-tabs" aria-label="Sezioni torneo">{labels.map(([key,label])=><button type="button" key={key} onClick={()=>setTab(key)} className={tab===key?'active':''}>{label}{key==='bracket'&&hasBracket?' ✓':''}</button>)}</nav>
   {tab==='overview'&&<><div className="ak26-public-grid ak28-summary-grid"><article className="ak26-public-card ak27-overview-card"><h2>📅 Informazioni</h2><p><strong>{data.tournament.status}</strong></p><p>{data.tournament.tournament_date?new Date(data.tournament.tournament_date).toLocaleDateString('it-IT'):'Data da definire'}</p><p>{data.tournament.description||'Gironi, calendario e risultati sono disponibili nelle sezioni dedicate.'}</p></article><article className="ak26-public-card ak27-overview-card"><h2>🏆 Tabellone eliminazione</h2><p>{plan?`Già generato: ${plan.teams.length} squadre, ${plan.matches.length} incontri, ${plan.byes} BYE.`:legacyElimination.length?`${legacyElimination.length} incontri eliminatori già generati.`:'Non ancora generato.'}</p><p className="ak27-champion">Vincitore: <strong>{data.tournament.winner||'Da determinare'}</strong></p><button type="button" className="btn small" onClick={()=>setTab(hasBracket?'bracket':'groups')}>{hasBracket?'Visualizza tabellone →':'Visualizza gironi →'}</button></article></div>
   <section className="ak26-public-card ak28-weapons-panel"><h2>🔫 Armi da utilizzare</h2>{allowedWeapons.length?<div className="ak28-weapon-chips">{allowedWeapons.map(weapon=><span key={weapon}>{weapon}</span>)}</div>:<p>{data.tournament.allowed_preset?`Preset regolamento: ${data.tournament.allowed_preset}. Nessuna lista di armi specifiche configurata.`:"Elenco delle armi non ancora impostato per questo torneo."}</p>}<p className="ak28-footnote">L'arma specifica sorteggiata per ogni incontro è indicata nel Calendario e nei Risultati, quando assegnata.</p></section></>}
   {tab==='teams'&&<div className="ak26-public-grid">{teams.map(t=><article key={t.id} className="ak26-public-card"><h3 className="ak26-fixture-team">{t.name}</h3><p>{asPlayers(t.players).join(' · ')||'Giocatori da assegnare'}</p><small>{t.status||'In preparazione'}</small></article>)}{!teams.length&&<p>Nessuna squadra creata.</p>}</div>}
   {tab==='groups'&&<div className="ak28-groups-grid">{groups.map(g=><article className="ak26-public-card ak28-group-card" key={g.name}><h3 className="ak28-group-heading">GIRONE {g.name} <small>{g.finished?'Concluso':'In corso'}</small></h3><table className="ak26-public-table ak28-group-table"><thead><tr><th scope="col">Squadra / Giocatori</th><th scope="col" title="Giocate">G</th><th scope="col" title="Vinte">V</th><th scope="col" title="Perse">P</th><th scope="col" title="Punti">Pt</th><th scope="col" title="Differenza">Δ</th></tr></thead><tbody>{g.rankings.map((r,index)=><tr key={r.team}><td><div className="ak28-group-team"><strong>{index+1}. {r.team}</strong><small>{playerNames(teams,r.team)||'Giocatori da definire'}</small></div></td><td>{r.played}</td><td>{r.won}</td><td>{r.lost}</td><td><b>{r.points}</b></td><td>{r.diff}</td></tr>)}</tbody></table></article>)}{!groups.length&&<p>Gironi non ancora generati.</p>}</div>}
   {tab==='bracket'&&<section className="ak26-public-card ak28-bracket-section"><h2>🏆 Tabellone eliminazione</h2>{plan?<><p className="muted">{plan.teams.length} squadre · {plan.byes} BYE · {plan.matches.length} incontri. Blu: Winners; arancione: Losers; oro: Grand Final.</p><BracketFlowBoard plan={plan} state={resolved} results={results} assignments={assignments} selectedKey="" onSelect={()=>{}} nameFor={teamName} playersFor={teamPlayers} sourceName={sourceName} readOnly/></>:legacyElimination.length?<><p className="muted">Incontri già generati con il formato precedente. Visualizziamo quelli realmente salvati; le frecce complete richiedono un tabellone Winners/Losers.</p><div className="ak28-fixture-grid">{legacyElimination.map(classicCard)}</div></>:<p className="muted">Tabellone non ancora generato per questo torneo.</p>}</section>}
   {tab==='calendar'&&<><h2 className="ak28-section-title">📅 Calendario incontri</h2>{allowedWeapons.length>0&&<p className="ak28-footnote" style={{textAlign:'center',marginBottom:12}}>🔫 Armi permesse: {allowedWeapons.join(' · ')}</p>}<div className="ak28-fixture-grid">{[...matches].sort((a,b)=>String(a.match_time||'9999').localeCompare(String(b.match_time||'9999'))).map(classicCard)}{plan?.matches.map(bracketCard)}{!matches.length&&!plan&&<p>Calendario non ancora generato.</p>}</div></>}
   {tab==='results'&&<><h2 className="ak28-section-title">🏅 Risultati</h2><div className="ak28-fixture-grid">{matches.filter(m=>m.score_a!=null&&m.score_b!=null).map(classicCard)}{plan?.matches.filter(m=>results[m.key]).map(bracketCard)}{!matches.some(m=>m.score_a!=null&&m.score_b!=null)&&!Object.keys(results).length&&<p>Non ci sono ancora risultati.</p>}</div></>}
  </>}
 </main>;
}
