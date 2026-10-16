'use client';
import {useState} from 'react';
import {MapPin,Search} from 'lucide-react';
export type CityChoice={city:string;province:string;country:string;city_lat:number;city_lon:number};
type GeoResult={name:string;admin1?:string;admin2?:string;country:string;latitude:number;longitude:number;id:number};
/** Ricerca di sole città. Open-Meteo/GeoNames senza chiavi; non usa geolocalizzazione GPS. */
export default function RubricaCitySearch({onChoose,disabled}:{onChoose:(city:CityChoice)=>void;disabled?:boolean}){
 const [query,setQuery]=useState('');const [results,setResults]=useState<GeoResult[]>([]);const [busy,setBusy]=useState(false);const [err,setErr]=useState('');
 async function search(){const name=query.trim();if(name.length<2){setErr('Scrivi almeno 2 caratteri della città.');return;}
 setBusy(true);setErr('');setResults([]);
 try{const res=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=8&language=it&format=json`,{cache:'no-store'});
 if(!res.ok)throw new Error('Servizio città non disponibile');const data=await res.json();const rows=(Array.isArray(data.results)?data.results:[]) as GeoResult[];
 setResults(rows.filter(r=>typeof r.latitude==='number'&&typeof r.longitude==='number'&&r.country&&r.name));if(!rows.length)setErr('Città non trovata. Prova indicando anche il Paese.');
 }catch(e){setErr(e instanceof Error?e.message:'Ricerca non riuscita');}finally{setBusy(false);}}
 return <div className="ak31b-city-search"><label><span>🔎 Cerca città e seleziona il risultato</span><div className="ak31b-city-search-row"><input className="input" value={query} disabled={disabled||busy} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}} placeholder="Es. Brescia, Italia" autoComplete="off"/><button type="button" className="btn secondary" disabled={disabled||busy} onClick={()=>void search()}><Search size={16}/>{busy?'Cerco…':'Cerca'}</button></div></label>
 {err&&<p role="status" className="ak31b-error">{err}</p>}
 {!!results.length&&<div className="ak31b-city-results">{results.map(r=><button type="button" key={r.id} disabled={disabled} onClick={()=>{onChoose({city:r.name,province:r.admin1||r.admin2||'',country:r.country,city_lat:r.latitude,city_lon:r.longitude});setQuery(`${r.name}, ${r.country}`);setResults([]);setErr('');}}><MapPin size={15}/><span><strong>{r.name}</strong><small>{[r.admin1,r.country].filter(Boolean).join(', ')}</small></span></button>)}</div>}
 <small className="muted">Ricerca città tramite Open-Meteo/GeoNames (non Google Places). Nessun indirizzo o posizione GPS viene acquisito. Seleziona una città prima di attivare la mappa.</small></div>;
}
