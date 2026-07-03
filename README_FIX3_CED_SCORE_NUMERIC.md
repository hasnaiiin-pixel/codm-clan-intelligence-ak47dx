# FIX3 CED SCORE + NUMERIC OCR

Questo FIX3 corregge il problema visto nello screenshot dove il backend aveva:

```text
DRAW
11 : 11
OCR confidence 0%
```

## Cosa è stato corretto

1. Il detector tabella non legge più da y=0.
2. La tabella blu/rossa viene cercata solo nella fascia scoreboard.
3. Lo score partita CED viene accettato solo se plausibile: 0..7.
4. Aggiunto riconoscimento colore per score alto blu/rosso.
5. Aggiunto rilevamento colore della scritta VITTORIA/SCONFITTA.
6. Migliorata lettura K/D/A con crop corretto.
7. Migliorata lettura score player con più scale OCR.
8. Corretto crop IMPATTO, che prima era troppo a destra.

## Risultato atteso sul tuo screenshot CED

```text
WIN
blu 6
rosso 0
team blu 5 righe
team rosso 5 righe
MVP_WIN sul primo blu
MVP_LOSE sul primo rosso
```

## Avvio

Esegui:

```bat
setup_ocr_backend.bat
start_all.bat
```

Oppure se hai già fatto setup:

```bat
start_all.bat
```

Poi apri:

```text
http://localhost:3000/import/match
```

Usa il pulsante:

```text
OCR Backend Pro 0.8
```
