/** AK47DX FIX22: fixed qualification origins, resolved only when group results are official. */
export type QualificationSlot={id:string;name:string;kind:'group'|'repechage';group?:string;place:number};
export function qualificationSlots(groupNames:readonly string[],perGroup:number,repechagePlaces=0):QualificationSlot[]{
  if(!Number.isInteger(perGroup)||perGroup<1||perGroup>16)throw new Error('Qualificate per girone non valide');
  if(!Number.isInteger(repechagePlaces)||repechagePlaces<0||repechagePlaces>64)throw new Error('Posti ripescaggio non validi');
  const slots:QualificationSlot[]=[];
  for(const group of groupNames){
    const name=String(group).trim();
    if(!name)throw new Error('Nome girone non valido');
    for(let place=1;place<=perGroup;place++){
      slots.push({id:`QS-G-${encodeURIComponent(name)}-${place}`,name:`${place}° Girone ${name}`,kind:'group',group:name,place});
    }
  }
  for(let place=1;place<=repechagePlaces;place++)slots.push({id:`QS-R-${place}`,name:`Ripescata ${place}`,kind:'repechage',place});
  if(new Set(slots.map(s=>s.id)).size!==slots.length)throw new Error('Gironi duplicati');
  return slots;
}
/** A resolved label is only shown after its qualifying round is complete. */
export function resolvedQualificationNames(slots:readonly QualificationSlot[],
  groups:readonly {name:string;finished:boolean;standings:readonly {team:string}[] }[],
  repechageFinished:boolean,repechageTeams:readonly string[]):Record<string,string>{
  const out:Record<string,string>={};
  for(const slot of slots){
    if(slot.kind==='group'){
      const g=groups.find(x=>x.name===slot.group);
      const name=g?.finished?g.standings[slot.place-1]?.team:undefined;
      if(name)out[slot.id]=name;
    }else if(repechageFinished&&repechageTeams[slot.place-1])out[slot.id]=repechageTeams[slot.place-1];
  }
  return out;
}
