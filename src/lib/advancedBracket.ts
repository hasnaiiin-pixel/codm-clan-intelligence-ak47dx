/** Tournament bracket v2: modified double elimination (W final loser eliminated, GF BO3, no reset).
 * Pure, deterministic engine. A BYE is an edge bypass, NEVER a match or a statistical win.
 */
export type BracketLane = 'W' | 'L' | 'GF';
export type BracketTeam = { id:string; name:string; seed:number };
export type BracketSource = {type:'team'; ref:string} | {type:'winner'|'loser'; ref:string};
export type BracketMatch = {
  key:string; lane:BracketLane; round:number; name:string;
  a:BracketSource; b:BracketSource; bestOf:1|3;
  winnerTo:string|null; loserTo:string|null;
};
export type BracketPlan = {
  version:2; capacity:8|16|32|64; byes:number; teams:BracketTeam[];
  matches:BracketMatch[]; createdAt:string;
};
export type BracketResult = { scoreA:number; scoreB:number };
export type BracketResolution = {key:string;teamA:string|null;teamB:string|null;winner:string|null;loser:string|null;completed:boolean};

export const CAPACITIES = [8,16,32,64] as const;
export function autoCapacity(n:number):8|16|32|64 {
  if(!Number.isInteger(n)||n<5||n>64)throw new Error('Il tabellone richiede da 5 a 64 squadre.');
  return (CAPACITIES.find(c=>c>=n)||64);
}
export function roundName(capacity:number):string {
  return capacity>=64?'Trentaduesimi':capacity>=32?'Sedicesimi':capacity>=16?'Ottavi':'Quarti';
}
function roundLabel(remaining:number){return remaining===2?'Finale Winners':remaining===4?'Semifinali':remaining===8?'Quarti':remaining===16?'Ottavi':remaining===32?'Sedicesimi':'Trentaduesimi';}
export function seedSlots(capacity:number):number[] {
  if(!Number.isInteger(capacity)||capacity<2||(capacity&(capacity-1))!==0)throw new Error('Capacità non valida');
  let slots=[1,2];
  while(slots.length<capacity){const next=slots.length*2;slots=slots.flatMap(seed=>[seed,next+1-seed]);}
  return slots;
}
export function buildAdvancedBracket(input:BracketTeam[],capacityInput?:number):BracketPlan {
  const n=input.length;const minimum=autoCapacity(n);
  const capacity=(capacityInput??minimum) as 8|16|32|64;
  if(!CAPACITIES.includes(capacity)||capacity<minimum)throw new Error(`Servono almeno ${minimum} posti per ${n} squadre.`);
  if(new Set(input.map(t=>t.id)).size!==n)throw new Error('ID squadra duplicati.');
  const seeds=input.map(t=>t.seed);
  if(seeds.some(s=>!Number.isInteger(s)||s<1||s>n)||new Set(seeds).size!==n)throw new Error('Teste di serie: utilizzare i numeri da 1 al totale delle squadre, senza ripetizioni.');
  const teams=[...input].sort((a,b)=>a.seed-b.seed);
  const bySeed=new Map(teams.map(t=>[t.seed,t]));
  const matches:BracketMatch[]=[];
  let current:(BracketSource|null)[]=seedSlots(capacity).map(s=>{
    const team=bySeed.get(s);return team?{type:'team',ref:team.id}:null;
  });
  let round=1;
  while(current.length>1){
    const size=current.length;
    const next:(BracketSource|null)[]=[];
    for(let i=0;i<size;i+=2){
      const a=current[i],b=current[i+1];
      if(!a&&!b){next.push(null);continue;}
      if(!a||!b){next.push(a||b);continue;}
      const key=`W-R${round}-M${Math.floor(i/2)+1}`;
      matches.push({key,lane:'W',round,name:roundLabel(size),a,b,bestOf:1,winnerTo:null,loserTo:null});
      next.push({type:'winner',ref:key});
    }
    current=next;round++;
  }
  const winners=matches.filter(m=>m.lane==='W');
  if(winners.length!==n-1)throw new Error('Il tabellone Winners contiene un numero errato di incontri.');
  const finalW=winners[winners.length-1].key;
  const wRounds=[...new Set(winners.filter(m=>m.key!==finalW).map(m=>m.round))].sort((a,b)=>a-b);
  let waiting:BracketSource[]=[];let lround=0;
  const roll=(entrants:BracketSource[])=>{
    const pool=[...waiting,...entrants];
    if(pool.length<2){waiting=pool;return;}
    lround++;
    const next:BracketSource[]=[];
    for(let i=0;i<pool.length;i+=2){
      const a=pool[i],b=pool[i+1];
      if(!b){next.push(a);continue;}
      const key=`L-R${lround}-M${Math.floor(i/2)+1}`;
      matches.push({key,lane:'L',round:lround,name:`Perdenti · Turno ${lround}`,a,b,bestOf:1,winnerTo:null,loserTo:null});
      next.push({type:'winner',ref:key});
    }
    waiting=next;
  };
  for(const wr of wRounds){
    // Later Winners drops enter against surviving lower-bracket competitors.
    const entrants=winners.filter(m=>m.round===wr&&m.key!==finalW).map(m=>({type:'loser',ref:m.key} as BracketSource));
    roll(entrants);
  }
  while(waiting.length>1)roll([]);
  const losers=matches.filter(m=>m.lane==='L');
  if(losers.length!==n-3||waiting.length!==1)throw new Error('Il tabellone Perdenti non è completo.');
  matches.push({key:'GF-BO3',lane:'GF',round:1,name:'Grand Final BO3',a:{type:'winner',ref:finalW},b:waiting[0]!,bestOf:3,winnerTo:null,loserTo:null});
  for(const target of matches){
    for(const source of [target.a,target.b])if(source.type!=='team'){
      const parent=matches.find(m=>m.key===source.ref);
      if(!parent)throw new Error('Collegamento mancante.');
      if(source.type==='winner')parent.winnerTo=target.key;
      else parent.loserTo=target.key;
    }
  }
  // The W-final loser is eliminated outright by design; never enters the Losers bracket.
  if(matches.find(m=>m.key===finalW)?.loserTo)throw new Error('Finale Winners: perdente non eliminata.');
  if(matches.length!==2*n-3)throw new Error('Numero totale di serie non corretto.');
  return {version:2,capacity,byes:capacity-n,teams,matches,createdAt:new Date().toISOString()};
}
export function resolveBracket(plan:BracketPlan,results:Record<string,BracketResult>):Map<string,BracketResolution> {
  const state=new Map<string,BracketResolution>();
  const teamIds=new Set(plan.teams.map(t=>t.id));
  function sourceValue(s:BracketSource):string|null{
    if(s.type==='team')return teamIds.has(s.ref)?s.ref:null;
    const node=state.get(s.ref);return s.type==='winner'?(node?.winner||null):(node?.loser||null);
  }
  for(const match of plan.matches){
    const teamA=sourceValue(match.a),teamB=sourceValue(match.b);
    let winner:string|null=null,loser:string|null=null,completed=false;
    const res=results[match.key];
    if(teamA&&teamB&&teamA!==teamB&&res){
      const a=Number(res.scoreA),b=Number(res.scoreB);
      if(Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a!==b){
        const valid=match.bestOf===3?(Math.max(a,b)===2&&Math.min(a,b)<=1):true;
        if(valid){winner=a>b?teamA:teamB;loser=a>b?teamB:teamA;completed=true;}
      }
    }
    state.set(match.key,{key:match.key,teamA,teamB,winner,loser,completed});
  }
  return state;
}
export function validateBracketResult(plan:BracketPlan,results:Record<string,BracketResult>,key:string,scoreA:number,scoreB:number){
  const match=plan.matches.find(m=>m.key===key);
  if(!match)throw new Error('Incontro inesistente.');
  const state=resolveBracket(plan,results),resolved=state.get(key);
  if(!resolved?.teamA||!resolved?.teamB)throw new Error('Prima completa gli incontri che determinano le due squadre.');
  if(!Number.isInteger(scoreA)||!Number.isInteger(scoreB)||scoreA<0||scoreB<0||scoreA===scoreB)throw new Error('Punteggi validi, non negativi e senza pareggio.');
  if(match.bestOf===3&&!(Math.max(scoreA,scoreB)===2&&Math.min(scoreA,scoreB)<=1))throw new Error('Grand Final BO3: risultato ammesso 2–0, 2–1, 0–2 oppure 1–2.');
  // Editing an upstream result must not silently invalidate already saved downstream results.
  const dependents=new Set<string>([key]);
  let changed=true;
  while(changed){changed=false;for(const m of plan.matches)if(!dependents.has(m.key)&&[m.a,m.b].some(s=>s.type!=='team'&&dependents.has(s.ref))){dependents.add(m.key);changed=true;}}
  if([...dependents].some(id=>id!==key&&results[id]))throw new Error('Ci sono risultati dei turni successivi: cancellali prima di modificare questo incontro.');
}
