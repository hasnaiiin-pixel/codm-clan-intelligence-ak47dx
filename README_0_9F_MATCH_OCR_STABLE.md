# CODM Clan Intelligence 0.9F - MATCH OCR STABLE

Versione concentrata sulla stabilità dell'import statistiche partita CED.

## Modifiche principali

- Backend OCR `0.9.5-match-ocr-stable`.
- Pulsante OCR non resta più bloccato: aggiunto timeout lato frontend e timeout Tesseract lato backend.
- Lettura numerica riga intera: score + Kill / Death / Assist + impatto vengono letti insieme e confrontati.
- Header largo per leggere meglio data/ora partita e mappa sotto VITTORIA/SCONFITTA.
- Label UI aggiornate da K/D/A a Kill / Death / Assist.
- Screenshot partita salvato in Supabase Storage come prova allegata.
- Campo note partita aggiunto nell'import.
- Archivio classifica 1-5 di entrambe le squadre in `match_scoreboard_rows`.
- MVP vincente/perdente calcolato dalla posizione riga 1 e dalla squadra vincente.

## Versione backend attesa

Apri:

```text
http://127.0.0.1:8780/health
```

Deve mostrare:

```json
"version": "0.9.5-match-ocr-stable"
```

## Migrazione Supabase

Se aggiorni da una versione precedente, esegui in Supabase SQL Editor:

```text
supabase/migration_0_9F_match_ocr_stable.sql
```

Serve per creare l'archivio classifica 1-5 e i campi prova screenshot.

## Uso consigliato

1. Apri `/calibration` e verifica `TEAM_BLUE_TABLE_FULL` e `TEAM_RED_TABLE_FULL`.
2. Vai in `/import/match`.
3. Lascia `Usa calibrazione = Sì`.
4. Usa `Table-lock consigliato`.
5. Seleziona `Nostro team = blu` o `rosso`.
6. Premi `OCR Hybrid Pro 0.9F`.
7. Controlla campi gialli/manuali.
8. Inserisci eventuali note partita.
9. Salva partita, screenshot prova e statistiche.

## Nota

OCR è più stabile e non deve inventare dati, ma alcuni nickname/simboli CODM possono richiedere conferma manuale o Google Vision nella versione cloud.
