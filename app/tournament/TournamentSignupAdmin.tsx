'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type PublicSignup = {id:string;tournament_id:string;surname:string;given_name:string;nickname:string;uid:string;status:string;consent_at:string;created_at:string;registration_id?:string|null};

type PrivacyRequest={id:string;signup_id:string|null;kind:string;message:string;status:string;public_response:string|null;created_at:string};
type Props={tournamentId:string;status:string;privacyUrl?:string|null;controllerName?:string|null;limit?:number|null;rows:PublicSignup[];canWrite:boolean;onReload:()=>Promise<void>};

export default function TournamentSignupAdmin({tournamentId,status,privacyUrl,controllerName,limit,rows,canWrite,onReload}:Props) {
  const [notice,setNotice]=useState('');
  const [requests,setRequests]=useState<PrivacyRequest[]>([]);
  const [responses,setResponses]=useState<Record<string,string>>({});
  const [requestStates,setRequestStates]=useState<Record<string,string>>({});
  useEffect(()=>{
    if(!canWrite||!tournamentId)return;
    let active=true;
    void supabase.from('codm_tournament_privacy_requests').select('id,signup_id,kind,message,status,public_response,created_at').eq('tournament_id',tournamentId).order('created_at',{ascending:false}).then(({data,error})=>{
      if(active){if(error) setNotice(`Richieste privacy: ${error.message}. Verifica migrazione FIX25.`);else setRequests((data||[]) as PrivacyRequest[]);}
    });
    return ()=>{active=false;};
  },[tournamentId,canWrite]);
  async function updateRequest(r:PrivacyRequest){
    if(!canWrite||pending)return;
    setPending(r.id);setNotice('');
    const next=requestStates[r.id]||r.status;
    const response=responses[r.id]??r.public_response??'';
    const {error}=await supabase.rpc('codm_fix25_review_privacy_request',{p_id:r.id,p_status:next,p_response:response});
    setPending('');
    if(error){setNotice(`Richiesta privacy: ${error.message}`);return;}
    setRequests(prev=>prev.map(x=>x.id===r.id?{...x,status:next,public_response:response}:x));
    setNotice('Risposta salvata. Il giocatore può consultarla con il suo codice.');
  }
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
    <div className="section-title"><div><h2>🔗 Iscrizioni pubbliche · FIX25</h2><p className="muted">Link senza login, verifica UID e approvazione da parte dello staff.</p></div><span className="ak24-stat">{confirmed} confermati · {pendingCount} in attesa · {total} richieste</span></div>
    <div className="ak24-link-line"><input className="input" aria-label="Link pubblico iscrizioni" readOnly value={url}/><button type="button" className="btn" onClick={copyLink}>📋 Copia link</button><a className="btn secondary" href={url} target="_blank" rel="noopener noreferrer">Apri pagina ↗</a></div>
    <p className="muted">Stato: <b>{status}</b> · Informativa: <b>{privacyUrl?'pagina predefinita':'mancante'}</b> · Titolare: <b>{controllerName||'DA INSERIRE'}</b> · Posti: <b>{limit||'nessun limite'}</b>. Modifica queste impostazioni in «Crea / Gestisci».</p>
    {!controllerName?.trim() && <p className="notice">Per aprire le iscrizioni indica il titolare reale del trattamento in «Crea / Gestisci». La pagina /privacy è già presente.</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="ak24-admin-filters"><input className="input" placeholder="Cerca nome, nickname o UID…" value={q} onChange={e=>setQ(e.target.value)}/><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tutti gli stati</option>{['In attesa','Confermata','Rifiutata','Annullata'].map(s=><option key={s}>{s}</option>)}</select></div>
    {edit && <div className="ak24-edit-form"><h3>Modifica iscrizione · {edit.nickname}</h3><div className="grid grid-2">
      {(['surname','given_name','nickname','uid'] as const).map(field=><div className="field" key={field}><label>{field==='surname'?'Cognome':field==='given_name'?'Nome':field==='nickname'?'Nickname CODM':'UID'}</label><input className="input" value={edit[field]} onChange={e=>setEdit(prev=>prev?{...prev,[field]:e.target.value}:null)}/></div>)}
      </div><div className="cal-buttons"><button className="btn small" disabled={Boolean(pending)} onClick={()=>void saveEdit()}>💾 Salva modifica</button><button className="btn small secondary" onClick={()=>setEdit(null)}>Annulla</button></div></div>}
    <div className="ak24-signup-list">{visible.map(r=><article className="ak24-signup-row" key={r.id}>
      <div><strong>{r.nickname}</strong><span>{r.surname} {r.given_name}</span><small>UID: {r.uid} · {new Date(r.created_at).toLocaleDateString('it-IT')}</small></div>
      <div className="ak24-signup-actions"><span className="ak24-state">{r.status}</span>{canWrite && <><button className="btn small secondary" onClick={()=>setEdit({...r})} disabled={Boolean(pending)}>✏️ Modifica</button><button className="btn small danger" onClick={()=>void deleteRow(r)} disabled={Boolean(pending)}>Elimina</button><button className="btn small secondary" disabled={Boolean(pending)||r.status==='Confermata'} onClick={()=>void review(r.id,'Confermata')}>✓ Conferma</button><button className="btn small secondary" disabled={Boolean(pending)||r.status==='Rifiutata'} onClick={()=>void review(r.id,'Rifiutata')}>Rifiuta</button><button className="btn small secondary" disabled={Boolean(pending)||r.status==='Annullata'} onClick={()=>void review(r.id,'Annullata')}>Annulla</button></>}</div>
    </article>)}{!visible.length&&<p className="muted">Nessuna iscrizione pubblica per i filtri selezionati.</p>}</div>
    <div className="top-gap"><h3>🛡️ Richieste privacy ricevute ({requests.length})</h3><p className="muted">Risposte senza email, consultabili tramite il codice personale. Prima di segnare una cancellazione come completata, elimina effettivamente i dati dalla scheda iscrizioni: la risposta da sola non esegue la cancellazione.</p>
      {requests.map(r=><article className="ak25-request-item" key={r.id}><b>{r.kind} · {r.status}</b><small className="muted"> · {new Date(r.created_at).toLocaleString('it-IT')}</small><p>{r.message}</p>{canWrite&&<div className="ak25-privacy-form"><label>Stato<select className="select" value={requestStates[r.id]||r.status} onChange={e=>setRequestStates(prev=>({...prev,[r.id]:e.target.value}))}>{['Ricevuta','In lavorazione','Completata','Rifiutata'].map(st=><option key={st}>{st}</option>)}</select></label><label>Risposta visibile al giocatore<textarea className="textarea" maxLength={2000} rows={2} value={responses[r.id]??r.public_response??''} onChange={e=>setResponses(prev=>({...prev,[r.id]:e.target.value}))}/></label><button className="btn small" disabled={Boolean(pending)} onClick={()=>void updateRequest(r)}>Salva risposta</button></div>}</article>)}
      {!requests.length&&<p className="muted">Nessuna richiesta ricevuta.</p>}
    </div>
  </section>;
}
