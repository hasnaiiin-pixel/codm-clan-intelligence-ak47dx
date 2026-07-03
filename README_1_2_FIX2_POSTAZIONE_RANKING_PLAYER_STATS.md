# CODM Clan Intelligence 1.2 FIX2 — Postazione + Ranking + Player Stats

Questa è una patch interna della release 1.2, non una nuova major release.

## Obiettivo

Integrare la schermata Postazione/Hardpoint e rendere più pulito il salvataggio statistiche:

- Import risultati CED e Postazione/Hardpoint.
- Mantiene solo Kill / Death / Assist.
- Punteggio player e impatto non vengono importati perché l'OCR li confondeva troppo.
- Ranking basato sull'ordine visivo della classifica.
- 1° posto = Gold / MVP.
- 2° posto = Silver.
- 3° posto = Bronze.
- 4° e 5° rimangono posizione normale.
- Vale sia per squadra vincente che squadra perdente.
- Posizione media mostrata con decimali.

## Nuove sezioni migliorate

### Import Match

- Un solo tasto principale: `Importa risultati`.
- Modalità supportate: CED e Postazione/Hardpoint.
- Table-lock/calibrazione resta disponibile in impostazioni avanzate.
- Riga giocatore con clan appartenenza, Kill, Death, Assist, medaglia e stato review.

### Player

- Nuova tabella completa di tutti i giocatori.
- Player registrati e manuali restano entrambi nelle statistiche.
- Associazione clan modificabile direttamente.
- Statistiche per player: match, K/D/A, K/D, win rate, Gold, Silver, Bronze, posizione media.
- Player manuali potranno essere collegati a un profilo registrato in futuro.

### Archivio e Analytics

- Dettaglio partita mostra medaglie ranking.
- Analytics mostra Gold/Silver/Bronze per clan e player.
- Filtri esistenti rimangono attivi.

## Backend

Versione attesa:

```json
"version": "1.2.1-postazione-ranking-player-stats"
```

Verifica:

```text
http://127.0.0.1:8780/health
```

## Migrazione Supabase

Eseguire in SQL Editor:

```text
supabase/migration_1_2_fix2_postazione_ranking_player_stats.sql
```

## Nota OCR

Postazione ha più numeri e più rumore. La release importa solo Kill/Death/Assist e ranking, evitando punteggio player e impatto. Alcuni nickname o valori K/D/A possono ancora richiedere revisione manuale, ma il sistema conserva screenshot prova e ranking visuale.
