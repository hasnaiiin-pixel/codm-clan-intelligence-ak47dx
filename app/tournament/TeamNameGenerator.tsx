'use client';
import {useState} from 'react';
import {NAME_CATEGORIES,nameSuggestions,type NameCategory} from '@/lib/tournamentTeamNames';

export default function TeamNameGenerator({onPick,existingNames=[]}:{onPick:(name:string)=>void;existingNames?:string[]}){
 const [category,setCategory]=useState<NameCategory>('misto');
 const [withEmoji,setWithEmoji]=useState(true);
 const [options,setOptions]=useState<string[]>([]);
 const generate=()=>setOptions(nameSuggestions(category,withEmoji,6,existingNames));
 return <section className="ak27-name-generator" aria-label="Generatore nomi squadra">
  <div className="ak27-generator-title"><strong>🎲 Nomi automatici per la squadra</strong><small>Scegli il filtro, genera e applica un nome. Puoi sempre modificarlo a mano.</small></div>
  <div className="ak27-generator-controls">
   <label className="field">Categoria<select className="select" value={category} onChange={e=>{setCategory(e.target.value as NameCategory);setOptions([])}}><option value="misto">✨ Tutte le categorie</option>{NAME_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
   <label className="ak27-emoji-choice"><input type="checkbox" checked={withEmoji} onChange={e=>{setWithEmoji(e.target.checked);setOptions([])}}/> Aggiungi emoji / simboli</label>
   <button className="btn" type="button" onClick={generate}>🎲 Genera 6 nomi</button>
  </div>
  {!!options.length&&<div className="ak27-suggested-names">{options.map(name=><button className="ak27-name-chip" type="button" key={name} onClick={()=>onPick(name)} title="Usa come nome squadra">{name}<span aria-hidden="true">↗</span></button>)}</div>}
  <small className="muted">I nomi suggeriti escludono quelli già presenti nel torneo selezionato.</small>
 </section>;
}
