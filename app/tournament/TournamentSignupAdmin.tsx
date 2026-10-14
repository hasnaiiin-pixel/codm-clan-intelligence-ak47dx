'use client';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type PublicSignup = {id:string;tournament_id:string;surname:string;given_name:string;nickname:string;uid:string;status:string;consent_at:string;created_at:string;registration_id?:string|null};

type Props={tournamentId:string;status:string;privacyUrl?:string|null;limit?:number|null;rows:PublicSignup[];canWrite:boolean;onReload:()=>Promise<void>};

export default function TournamentSignupAdmin({tournamentId,status,privacyUrl,limit,rows,canWrite,onReload}:Props) {
  const [notice,setNotice]=useState('');
  const [pending,setPending]=useState('');
  const [edit,setEdit]=useState<PublicSignup|null>(null);
  const [filter,setFilter]=useState('');
  const [q,setQ]=useState('');
  const url = typeof window!=='undefined'?`${window.location.origin}/iscrizione/${tournamentId}`:`/iscrizione/${tournamentId}`;
  const visible=useMemo(()=>rows.filter(r=>(!filter||r.status===filter)&&`${r.surname} ${r.given_name} ${r.nickname} ${r.uid}`.toLowerCase().includes(q.toLowerCase())),[rows,filter,q]);
  const total=rows.length,confirmed=rows.filter(r=>r.status==='Confermata').length,pendingCount=rows.filter(r=>r.status==='In attesa').length;
  async function review(id:string,nextStatus:string){
    if(!canWrite||pending)return;
    setPending(id);setNotice('');
    const {error}=await supabase.rpc('codm_fix24_review_signup',{p_id:id,p_status:nextStatus});
    setPending('');
    if(error){setNotice(`Operazione non riuscita: ${error.message}`);return;}
    await onReload();setNotice(`Iscrizione aggiornata: ${nextStatus}.`);
  }
  async function saveEdit(){
    if(!edit||pending||!canWrite)return;
    setPending(edit.id);setNotice('');
    const {error}=await supabase.rpc('codm_fix24_edit_signup',{p_id:edit.id,p_surname:edit.surname,p_given_name:edit.given_name,p_nickname:edit.nickname,p_uid:edit.uid});
    setPending('');if(error){setNotice(`Modifica non riuscita: ${error.message}`);return;}
    setEdit(null);await onReload();setNotice('Dati aggiornati.');
  }
  async function deleteRow(r:PublicSignup){
    if(!canWrite||pending||!window.confirm(`Eliminare l'iscrizione di ${r.nickname} e i dati anagrafici?`))return;
    setPending(r.id);setNotice('');
    const {error}=await supabase.rpc('codm_fix24_delete_signup',{p_id:r.id});
    setPending('');if(error){setNotice(`Cancellazione non riuscita: ${error.message}`);return;}
    await onReload();setNotice('Iscrizione e dati personali eliminati.');
  }
  async function copyLink(){try{await navigator.clipboard.writeText(url);setNotice('Link copiato. Puoi inviarlo su WhatsApp o Telegram.');}catch{setNotice(`Copia questo indirizzo: ${url}`);}}
  return <section className="card ak24-admin-card top-gap">
    <div className="section-title"><div><h2>🔗 Iscrizioni pubbliche · FIX24</h2><p className="muted">Link senza login, verifica UID e approvazione da parte dello staff.</p></div><span className="ak24-stat">{confirmed} confermati · {pendingCount} in attesa · {total} richieste</span></div>
    <div className="ak24-link-line"><input className="input" aria-label="Link pubblico iscrizioni" readOnly value={url}/><button type="button" className="btn" onClick={copyLink}>📋 Copia link</button><a className="btn secondary" href={url} target="_blank" rel="noopener noreferrer">Apri pagina ↗</a></div>
    <p className="muted">Stato: <b>{status}</b> · Informativa: <b>{privacyUrl?'configurata':'mancante'}</b> · Posti: <b>{limit||'nessun limite'}</b>. Modifica queste impostazioni in «Crea / Gestisci».</p>
    {!privacyUrl && <p className="notice">Inserisci un vero URL dell'informativa privacy nelle impostazioni del torneo: senza di esso il form non accetta iscrizioni.</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="ak24-admin-filters"><input className="input" placeholder="Cerca nome, nickname o UID…" value={q} onChange={e=>setQ(e.target.value)}/><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tutti gli stati</option>{['In attesa','Confermata','Rifiutata','Annullata'].map(s=><option key={s}>{s}</option>)}</select></div>
    {edit && <div className="ak24-edit-form"><h3>Modifica iscrizione · {edit.nickname}</h3><div className="grid grid-2">
      {(['surname','given_name','nickname','uid'] as const).map(field=><div className="field" key={field}><label>{field==='surname'?'Cognome':field==='given_name'?'Nome':field==='nickname'?'Nickname CODM':'UID'}</label><input className="input" value={edit[field]} onChange={e=>setEdit(prev=>prev?{...prev,[field]:e.target.value}:null)}/></div>)}
      </div><div className="cal-buttons"><button className="btn small" disabled={Boolean(pending)} onClick={()=>void saveEdit()}>💾 Salva modifica</button><button className="btn small secondary" onClick={()=>setEdit(null)}>Annulla</button></div></div>}
    <div className="ak24-signup-list">{visible.map(r=><article className="ak24-signup-row" key={r.id}>
      <div><strong>{r.nickname}</strong><span>{r.surname} {r.given_name}</span><small>UID: {r.uid} · {new Date(r.created_at).toLocaleDateString('it-IT')}</small></div>
      <div className="ak24-signup-actions"><span className="ak24-state">{r.status}</span>{canWrite && <><button className="btn small secondary" onClick={()=>setEdit({...r})} disabled={Boolean(pending)}>✏️ Modifica</button><button className="btn small danger" onClick={()=>void deleteRow(r)} disabled={Boolean(pending)}>Elimina</button><button className="btn small secondary" disabled={Boolean(pending)||r.status==='Confermata'} onClick={()=>void review(r.id,'Confermata')}>✓ Conferma</button><button className="btn small secondary" disabled={Boolean(pending)||r.status==='Rifiutata'} onClick={()=>void review(r.id,'Rifiutata')}>Rifiuta</button><button className="btn small secondary" disabled={Boolean(pending)||r.status==='Annullata'} onClick={()=>void review(r.id,'Annullata')}>Annulla</button></>}</div>
    </article>)}{!visible.length&&<p className="muted">Nessuna iscrizione pubblica per i filtri selezionati.</p>}</div>
  </section>;
}
