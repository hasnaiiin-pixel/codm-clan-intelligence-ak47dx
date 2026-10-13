import type {BracketPlan} from './advancedBracket';

/** Etichette corte solo per la visualizzazione: le chiavi persistite non cambiano. */
export function tournamentMatchCodes(plan:BracketPlan):Record<string,string>{
  const result:Record<string,string>={};
  for(const lane of ['W','L'] as const){
    const matches=plan.matches.filter(m=>m.lane===lane).sort((a,b)=>a.round-b.round||a.key.localeCompare(b.key,undefined,{numeric:true}));
    matches.forEach((m,i)=>{result[m.key]=`${lane}${i+1}`;});
  }
  plan.matches.filter(m=>m.lane==='GF').forEach((m,i)=>{result[m.key]=i===0?'GF':`GF${i+1}`;});
  return result;
}
export function shortDestination(value:string|null|undefined,codes:Record<string,string>,fallback:string):string{
  return value?(codes[value]||value):fallback;
}
