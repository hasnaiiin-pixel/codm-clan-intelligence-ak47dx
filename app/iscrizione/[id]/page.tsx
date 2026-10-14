'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type PublicTournament = {
  id: string; name: string; description?: string | null; cover_url?: string | null;
  date?: string | null; time?: string | null; format?: string | null; type?: string | null;
  status: string; privacy_url?: string | null; limit?: number | null; registered?: number;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PublicTournamentSignupPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [tournament, setTournament] = useState<PublicTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{reference:string,status:string}|null>(null);
  const [form, setForm] = useState({surname:'',given_name:'',nickname:'',uid:'',privacy:false,website:''});

  useEffect(() => {
    if (!UUID.test(id)) { setError('Link iscrizione non valido.'); setLoading(false); return; }
    let cancelled = false;
    void (async () => {
      const {data,error:dbError} = await supabase.rpc('codm_fix24_public_tournament_info',{p_tournament:id});
      if (cancelled) return;
      if (dbError) setError(`Pagina non disponibile: ${dbError.message}. Contatta l'organizzatore.`);
      else if (!data) setError('Torneo non trovato.');
      else setTournament(data as PublicTournament);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  },[id]);

  const open = tournament?.status === 'Iscrizioni aperte' && Boolean(tournament.privacy_url) &&
    (!tournament.limit || Number(tournament.registered || 0) < tournament.limit);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!open || busy) return;
    if (!/^\d{8,25}$/.test(form.uid.trim())) {setError('UID non valido: inserisci da 8 a 25 cifre, senza spazi.');return;}
    setBusy(true);setError('');
    const {data,error:dbError} = await supabase.rpc('codm_fix24_public_signup',{
      p_tournament:id, p_surname:form.surname.trim(), p_given_name:form.given_name.trim(),
      p_nickname:form.nickname.trim(),p_uid:form.uid.trim(),p_consent:form.privacy,p_website:form.website
    });
    setBusy(false);
    if(dbError) {setError(dbError.message);return;}
    setDone(data as {reference:string,status:string});
  }

  return <div className="ak24-public-page">
    <div className="ak24-public-card">
      <div className="ak24-public-head">
        <span className="ak24-public-eyebrow">🏆 AK47DX · TORNEI COD MOBILE</span>
        <h1>ISCRIZIONE GIOCATORE</h1>
        <p>Iscriviti direttamente dal telefono, senza creare un account.</p>
      </div>
      {loading && <p className="ak24-public-note" role="status">Caricamento torneo…</p>}
      {tournament && <div className="ak24-public-info">
        <h2>{tournament.name}</h2>
        <div className="ak24-public-meta"><span>🎮 {tournament.format || 'Formato da definire'}</span>
          {tournament.date && <span>📅 {tournament.date}</span>}
          {tournament.limit ? <span>👥 {tournament.registered || 0}/{tournament.limit} posti</span> : null}</div>
        <span className={open?'ak24-public-open':'ak24-public-closed'}>{open?'● Iscrizioni aperte':'● Iscrizioni non disponibili'}</span>
      </div>}
      {!loading && !tournament && <p className="ak24-public-error" role="alert">{error || 'Torneo non disponibile.'}</p>}
      {done && <div className="ak24-public-success" role="status"><h2>✅ Iscrizione ricevuta!</h2><p><strong>{form.nickname}</strong> · {tournament?.name}</p><p>Stato: <strong>In attesa di conferma</strong></p><p>Riferimento: <code>{done.reference}</code></p><small>Conserva il riferimento. L'organizzatore verificherà l'iscrizione.</small></div>}
      {tournament && !done && <>
        {!open && <p className="ak24-public-note">{tournament.status!=='Iscrizioni aperte'?'Le iscrizioni per questo torneo sono chiuse.':!tournament.privacy_url?'Informativa privacy non ancora configurata dall’organizzatore.':'Posti disponibili esauriti.'}</p>}
        {open && <form className="ak24-public-form" onSubmit={submit}>
          <div className="ak24-public-fields"><label>Cognome *<input autoComplete="family-name" maxLength={80} minLength={2} required value={form.surname} onChange={e=>setForm({...form,surname:e.target.value})} placeholder="Cognome" /></label>
          <label>Nome *<input autoComplete="given-name" maxLength={80} minLength={2} required value={form.given_name} onChange={e=>setForm({...form,given_name:e.target.value})} placeholder="Nome" /></label></div>
          <label>Nome in gioco CODM *<input maxLength={80} minLength={2} required value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})} placeholder="Es. ѦҞঐMirza" /></label>
          <label>UID COD Mobile *<input type="text" inputMode="numeric" pattern="[0-9]{8,25}" maxLength={25} required value={form.uid} onChange={e=>setForm({...form,uid:e.target.value.replace(/\D/g,'')})} placeholder="UID numerico (non il nickname)" /></label>
          <p className="ak24-public-hint">Trovi l'UID nel profilo COD Mobile. Serve per evitare iscrizioni duplicate.</p>
          <label className="ak24-public-consent"><input type="checkbox" required checked={form.privacy} onChange={e=>setForm({...form,privacy:e.target.checked})}/><span>Ho letto l'<a href={tournament.privacy_url!} target="_blank" rel="noopener noreferrer">informativa privacy</a> e accetto il trattamento dei dati per l'iscrizione al torneo.</span></label>
          <div className="ak24-public-trap" aria-hidden="true"><label>Sito Web <input autoComplete="off" tabIndex={-1} value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></label></div>
          {error && <p className="ak24-public-error" role="alert">{error}</p>}
          <button className="ak24-public-submit" disabled={busy||!form.privacy} type="submit">{busy?'Invio in corso…':'🎮 CONFERMA ISCRIZIONE'}</button>
          <small className="ak24-public-hint">Cognome, nome e UID saranno visibili solo allo staff autorizzato.</small>
        </form>}
      </>}
    </div>
  </div>;
}
