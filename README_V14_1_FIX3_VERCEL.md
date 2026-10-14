# AK47DX V14.1 FIX3 — Correzione errore Vercel TypeScript

**Problema**: app/import/match/page.tsx riga 1591 — Property 'match_scope' does not exist on type '{ id: string }'.

**Soluzione**: rimosso il controllo su match.match_scope dopo il salvataggio. Quel controllo era sia mal tipizzato (oggetto con solo id) sia posizionato in modo scorretto: poteva segnalare errore a partita già salvata. Il controllo che impedisce di modificare una serie come partita singola resta in loadExistingMatchForEdit(), dove viene letta la riga completa dal database.

## Applicare la patch
1. Estrai il presente ZIP.
2. Copia app/import/match/page.tsx nella cartella app/import/match/ del tuo repository Git, sovrascrivendo il file.
3. Esegui npm ci --legacy-peer-deps e npm run build.
4. Se il build locale supera tutti i controlli, esegui git add -A, git commit -m "AK47DX V14.1 FIX3 match scope" e git push origin main.

Non eseguire script SQL: questa patch cambia solo codice frontend.
Non sovrascrivere file .env, né ripubblicare il backup. La patch presuppone che tu abbia già FIX1 e FIX2.

Verifiche in ambiente di preparazione: sintassi TS/TSX (75 file), controllo posizione guard e flusso di salvataggio. Non certificato un build Next.js completo: dipendenze npm non scaricabili nell'ambiente di preparazione.
