'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabaseClient';

type Preview={id:string;name:string;status:string;format:string;type:string;tournament_date:string|null;cover_url:string|null};
export default function PublicTournaments(){
 const [items,setItems]=useState<Preview[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   const {data,error}=await supabase.rpc('codm_fix26_public_tournaments');
   if(!active)return;
   if(error)setError('Elenco non disponibile: esegui la migrazione FIX26 su Supabase. '+error.message);
   else {setError('');setItems(Array.isArray(data)?data as Preview[]:[]);}
   setBusy(false);
  };
  void load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},25000);
  const channel=supabase.channel('ak26-public-index').on('postgres_changes',{event:'*',schema:'public',table:'codm_tournaments'},()=>void load()).subscribe();
  return()=>{active=false;clearInterval(timer);void supabase.removeChannel(channel);};
 },[]);
 return <main className="ak26-public ak27-spectator"><header className="ak26-public-header ak27-spectator-header"><div><small>AK47DX · COD MOBILE</small><h1>🏆 Tornei e risultati live</h1><p>Consulta gironi, squadre, tabelloni e risultati senza registrarti.</p></div><Link className="btn small secondary" href="/">← Home AK47DX</Link></header>
 {error&&<p className="notice" role="alert">{error}</p>}{busy&&<p className="muted">Caricamento tornei...</p>}
 <section className="ak26-public-grid">{items.map(t=><Link key={t.id} className="ak26-public-card" href={`/tornei/${t.id}`}><div className="ak27-index-heading"><b>🏆 {t.name}</b><span className="ak27-public-status">{t.status}</span></div><p className="muted">{t.format||'Formato da definire'} · {t.type||'Torneo'} </p>{t.tournament_date&&<small>📅 {new Date(t.tournament_date).toLocaleDateString('it-IT')}</small>}<p className="ak27-index-open">Apri torneo →</p></Link>)}</section>
 {!busy&&!items.length&&!error&&<p className="notice">Nessun torneo pubblico disponibile.</p>}
 </main>;
}
