'use client';
import {clanRoleEmoji,clanRoleGroups,clanRoleTier} from './rubricaRoles';
type Member={id?:string;nickname:string;uid?:string|null;clan_role?:string|null;clan_status?:string|null};
export default function RubricaOrgChart({people,onSelect}:{people:Member[];onSelect:(p:Member)=>void}){
  const sorted=clanRoleGroups.map(group=>({
    ...group,
    members:people.filter(p=>p.clan_status==='Attivo'&&clanRoleTier(p.clan_role)===group.tier)
      .sort((a,b)=>a.nickname.localeCompare(b.nickname,'it')),
  }));
  const excluded=people.filter(p=>p.clan_status!=='Attivo');
  return <section className="card ak31-org" aria-label="Organigramma Rubrica Clan">
    <header className="ak31-org-head"><h2>🏆 Organigramma AK47DX</h2><p>Struttura del clan costruita esclusivamente dai ruoli assegnati. Seleziona un nickname per aprire il profilo.</p></header>
    <div className="ak31-org-tree">{sorted.map((group,index)=>group.members.length>0?<div className={'ak31-org-level ak31-level-'+group.tier} key={group.tier}>
      {index>0&&<span className="ak31-org-stem" aria-hidden="true"/>}
      <h3>{group.title}</h3><div className="ak31-org-persons">{group.members.map(person=><button type="button" key={person.id||person.nickname} onClick={()=>onSelect(person)} className="ak31-org-person"><span className="ak31-org-symbol" aria-hidden="true">{clanRoleEmoji(person.clan_role)}</span><span><strong>{person.nickname}</strong><small>{person.clan_role||'Membro'}</small></span></button>)}</div>
    </div>:null)}</div>
    {excluded.length>0&&<p className="muted">📁 {excluded.length} contatti non attivi non sono rappresentati nell'organigramma corrente.</p>}
  </section>;
}
