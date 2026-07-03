# CODM Clan Intelligence — OCR Layout 0.4

Questa versione corregge il problema della lettura casuale dello scoreboard.

## Cambiamenti principali

- Lettura risultato partita da area dedicata in alto sinistra.
- Lettura modalità/mappa da area dedicata sotto il risultato.
- Team blu e team rosso sempre separati.
- Ogni riga viene letta a celle: nickname, score, K/D/A, obiettivo/tempo/catturate, impatto.
- Supporto specifico per CED, Postazione/Hardpoint e Dominio.
- Debug OCR migliorato con ritagli delle celle principali.
- In salvataggio, il team blu viene collegato al roster; il team rosso viene archiviato nel raw import per confronto.

## Perché è diverso dalla 0.3

La 0.3 leggeva molte zone ma poi provava ancora a ricostruire la riga completa. CODM ha avatar, rank, icone MVP, simboli clan e font piccoli: questo rende la riga intera poco affidabile. La 0.4 usa un layout fisso relativo allo screenshot e legge ogni cella separatamente.

## Note operative

- Usare screenshot originale, non compresso da WhatsApp quando possibile.
- Non ritagliare la parte alta con risultato/mappa.
- Non ritagliare i bordi del tabellone blu/rosso.
- Controllare sempre nickname e K/D/A prima di salvare.
