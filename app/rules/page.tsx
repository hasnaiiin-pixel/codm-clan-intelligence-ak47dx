'use client';

import { useEffect, useState } from 'react';

const RULES_KEY = 'clan_manager_rules_v6_6';
const defaultRules = `# REGOLAMENTO CLAN

1. Rispetto obbligatorio verso compagni, staff e avversari.
2. Presenza agli eventi: se sei convocato e non puoi esserci, avvisa prima.
3. Durante scrim/tornei si seguono le indicazioni di coach e capitano.
4. Vietato usare armi, perk, scorestreak o operatori inseriti nei BAN evento.
5. Screenshot risultati: chi carica la partita deve verificare score, MVP e nickname.
6. Roster: il nome in gioco registrato nell'app entra automaticamente nel roster.
7. Cambi nome: aggiorna sempre il profilo personale e importa il profilo se necessario.
8. Comportamenti tossici, insulti o abbandoni ripetuti possono portare a rimozione dal roster.`;

export default function RulesPage() {
  const [rules, setRules] = useState(defaultRules);
  const [edit, setEdit] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try { setRules(localStorage.getItem(RULES_KEY) || defaultRules); } catch {}
  }, []);

  function save() {
    try { localStorage.setItem(RULES_KEY, rules); setMessage('Regolamento salvato localmente.'); setEdit(false); } catch { setMessage('Errore salvataggio regolamento.'); }
  }

  return (
    <main className="container wide rules-page-v66">
      <section className="card gaming-panel rules-hero">
        <p className="eyebrow">📜 Clan Manager</p>
        <h1>Regolamento clan</h1>
        <p className="muted">Pagina dedicata alle regole del clan, consultabile da tutti e modificabile localmente dallo staff sul dispositivo.</p>
        <div className="hero-actions"><button className="btn secondary" onClick={() => setEdit((v) => !v)}>{edit ? 'Annulla modifica' : 'Modifica regolamento'}</button></div>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="card top-gap">
        {edit ? (
          <div className="form">
            <div className="field"><label>Testo regolamento</label><textarea className="input rules-textarea" value={rules} onChange={(e) => setRules(e.target.value)} /></div>
            <button className="btn" onClick={save}>💾 Salva regolamento</button>
          </div>
        ) : (
          <div className="rules-render">
            {rules.split('\n').map((line, index) => {
              if (line.startsWith('# ')) return <h2 key={index}>{line.replace('# ', '')}</h2>;
              if (!line.trim()) return <br key={index} />;
              return <p key={index}>{line}</p>;
            })}
          </div>
        )}
      </section>
    </main>
  );
}
