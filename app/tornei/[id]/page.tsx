'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {supabase} from '@/lib/supabaseClient';
import {resolveBracket} from '@/lib/advancedBracket';
import type {BracketPlan,BracketResult,BracketMatch} from '@/lib/advancedBracket';
import BracketFlowBoard from '../../tournament/BracketFlowBoard';

type PublicTournament={id:string;name:string;status:string;format:string;type:string;tournament_date:string|null;description:string|null;winner:string|null};
type PublicTeam={id:string;name:string;captain:string|null;players:string[];reserves:string[];status:string|null};
type PublicMatch={id:string;phase:string|null;group_name:string|null;team_a:string|null;team_b:string|null;match_time:string|null;mode:string|null;map_name:string|null;score_a:number|null;score_b:number|null;score_limit:number|null;lobby_name:string|null;status:string|null;winner:string|null};
type BracketData={version:number;plan:BracketPlan;results:Record<string,BracketResult>;assignments:Record<string,{mode:string;map:string;weapon:string;at?:string}>};
type Payload={tournament:PublicTournament;teams:PublicTeam[];matches:PublicMatch[];bracket:BracketData|null};
type GroupTable={name:string;played:number;finished:boolean;rankings:{team:string;played:number;won:number;lost:number;drawn:number;points:number;diff:number}[]};
function makeGroups(matches:PublicMatch[],teams:PublicTeam[]):GroupTable[]{
 const byName=new Map<string,PublicMatch[]>();
 for(const m of matches.filter(m=>m.phase==='Girone')){const k=m.group_name||'A';byName.set(k,[...(byName.get(k)||[]),m]);}
 return Array.from(byName.entries()).sort(([a],[b])=>a.localeCompare(b,'it')).map(([name,games])=>{
  const names=new Set(games.flatMap(m=>[m.team_a,m.team_b]).filter((x):x is string=>Boolean(x)));
  const rankings=Array.from(names).map(team=>{
    let played=0,won=0,lost=0,drawn=0,diff=0;
    for(const m of games){if(m.team_a!==team&&m.team_b!==team)continue;if(m.score_a==null||m.score_b==null)continue;
      played++;const own=m.team_a===team?m.score_a:m.score_b;const other=m.team_a===team?m.score_b:m.score_a;
      diff+=own-other;if(own>other)won++;else if(own<other)lost++;else drawn++;
    }
    return {team,played,won,lost,drawn,points:won*3+drawn,diff};
  }).sort((a,b)=>b.points-a.points||b.diff-a.diff||a.team.localeCompare(b.team,'it'));
  return {name,played:games.length,finished:games.length>0&&games.every(m=>m.score_a!=null&&m.score_b!=null),rankings};
 });
}
function dateText(value:string|null){if(!value)return 'Data da definire';const d=new Date(value);return Number.isNaN(d.getTime())?'Da definire':d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
function MatchCard({m,teams}:{m:PublicMatch;teams:PublicTeam[]}){
 const players=(name:string|null)=>teams.find(t=>t.name===name)?.players.join(' · ')||'';
 return <article className="ak26-public-card"><h3 className="ak26-fixture-heading">{m.phase||'Partita'} {m.group_name&&`· Girone ${m.group_name}`}</h3><p style={{textAlign:'center'}}>{dateText(m.match_time)}</p>
  <div className="ak22-fixture-vs"><div><strong className="ak26-fixture-team">{m.team_a||'Da assegnare'}</strong><small className="ak22-team-players">{players(m.team_a)}</small><span className="ak26-fixture-score">{m.score_a??'–'}</span></div><span className="ak23-vs">VS</span><div><strong className="ak26-fixture-team">{m.team_b||'Da assegnare'}</strong><small className="ak22-team-players">{players(m.team_b)}</small><span className="ak26-fixture-score">{m.score_b??'–'}</span></div></div>
  <div className="ak26-fixture-meta"><span>🎮 {m.mode||'–'}</span><span>🗺️ {m.map_name||'–'}</span><span>🎯 {m.score_limit??'–'}</span><span>🏟️ {m.lobby_name||'–'}</span><span>{m.status||'Da giocare'}</span></div>
 </article>;
}
export default function PublicTournamentDetail(){
 const params=useParams();const id=String(params?.id||'');
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[updatedAt,setUpdatedAt]=useState('');
 const [tab,setTab]=useState('overview');
 useEffect(()=>{
  if(!id)return;
  let active=true;setData(null);setBusy(true);
  const load=async()=>{
   const {data:payload,error}=await supabase.rpc('codm_fix26_public_tournament',{p_tournament_id:id});
   if(!active)return;
   if(error)setError('Dati non disponibili. Verifica SQL FIX26: '+error.message);
   else if(!payload){setError('Torneo non trovato o non pubblico.');setData(null);}
   else {setError('');setData(payload as Payload);}
   setBusy(false);setUpdatedAt(new Date().toLocaleTimeString('it-IT'));
  };
  void load();const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},20000);
  const focus=()=>{if(document.visibilityState==='visible')void load();};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  const channel=supabase.channel(`ak26-public-${id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_matches',filter:`tournament_id=eq.${id}`},focus)
    .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournament_teams',filter:`tournament_id=eq.${id}`},focus)
    .on('postgres_changes',{event:'*',schema:'public',table:'codm_tournaments',filter:`id=eq.${id}`},focus)
    .subscribe();
  return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);void supabase.removeChannel(channel);};
 },[id]);
 const teams=data?.teams||[];const matches=data?.matches||[];
 const groups=useMemo(()=>makeGroups(matches,teams),[matches,teams]);
 const plan=data?.bracket?.version===2?data.bracket.plan:null;
 const results=data?.bracket?.results||{};const assignments=data?.bracket?.assignments||{};
 const resolved=useMemo(()=>plan?resolveBracket(plan,results):new Map(),[plan,results]);
 const teamName=(teamId:string|null|undefined)=>!teamId?'Da definire':plan?.teams.find(t=>t.id===teamId)?.name||teamId;
 const teamPlayers=(teamId:string|null|undefined)=>teams.find(t=>t.name===teamName(teamId))?.players.join(' · ')||'';
 const sourceName=(m:BracketMatch,side:'a'|'b')=>m[side].type==='team'?teamName(m[side].ref):`${m[side].type==='winner'?'Vince':'Perde'} ${m[side].ref}`;
 const labels=[['overview','Panoramica'],['teams','Squadre'],['groups','Gironi'],['bracket','Eliminazione'],['calendar','Calendario'],['results','Risultati']];
 return <main className="ak26-public"><header className="ak26-public-header"><div><small>🏆 AK47DX · TORNEO PUBBLICO</small><h1>{data?.tournament.name||'Torneo CODM'}</h1><p>{data?.tournament.format} · {data?.tournament.type} · <strong>{data?.tournament.status}</strong></p></div><div className="ak26-public-links2"><Link className="btn small secondary" href="/tornei">← Tutti i tornei</Link>{data?.tournament.status==='Iscrizioni aperte'&&<Link className="btn small" href={`/iscrizione/${id}`}>📝 Iscriviti</Link>}<span className="muted">Aggiornato: {updatedAt||'–'}</span></div></header>
 {busy&&!data&&<p className="muted">Caricamento...</p>}{error&&<p className="notice" role="alert">{error}</p>}
 {data&&<><nav className="ak26-public-tabs" aria-label="Sezioni torneo">{labels.map(([key,label])=><button type="button" key={key} onClick={()=>setTab(key)} className={tab===key?'active':''}>{label}</button>)}</nav>
 {tab==='overview'&&<div className="ak26-public-grid"><article className="ak26-public-card"><h2>Stato torneo</h2><p><strong>{data.tournament.status}</strong></p><p>Formato: {data.tournament.format}</p><p>Data: {data.tournament.tournament_date||'Da definire'}</p><p>{data.tournament.description}</p></article><article className="ak26-public-card"><h2>Partecipazione</h2><p>{teams.length} squadre</p><p>{groups.length} gironi</p><p>{matches.length+(plan?.matches.length||0)} incontri in programma</p><p>Vincitore: <strong>{data.tournament.winner||'Da determinare'}</strong></p></article></div>}
 {tab==='teams'&&<div className="ak26-public-grid">{teams.map(t=><article key={t.id} className="ak26-public-card"><h3 className="ak26-fixture-team">{t.name}</h3><p style={{textAlign:'center'}}>{t.players.join(' · ')||'Giocatori da assegnare'}</p><small>{t.status||'In preparazione'}</small></article>)}{!teams.length&&<p>Nessuna squadra creata.</p>}</div>}
 {tab==='groups'&&<div className="ak26-public-grid">{groups.map(g=><article className="ak26-public-card" key={g.name}><h3 style={{textAlign:'center'}}>GIRONE {g.name} · {g.finished?'Concluso':'In corso'}</h3><table className="ak26-public-table"><thead><tr><th>Squadra</th><th>G</th><th>V</th><th>P</th><th>Pt</th><th>Diff</th></tr></thead><tbody>{g.rankings.map(r=><tr key={r.team}><td>{r.team}</td><td>{r.played}</td><td>{r.won}</td><td>{r.lost}</td><td>{r.points}</td><td>{r.diff}</td></tr>)}</tbody></table></article>)}{!groups.length&&<p>Gironi non ancora generati.</p>}</div>}
 {tab==='bracket'&&<section className="ak26-public-card"><h2 style={{textAlign:'center'}}>Percorso Winners / Losers / Grand Final</h2>{plan?<><p className="muted" style={{textAlign:'center'}}>{plan.teams.length} squadre · {plan.byes} BYE · {plan.matches.length} incontri. Blu = avanza; arancione = passa nel Losers; oro = finale.</p><BracketFlowBoard plan={plan} state={resolved} results={results} assignments={assignments} selectedKey="" onSelect={()=>{}} nameFor={teamName} playersFor={teamPlayers} sourceName={sourceName} readOnly/></>:<p className="muted">Tabellone Winners/Losers non ancora generato.</p>}</section>}
 {tab==='calendar'&&<div className="ak26-public-grid">{[...matches].sort((a,b)=>String(a.match_time||'9999').localeCompare(String(b.match_time||'9999'))).map(m=><MatchCard key={m.id} m={m} teams={teams}/>)}{plan?.matches.map(m=>{const r=resolved.get(m.key),a=assignments[m.key];return <article className="ak26-public-card" key={m.key}>
 <h3 className="ak26-fixture-heading">{m.lane==='GF'?'🏆 Grand Final':m.lane==='W'?'🔵 Winners':'🟠 Losers'} · {m.name}</h3>
 <p style={{textAlign:'center'}}>{dateText(a?.at||null)}</p>
 <p style={{textAlign:'center'}}><strong>{teamName(r?.teamA)}</strong> <b className="ak26-fixture-score">{results[m.key]?`${results[m.key].scoreA} : ${results[m.key].scoreB}`:'VS'}</b> <strong>{teamName(r?.teamB)}</strong></p>
 <div className="ak26-fixture-meta"><span>🎮 {a?.mode||'–'}</span><span>🗺️ {a?.map||'–'}</span><span>🔫 {a?.weapon||'–'}</span><span>{r?.completed?'Terminata':'Da giocare'}</span></div>
 </article>;})}{!matches.length&&!plan&&<p>Calendario non ancora generato.</p>}</div>}
 {tab==='results'&&<div className="ak26-public-grid">{matches.filter(m=>m.score_a!=null&&m.score_b!=null).map(m=><MatchCard key={m.id} m={m} teams={teams}/>)}{!matches.some(m=>m.score_a!=null&&m.score_b!=null)&&!Object.keys(results).length&&<p>Non ci sono ancora risultati.</p>}{plan&&plan.matches.filter(m=>results[m.key]).map(m=><article key={m.key} className="ak26-public-card"><h3>{m.name}</h3><p>{teamName(resolved.get(m.key)?.teamA)} <strong>{results[m.key].scoreA} – {results[m.key].scoreB}</strong> {teamName(resolved.get(m.key)?.teamB)}</p></article>)}</div>}
 </>}
 </main>;
}
