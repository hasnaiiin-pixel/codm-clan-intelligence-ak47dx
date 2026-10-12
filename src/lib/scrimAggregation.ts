/** Scrim AK47DX: ogni risultato storico e' una Scrim; le partite nuove si uniscono entro 24 ore. */
import { normalizeOpponent, type ResultMatch } from './seasonOpponentStats';

export type Scrim = {
  id: string;
  seasonId: string | null;
  clanId: string;
  opponent: string;
  opponentKey: string;
  start: string;
  end: string;
  matchIds: string[];
  source: 'historical' | 'new';
  wins: number;
  losses: number;
  draws: number;
  result: 'WIN' | 'LOSE' | 'DRAW';
  matchCount: number;
  score: string;
};
export type ScrimSummary = { played:number; wins:number; losses:number; draws:number; wr:number; historical:number; newScrims:number; matches:number };
export type ScrimSourceMatch = ResultMatch & { clan_id?:string|null };
const DAY = 24 * 60 * 60 * 1000;
function asDate(value:string):number|null {
  const t=Date.parse(value);return Number.isFinite(t)?t:null;
}
function resultOf(wins:number,losses:number):Scrim['result'] {
  return wins>losses?'WIN':losses>wins?'LOSE':'DRAW';
}
function outcome(m:ScrimSourceMatch){return {wins:Number(m.result==='WIN'),losses:Number(m.result==='LOSE'),draws:Number(m.result==='DRAW')};}
function sortTime(m:ScrimSourceMatch){return asDate(m.match_date)??Number.MAX_SAFE_INTEGER;}
/**
 * Storico di solo risultato oppure serie esplicita: un record = una Scrim.
 * Nuove partite: gruppo con medesimo clan, stagione, avversario e entro 24h dalla PRIMA partita.
 * Dati senza avversario/data valida NON vengono accorpati per evitare Scrim fittizie.
 * Non trasforma un 3-2 storico in cinque partite di dettaglio.
 */
export function groupScrims(matches:readonly ScrimSourceMatch[],historicalSeasonIds:ReadonlySet<string>=new Set()):Scrim[]{
  const ordered=[...matches].sort((a,b)=>sortTime(a)-sortTime(b)||a.id.localeCompare(b.id));
  const result:Scrim[]=[];
  const running=new Map<string,{scrim:Scrim;anchor:number}>();
  for (const m of ordered){
    const opponent=String(m.opponent||'').trim().replace(/\s+/g,' ');
    const opponentKey=normalizeOpponent(m.opponent);
    const seasonId=m.season_id||null;
    const clanId=String(m.clan_id||'__AK47DX__');
    // Non usare is_historical per trattare TUTTE le partite dettagliate come Scrim.
    // Anche una stagione storica puo contenere cinque screenshot di una sola Scrim.
    const old=m.record_quality==='result_only'||m.match_scope==='series';
    const o=outcome(m),at=asDate(m.match_date);
    const key=`${clanId}|${seasonId||'__NONE__'}|${opponentKey}`;
    if(old||!opponentKey||at===null){
      result.push({id:m.id,seasonId,clanId,opponent:opponent||'Clan non specificato',opponentKey,start:m.match_date,end:m.match_date,matchIds:[m.id],source:old?'historical':'new',...o,result:m.result as Scrim['result'],matchCount:old&&(m.match_scope==='series'||m.record_quality==='result_only')?0:1,score:old&&m.team_score!=null&&m.enemy_score!=null?`${m.team_score}–${m.enemy_score}`:''});
      continue;
    }
    const bucket=running.get(key);
    if(bucket&&at>=bucket.anchor&&at-bucket.anchor<DAY){
      const s=bucket.scrim;
      s.matchIds.push(m.id);s.end=m.match_date;s.matchCount++;
      s.wins+=o.wins;s.losses+=o.losses;s.draws+=o.draws;
      s.result=resultOf(s.wins,s.losses);s.score=`${s.wins}–${s.losses}`;
    }else{
      const s:Scrim={id:m.id,seasonId,clanId,opponent,opponentKey,start:m.match_date,end:m.match_date,matchIds:[m.id],source:'new',...o,result:m.result as Scrim['result'],matchCount:1,score:`${o.wins}–${o.losses}`};
      running.set(key,{scrim:s,anchor:at});result.push(s);
    }
  }
  // Se un risultato finale storico e' stato successivamente arricchito con le vere
  // partite, non duplicare la Scrim. Uniamo SOLO su stesso clan/stagione/avversario,
  // finestra temporale e corrispondenza esatta delle vittorie/sconfitte della serie.
  const consumed=new Set<string>();
  const originalById=new Map(ordered.map(m=>[m.id,m]));
  const newByOpponent=new Map<string,Scrim[]>();
  const groupKey=(s:Scrim)=>`${s.clanId}|${s.seasonId||'__NONE__'}|${s.opponentKey}`;
  for(const s of result){
    if(s.source!=='new')continue;
    const k=groupKey(s);newByOpponent.set(k,[...(newByOpponent.get(k)||[]),s]);
  }
  for(const sc of result){
    if(sc.source!=='historical'||sc.matchIds.length!==1)continue;
    const original=originalById.get(sc.id);
    if(!original||original.match_scope!=='series'||original.team_score==null||original.enemy_score==null)continue;
    const start=asDate(sc.start);
    if(start===null)continue;
    const candidate=(newByOpponent.get(groupKey(sc))||[]).find(other=>!consumed.has(other.id)
      &&other.clanId===sc.clanId&&other.seasonId===sc.seasonId
      &&other.opponentKey===sc.opponentKey&&other.opponentKey
      &&asDate(other.start)!==null&&Math.abs((asDate(other.start)??0)-start)<DAY
      &&other.wins===original.team_score&&other.losses===original.enemy_score);
    if(candidate){sc.matchIds.push(...candidate.matchIds);sc.matchCount=candidate.matchCount;sc.end=candidate.end;consumed.add(candidate.id);}
  }
  return result.filter(s=>!consumed.has(s.id)).sort((a,b)=>(asDate(b.start)||0)-(asDate(a.start)||0));
}
export function summarizeScrims(scrims:readonly Scrim[]):ScrimSummary{
  const played=scrims.length,wins=scrims.filter(s=>s.result==='WIN').length,losses=scrims.filter(s=>s.result==='LOSE').length,draws=scrims.filter(s=>s.result==='DRAW').length;
  return {played,wins,losses,draws,wr:played?Number((wins*100/played).toFixed(1)):0,historical:scrims.filter(s=>s.source==='historical').length,newScrims:scrims.filter(s=>s.source==='new').length,matches:scrims.reduce((n,s)=>n+s.matchCount,0)};
}
