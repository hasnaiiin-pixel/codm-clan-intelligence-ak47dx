'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Tracking = {status:string;response?:string|null;kind?:string;created_at?:string};
function PrivacyRequestContent() {
  const params = useSearchParams();
  const [tournament, setTournament] = useState(params.get('tournament') || '');
  const [signup, setSignup] = useState('');
  const [secret, setSecret] = useState('');
  const [kind, setKind] = useState('Rettifica');
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if(busy) return;
    setBusy(true); setNotice('');
    const {data,error}=await supabase.rpc('codm_fix25_submit_privacy_request',{p_tournament:tournament.trim(),p_signup:signup.trim(),p_access_code:secret.trim(),p_kind:kind,p_message:message.trim()});
    setBusy(false);
    if(error){setNotice(`Impossibile inviare: ${error.message}`);return;}
    setRequestId(String(data?.request_id || ''));setLookupId(String(data?.request_id || ''));
    setNotice('Richiesta inviata. Conserva il numero della richiesta e il codice segreto dell’iscrizione.');
  }
  async function lookup(e: React.FormEvent) {
    e.preventDefault(); if(busy) return;
    setBusy(true);setNotice('');setTracking(null);
    const {data,error}=await supabase.rpc('codm_fix25_privacy_request_status',{p_request:lookupId.trim(),p_access_code:secret.trim()});
    setBusy(false);
    if(error){setNotice(`Verifica non riuscita: ${error.message}`);return;}
    setTracking(data as Tracking);
  }
  return <div className="ak25-privacy-page"><div className="ak25-privacy-card">
    <p className="eyebrow">🛡️ AK47DX · PRIVACY</p><h1>Richieste privacy</h1>
    <p>Da qui puoi richiedere rettifica, cancellazione o accesso ai dati della tua iscrizione, senza email. Ti serviranno l’ID iscrizione e il codice privato consegnati al termine della registrazione.</p>
    <p className="muted">Non pubblicare e non condividere il codice privato. Le richieste prive del codice devono essere verificate manualmente dall’organizzatore, per proteggere i dati altrui.</p>
    <form className="ak25-privacy-form" onSubmit={submit}>
      <h2>Nuova richiesta</h2>
      <label>ID torneo<input className="input" required value={tournament} onChange={e=>setTournament(e.target.value)} placeholder="UUID del torneo" /></label>
      <label>ID iscrizione<input className="input" required value={signup} onChange={e=>setSignup(e.target.value)} placeholder="UUID ricevuto dopo l’iscrizione" /></label>
      <label>Codice privato<input className="input" required type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Codice personale riservato" /></label>
      <label>Tipo di richiesta<select className="select" value={kind} onChange={e=>setKind(e.target.value)}>{['Rettifica','Cancellazione','Accesso','Limitazione','Opposizione','Altro'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Descrizione<textarea className="textarea" maxLength={1000} required minLength={5} rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Indica quale dato vuoi correggere o cancellare, senza includere documenti o dati sensibili."/></label>
      <button className="btn" type="submit" disabled={busy}>{busy?'Invio…':'Invia richiesta allo staff'}</button>
    </form>
    {requestId&&<div className="ak25-ticket"><b>Numero richiesta:</b> <code>{requestId}</code><button type="button" className="btn small secondary" onClick={()=>void navigator.clipboard.writeText(requestId)}>Copia</button></div>}
    <form className="ak25-privacy-form" onSubmit={lookup}>
      <h2>Controlla lo stato</h2>
      <label>Numero richiesta<input className="input" required value={lookupId} onChange={e=>setLookupId(e.target.value)}/></label>
      <label>Codice privato dell’iscrizione<input className="input" required type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label>
      <button className="btn secondary" type="submit" disabled={busy}>🔍 Verifica stato</button>
      {tracking&&<div className="ak25-ticket"><strong>{tracking.status}</strong>{tracking.response&&<p>{tracking.response}</p>}</div>}
    </form>
    {notice&&<p className="notice" role="status">{notice}</p>}
    <a href="/privacy">← Torna all’informativa</a>
  </div></div>;
}

export default function Page(){return <Suspense fallback={<div className="ak25-privacy-page">Caricamento informativa…</div>}><PrivacyRequestContent /></Suspense>;}
