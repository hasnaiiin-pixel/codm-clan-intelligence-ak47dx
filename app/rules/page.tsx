'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCodmAuth } from '@/lib/authRoles';
import { loadClanIdentity, clanDisplayName } from '@/lib/clanIdentity';
import { getEphemeralValue, setEphemeralValue } from '@/lib/ephemeralStore';

type RuleSection = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  rules: string[];
  image?: string;
};

type RulesDocument = {
  clanName: string;
  clanTag: string;
  logoUrl: string;
  updatedAt: string;
  sections: RuleSection[];
};

const RULES_KEY = 'clan_manager_rules_v6_7_structured';

const defaultSections: RuleSection[] = [
  {
    id: 'identita',
    icon: '🐺',
    title: 'Identità del clan',
    subtitle: 'Il TAG del clan e il comportamento in partita rappresentano tutto il gruppo.',
    rules: [
      'Ogni player deve usare un nome riconoscibile e coerente con il roster dell’app.',
      'Il TAG ufficiale viene gestito da Admin in Clan HQ e assegnato automaticamente ai player registrati.',
      'Il player che cambia nome in gioco deve aggiornare subito Mio Profilo / Importa profilo.',
      'Rispetto, presenza e collaborazione vengono considerati importanti quanto le statistiche.'
    ]
  },
  {
    id: 'rispetto',
    icon: '🤝',
    title: 'Rispetto e comportamento',
    subtitle: 'Regola base: zero tossicità, zero insulti, zero flame verso compagni e avversari.',
    rules: [
      'È vietato insultare, provocare, offendere o creare discussioni inutili in chat, Discord, Telegram o lobby.',
      'Durante scrim e tornei parla solo chi gestisce call, strategia o comunicazioni utili.',
      'Le critiche si fanno in modo costruttivo dopo la partita, mai durante round decisivi.',
      'Abbandoni volontari, AFK non giustificati o comportamenti antisportivi possono portare a sospensione dal roster.'
    ]
  },
  {
    id: 'roster',
    icon: '👥',
    title: 'Roster e registrazione player',
    subtitle: 'Il roster deve rimanere pulito: chi si registra nell’app appare automaticamente tra i giocatori.',
    rules: [
      'Registrazione obbligatoria con nome, email e nome in gioco CODM.',
      'Il nome in gioco viene inserito automaticamente nel roster e può essere usato per convocazioni, titolari e riserve.',
      'Staff e admin possono correggere ruolo, UID, rank, clan/tag o note del player.',
      'Player non presenti nel roster non devono essere selezionati come titolari o riserve negli eventi ufficiali.'
    ]
  },
  {
    id: 'eventi',
    icon: '📅',
    title: 'Eventi, scrim e convocazioni',
    subtitle: 'Ogni evento contiene Partita 1, Partita 2, Partita 3 ecc. con orari, mappa, modalità e convocati.',
    rules: [
      'Gli eventi vanno creati nella pagina Eventi con orario ritrovo, apertura lobby e orario partita.',
      'Titolari e riserve devono essere scelti dal roster registrato nell’app.',
      'Se sei convocato e non puoi partecipare devi avvisare prima dell’orario di ritrovo.',
      'Il messaggio Telegram ufficiale riporta dettagli partita, titolari, riserve, BAN e orari.'
    ]
  },
  {
    id: 'competitivo',
    icon: '🎮',
    title: 'Regole competitive CODM',
    subtitle: 'Modalità, punteggio round e punteggio devono rispettare la tipologia selezionata nell’evento.',
    rules: [
      'Le modalità principali sono Cerca e Distruggi, Postazione, Dominio, Control, TDM, Prima Linea e Battle Royale.',
      'La mappa deve essere scelta dalla lista CODM dell’app, non scritta manualmente in modo casuale.',
      'Tipologia round/punteggio e target devono essere chiari prima della partita.',
      'In caso di errore lobby o mappa sbagliata si ripete solo se staff/coach lo conferma.'
    ]
  },
  {
    id: 'ban',
    icon: '🚫',
    title: 'BAN partita e loadout vietati',
    subtitle: 'Ogni partita può avere BAN specifici: armi, perk, granate, operator skill e scorestreak.',
    rules: [
      'È vietato usare qualsiasi elemento inserito nella lista BAN della partita.',
      'I BAN devono essere comunicati prima del match e riportati nel riepilogo evento/Telegram.',
      'Esempi: shotgun vietati, NA-45, Akimbo, Termite, Molotov, Persistenza, abilità operatore, scorestreak vietati.',
      'Uso volontario di un BAN può portare ad annullamento della partita o esclusione temporanea dal team.'
    ]
  },
  {
    id: 'risultati',
    icon: '📸',
    title: 'Risultati, screenshot e MVP',
    subtitle: 'Score e MVP non devono essere compilati a mano nell’evento: arrivano da Importa partita.',
    rules: [
      'Dopo la partita si usa Importa partita dall’evento corretto e dalla partita corretta.',
      'La pagina import deve mostrare che stai importando da Eventi e caricare già modalità/mappa selezionata.',
      'Score, esito Vinto/Perso/Pareggiato e MVP vengono aggiornati automaticamente dopo Salva partita.',
      'Screenshot o prova risultato devono essere conservati per evitare contestazioni.'
    ]
  },
  {
    id: 'sanzioni',
    icon: '⚠️',
    title: 'Richiami e sanzioni',
    subtitle: 'La gestione deve essere chiara e progressiva: avviso, sospensione, rimozione se necessario.',
    rules: [
      'Primo problema: richiamo verbale o messaggio privato dello staff.',
      'Problemi ripetuti: sospensione da scrim, tornei o roster competitivo.',
      'Comportamenti gravi: rimozione dal gruppo o dal roster senza obbligo di preavviso.',
      'Lo staff può valutare eccezioni solo con motivazione chiara e condivisa.'
    ]
  }
];

