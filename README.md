# Clan Manager — CODM AK47DX V6.6

Build preparata partendo da `CODM_AK47DX_V6_5_EVENTS_IMPORT_BAN_PERSIST_FLOW_BUILD.zip`.

## Controllo eseguito
- `npm ci --legacy-peer-deps` OK.
- `npm run build` OK fino a `Compiled successfully` e `Generating static pages (33/33)`.
- Nel sandbox Next resta lungo su `Collecting build traces`, comportamento già visto nelle build precedenti. Su PC/Vercel verificare con Node 24.x.

## Cambi principali V6.6
- Nome app aggiornato a **Clan Manager** in metadata, manifest PWA, sidebar e footer.
- Pagina Eventi: editor partite in griglia con **2 partite sulla stessa riga** su desktop.
- Ogni partita ha **numero/codice univoco** visibile in editor, riepilogo, import e messaggio Telegram.
- Messaggio Telegram ordinato per:
  - Partita 1 dettagli;
  - titolari e riserve della Partita 1;
  - Partita 2 dettagli;
  - titolari e riserve della Partita 2;
  - successive partite.
- Pagina **Regolamento clan** aggiunta a menu pubblico.
- Import risultato da Eventi: bozza persistente in localStorage fino a salvataggio; se cambi tab Chrome o apri una cartella, i dati non vengono svuotati.
- Registrazione player: nome, email e nome in gioco; il **nome in gioco viene inserito automaticamente nel roster**.
- Join invito: crea/aggiorna player in roster automaticamente.
- Mio profilo e profilo player unificati in `/profile`; rimane solo **Importa profilo** per screenshot/profilo CODM.
- Menu pulito: rimossa voce separata “Profilo player”.

## Comandi consigliati
```bash
npm ci --legacy-peer-deps
npm run build
npm run dev
```

## Commit suggerito
```bash
git add -A
git commit -m "fix: CODM v6.6 clan manager events persist roster rules"
git push origin main
```
