# CODM Clan Intelligence 1.1 — Profile Roster Stable

Release roadmap 3/5: semplificazione import, statistiche player manuali/guest, filtro clan, archivio partite e UI gaming.

## Novità principali

- Import statistiche semplificato: un solo tasto **🚀 Importa risultati**.
- Niente punteggio player e niente impatto nelle statistiche importate: si salvano solo **Kill / Death / Assist**.
- Se inserisci manualmente un giocatore non registrato, l'app crea un player provvisorio e conserva le sue statistiche.
- Ogni player può avere **clan appartenenza** anche senza profilo completo.
- Le statistiche sono filtrabili per clan di appartenenza.
- In futuro il player provvisorio può essere completato o collegato al profilo CODM registrato.
- Archivio partite con elenco, filtri, dettaglio singola partita, screenshot prova, note e cancellazione.
- Grafica più gaming: icone menu, card dark/neon, pulsanti moderni, select/dropdown leggibili.

## Avvio

```bat
setup_ocr_backend.bat
npm.cmd install
start_all.bat
```

Controllo backend:

```text
http://127.0.0.1:8780/health
```

Versione attesa:

```json
"version": "1.2.0-supabase-analytics-stable"
```

## Supabase

Esegui nel Supabase SQL Editor:

```text
supabase/migration_1_1_profile_roster_stable.sql
```

Serve per:

- rendere sicuro `team_side` con `ALLY/ENEMY`,
- creare/aggiornare archivio righe scoreboard,
- supportare alias player futuri,
- mantenere clan appartenenza e filtri.

## Flusso import consigliato

1. Vai su `/import/match`.
2. Carica screenshot partita.
3. Premi **🚀 Importa risultati**.
4. Controlla nomi, clan appartenenza, Kill, Death, Assist.
5. Se un player non è registrato, lascia “Manuale / non registrato” e scrivi il nome.
6. Salva partita.
7. Vai su `/matches` per consultare la prova e su `/players` per filtrare le statistiche per clan.

## Nota OCR

La release non salva più punteggio player e impatto perché su screenshot CODM questi numeri venivano confusi spesso. La priorità è salvare dati affidabili: Kill / Death / Assist, classifica 1–5, MVP, screenshot prova e note.