function defaultDocument(): RulesDocument {
  return {
    clanName: 'AK47DX',
    clanTag: 'AK47DX',
    logoUrl: '/assets/ak47dx-logo.jpeg',
    updatedAt: new Date().toISOString(),
    sections: defaultSections
  };
}

function readImage(file: File | null | undefined, cb: (url: string) => void) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => cb(String(reader.result || ''));
  reader.readAsDataURL(file);
}

export default function RulesPage() {
  const auth = useCodmAuth();
  const [doc, setDoc] = useState<RulesDocument>(() => defaultDocument());
  const [edit, setEdit] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const saved = getEphemeralValue<string>(RULES_KEY);
      if (saved) setDoc(JSON.parse(saved) as RulesDocument);
    } catch {}
    loadClanIdentity().then((identity) => {
      setDoc((current) => ({
        ...current,
        clanName: identity.clanName,
        clanTag: clanDisplayName(identity),
        logoUrl: identity.logoUrl || current.logoUrl || '/assets/ak47dx-logo.jpeg'
      }));
    }).catch(() => undefined);
  }, []);

  const canEdit = auth.canWrite || edit;
  const totals = useMemo(() => ({ sections: doc.sections.length, rules: doc.sections.reduce((sum, section) => sum + section.rules.length, 0) }), [doc.sections]);

  function save() {
    const next = { ...doc, updatedAt: new Date().toISOString() };
    try { setEphemeralValue(RULES_KEY, JSON.stringify(next)); setDoc(next); setMessage('Regolamento salvato nella sessione corrente.'); setEdit(false); } catch { setMessage('Errore salvataggio regolamento.'); }
  }

  function updateSection(index: number, patch: Partial<RuleSection>) {
    setDoc((current) => ({ ...current, sections: current.sections.map((section, i) => i === index ? { ...section, ...patch } : section) }));
  }

  function updateRule(sectionIndex: number, ruleIndex: number, value: string) {
    setDoc((current) => ({
      ...current,
      sections: current.sections.map((section, i) => i === sectionIndex ? { ...section, rules: section.rules.map((rule, r) => r === ruleIndex ? value : rule) } : section)
    }));
  }

  function addRule(sectionIndex: number) {
    setDoc((current) => ({ ...current, sections: current.sections.map((section, i) => i === sectionIndex ? { ...section, rules: [...section.rules, 'Nuova regola da completare.'] } : section) }));
  }

  function removeRule(sectionIndex: number, ruleIndex: number) {
    setDoc((current) => ({ ...current, sections: current.sections.map((section, i) => i === sectionIndex ? { ...section, rules: section.rules.filter((_, r) => r !== ruleIndex) } : section) }));
  }

  function addSection() {
    setDoc((current) => ({ ...current, sections: [...current.sections, { id: `custom-${Date.now()}`, icon: '📌', title: 'Nuova sezione', subtitle: 'Descrizione sezione.', rules: ['Prima regola da completare.'] }] }));
  }

  return (
    <main className="container wide rules-page-v67">
      <section className="card gaming-panel rules-hero-v67">
        <div className="rules-logo-stack">
          <img className="rules-clan-logo" src={doc.logoUrl || '/assets/ak47dx-logo.jpeg'} alt={`Logo ${doc.clanTag}`} />
          <div>
            <p className="eyebrow">📜 Clan Manager · Regolamento ufficiale</p>
            <h1>{doc.clanTag}</h1>
            <p className="muted">{doc.clanName} · sezioni {totals.sections} · regole {totals.rules} · aggiornato {new Date(doc.updatedAt).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
        <div className="rules-dev-mark"><img src="/assets/mirza-developer-logo.png" alt="MIRZA developer logo" /><span>Developed by MIRZA</span></div>
        <div className="hero-actions">
          <button className="btn secondary" onClick={() => setEdit((v) => !v)}>{edit ? 'Chiudi modifica' : 'Modifica regolamento'}</button>
          {edit && <button className="btn" onClick={save}>💾 Salva regolamento</button>}
        </div>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      {edit && <section className="card top-gap rules-admin-panel">
        <h2>Editor regolamento</h2>
        <p className="muted">Puoi modificare testi, icone e immagini di ogni sezione. Le immagini vengono salvate nel browser come anteprima/base64.</p>
        <div className="grid grid-3 top-gap">
          <div className="field"><label>Nome clan</label><input className="input" value={doc.clanName} onChange={(e) => setDoc((current) => ({ ...current, clanName: e.target.value }))} /></div>
          <div className="field"><label>TAG clan</label><input className="input" value={doc.clanTag} onChange={(e) => setDoc((current) => ({ ...current, clanTag: e.target.value }))} /></div>
          <div className="field"><label>Logo regolamento</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => setDoc((current) => ({ ...current, logoUrl: url })))} /></div>
        </div>
        <button className="btn secondary top-gap" onClick={addSection}>+ Aggiungi sezione</button>
      </section>}

      <section className="rules-section-grid top-gap">
        {doc.sections.map((section, index) => (
          <article key={section.id} className="rules-section-card">
            {section.image ? <img className="rules-section-image" src={section.image} alt={section.title} /> : <div className="rules-section-visual"><span>{section.icon}</span></div>}
            <div className="rules-section-head">
              <span className="rules-icon">{section.icon}</span>
              <div>
                {edit ? <input className="input" value={section.title} onChange={(e) => updateSection(index, { title: e.target.value })} /> : <h2>{section.title}</h2>}
                {edit ? <input className="input" value={section.subtitle} onChange={(e) => updateSection(index, { subtitle: e.target.value })} /> : <p className="muted">{section.subtitle}</p>}
              </div>
            </div>
            {edit && <div className="grid grid-2 top-gap">
              <div className="field"><label>Icona</label><input className="input" value={section.icon} onChange={(e) => updateSection(index, { icon: e.target.value })} /></div>
              <div className="field"><label>Immagine sezione</label><input className="input" type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (url) => updateSection(index, { image: url }))} /></div>
            </div>}
            <div className="rules-list">
              {section.rules.map((rule, ruleIndex) => edit ? (
                <div key={ruleIndex} className="rules-edit-row"><textarea className="input" value={rule} onChange={(e) => updateRule(index, ruleIndex, e.target.value)} /><button className="btn small danger secondary" type="button" onClick={() => removeRule(index, ruleIndex)}>Elimina</button></div>
              ) : (
                <div key={ruleIndex} className="rule-line"><span>{ruleIndex + 1}</span><p>{rule}</p></div>
              ))}
            </div>
            {edit && <button className="btn small secondary top-gap" type="button" onClick={() => addRule(index)}>+ Regola</button>}
          </article>
        ))}
      </section>
    </main>
  );
}
