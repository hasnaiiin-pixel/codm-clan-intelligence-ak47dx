"use client";
import {useState} from 'react';
import {useCodmAuth} from '@/lib/authRoles';
import {supabase} from '@/lib/supabaseClient';
export default function BackupPage(){
 const auth=useCodmAuth();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [preview,setPreview]=useState<Record<string,unknown>|null>(null);
 async function exportBackup(){
  setBusy(true);setMessage('Preparazione archivio dati...');
  try{
   const {data}=await supabase.auth.getSession();const token=data.session?.access_token;
   if(!token)throw new Error('Accedi come amministratore.');
   const response=await fetch('/api/admin/backup',{headers:{authorization:`Bearer ${token}`},cache:'no-store'});
   if(!response.ok){const details=await response.json();throw new Error(details.error||'Errore backup');}
   const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`AK47DX_DATI_${new Date().toISOString().slice(0,10)}.json.gz`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);setMessage('Archivio scaricato. Per backup COMPLETO salva anche il dump pgAdmin e i file Supabase Storage.');
  }catch(error){setMessage(error instanceof Error?error.message:'Errore')}finally{setBusy(false)}
 }
 async function inspectBackup(file:File|null){if(!file)return;setBusy(true);setPreview(null);try{const {data}=await supabase.auth.getSession();const res=await fetch('/api/admin/backup',{method:'POST',headers:{authorization:`Bearer ${data.session?.access_token||''}`,'content-type':'application/gzip'},body:await file.arrayBuffer()});const body=await res.json();if(!res.ok)throw new Error(body.error||'Backup non valido');setPreview(body);setMessage('File verificato: nessuna scrittura nel database.')}catch(e){setMessage(e instanceof Error?e.message:'Backup non valido')}finally{setBusy(false)}}
 if(auth.loading)return <main className="container"><p>Verifica accesso...</p></main>;
 if(!auth.canManageUsers)return <main className="container"><section className="card"><h1>Accesso riservato all’Admin principale</h1></section></main>;
 return <main className="container wide"><section className="card gaming-panel"><p className="eyebrow">💾 AK47DX V14</p><h1>Backup & Restore Center</h1><div className="cal-buttons"><a className="btn small secondary" href="/admin/seasons">Gestione stagioni</a><a className="btn small secondary" href="/import/history">Importa storico</a></div><p>Esporta i dati del Clan Manager dal sito. Protezione: solo account Admin principale, verifica lato server.</p><button className="btn primary" disabled={busy} onClick={exportBackup}>{busy?'Esportazione...':'⬇ Scarica dati applicativi (.json.gz)'}</button>{message&&<p className="notice" role="status">{message}</p>}</section><section className="card"><h2>Ripristino: controllo di sicurezza</h2><label className="btn small secondary">🔎 Verifica archivio scaricato (.json.gz)<input hidden type="file" accept=".gz,.json.gz" onChange={e=>void inspectBackup(e.target.files?.[0]||null)}/></label>{preview&&<div className="notice top-gap"><strong>Archivio verificato (nessun ripristino eseguito)</strong><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(preview,null,2)}</pre></div>}<p>Il ripristino automatico di un intero progetto Supabase Free, comprese credenziali, file e ruoli PostgreSQL, non può essere garantito da un semplice upload browser. Per non rischiare di cancellare statistiche o utenti il pulsante di ripristino è bloccato finché non è stata verificata una procedura di ripristino completa su un progetto di prova.</p><p>Conserva <strong>pgAdmin .backup + screenshot Storage + questo archivio applicativo</strong>. Usa pgAdmin su un progetto separato per il recupero completo.</p></section></main>;
}
