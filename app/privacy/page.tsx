'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function PrivacyContent() {
  const params = useSearchParams();
  const tournamentId = params.get('tournament') || '';
  const [controller, setController] = useState('');
  const [tournament, setTournament] = useState('');
  useEffect(() => {
    if (!UUID.test(tournamentId)) return;
    let active = true;
    void supabase.rpc('codm_fix24_public_tournament_info', {p_tournament:tournamentId}).then(({data}) => {
      if (active && data) { setController(String(data.controller_name || '')); setTournament(String(data.name || '')); }
    });
    return () => {active = false;};
  }, [tournamentId]);
  const requestUrl = '/privacy/richiesta' + (UUID.test(tournamentId) ? `?tournament=${encodeURIComponent(tournamentId)}` : '');
  return <div className="ak25-privacy-page"><article className="ak25-privacy-card">
    <p className="eyebrow">🛡️ AK47DX · TUTELA DATI</p>
    <h1>Informativa privacy — iscrizioni ai tornei</h1>
    <p className="muted">Versione 1 · 14 ottobre 2026. Questa informativa riguarda le iscrizioni pubbliche ai tornei organizzati tramite AK47DX Clan Manager.</p>
    {tournament && <p className="notice"><b>Torneo:</b> {tournament}</p>}
    <section><h2>1. Titolare e contatto</h2>
      {controller ? <p>Il titolare indicato dall’organizzatore per questo torneo è <b>{controller}</b>.</p> : <p className="ak25-warning"><b>Informativa non ancora completa.</b> Il titolare effettivo deve essere identificato dall’organizzatore nelle impostazioni del torneo prima di aprire la raccolta di dati.</p>}
      <p>Per contattare l’organizzatore in merito ai dati di una tua iscrizione, utilizza il <a href={requestUrl}>modulo richieste privacy del sito</a>, senza email. La risposta è consultabile con il codice personale.</p>
    </section>
    <section><h2>2. Dati raccolti e finalità</h2><p>Raccogliamo cognome, nome, nickname COD Mobile, UID, data e ora dell’iscrizione e presa visione dell’informativa. Servono per identificare i partecipanti, evitare doppie iscrizioni, comporre squadre e gironi, organizzare incontri e gestire risultati e comunicazioni relative al torneo. Il nickname può essere mostrato negli elenchi pubblici, ma cognome, nome e UID sono riservati allo staff autorizzato.</p></section>
    <section><h2>3. Base giuridica e conferimento</h2><p>Il trattamento è necessario per gestire la partecipazione richiesta al torneo (art. 6, par. 1, lett. b GDPR, ove applicabile). La casella nel modulo attesta la presa visione dell’informativa, non autorizza finalità promozionali. Senza i dati obbligatori non è possibile completare l’iscrizione.</p></section>
    <section><h2>4. Destinatari e strumenti</h2><p>I dati sono accessibili allo staff autorizzato del torneo e trattati attraverso i servizi tecnici impiegati dal sito (inclusi hosting e database Supabase). Gli eventuali trasferimenti internazionali dipendono dalle configurazioni e dagli accordi con tali fornitori, che il titolare deve verificare prima della pubblicazione.</p></section>
    <section><h2>5. Conservazione</h2><p>I dati anagrafici e UID vengono conservati per il tempo necessario a organizzare e concludere il torneo e gestire eventuali contestazioni, secondo i tempi stabiliti dal titolare. I risultati sportivi possono essere conservati nello storico con i soli nickname quando possibile. L’organizzatore deve definire e applicare una durata concreta di conservazione, oltre alle eventuali obbligazioni di legge.</p></section>
    <section><h2>6. Diritti e richieste senza email</h2><p>Puoi chiedere accesso, correzione, cancellazione, limitazione o opposizione ove applicabile, e revocare eventuali consensi. Usa il codice personale ricevuto dopo l’iscrizione per inviare una richiesta e consultarne lo stato. Le richieste sono gestite normalmente entro un mese, salvo le proroghe consentite dal GDPR. Puoi anche presentare reclamo al <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener noreferrer">Garante per la protezione dei dati personali</a>.</p></section>
    <section><h2>7. Decisioni automatizzate</h2><p>Il sito controlla automaticamente formato dell’UID, duplicati e disponibilità posti; la conferma della partecipazione spetta allo staff. Non è prevista profilazione per decisioni con effetti giuridici sui partecipanti.</p></section>
    <div className="ak25-privacy-actions"><a className="btn" href={requestUrl}>📝 Richiedi modifica o cancellazione</a><a className="btn secondary" href="/tournament">Tornei</a></div>
    <p className="ak25-warning"><strong>Nota per l’organizzatore:</strong> questo testo è una base precompilata, da verificare e adattare al trattamento effettivo, ai fornitori, ai tempi di conservazione e all’identità del titolare prima dell’utilizzo pubblico.</p>
  </article></div>;
}

export default function Page(){return <Suspense fallback={<div className="ak25-privacy-page">Caricamento informativa…</div>}><PrivacyContent /></Suspense>;}
