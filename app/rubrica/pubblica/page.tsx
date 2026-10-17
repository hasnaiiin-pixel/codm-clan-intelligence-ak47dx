'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
type PublicPlayer={nickname?:string;uid?:string|null;clan_role?:string|null};
export default function RubricaPublicPage(){
 const [items,setItems]=useState<PublicPlayer[]>([]);const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let live=true;void supabase.rpc('ak_rubrica_public_directory').then(({data,error})=>{if(!live)return;setBusy(false);if(error)setError('Rubrica pubblica non disponibile.');else setItems(Array.isArray(data)?data as PublicPlayer[]:[]);});return()=>{live=false;};},[]);
 return <main className="container top-gap ak-rubrica"><section className="card ak-rubrica-head"><div><span className="ak-rubrica-overline">🐺 AK47DX · DIRECTORY PUBBLICA</span><h1>🎮 Giocatori del clan</h1><p>Visibili esclusivamente i dati autorizzati dal clan e dai singoli giocatori.</p></div></section>
 {busy?<section className="card">Caricamento...</section>:error?<section className="card" role="alert">{error}</section>:!items.length?<section className="card"><h2>🔒 Nessun profilo pubblico</h2><p>La rubrica pubblica è disattivata oppure nessun giocatore ha autorizzato la pubblicazione.</p></section>:<div className="ak-rubrica-grid">{items.map((p,i)=><article key={i} className="card ak-rubrica-tile"><div className="ak-rubrica-person"><span className="ak-rubrica-avatar">🎮</span><span className="ak-rubrica-person-text">{p.nickname&&<strong>{p.nickname}</strong>}{p.uid!=null&&<small>🕹️ UID: {p.uid}</small>}{p.clan_role&&<small>👑 {p.clan_role}</small>}</span></div></article>)}</div>}
 </main>;
}
