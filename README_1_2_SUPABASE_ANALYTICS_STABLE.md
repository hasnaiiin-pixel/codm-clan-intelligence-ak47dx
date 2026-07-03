# CODM Clan Intelligence 1.2 - Supabase Analytics Stable

Release roadmap 1.2 dedicata a storico partite, statistiche, grafici e sezione Clan HQ.

## Nuove sezioni

### /matches - Archivio partite
- elenco partite salvate
- apertura dettaglio singola partita
- screenshot prova allegato
- note partita
- cancellazione partita con conferma
- filtri avanzati per data, modalità, tipo, esito, MVP, clan, posizione 1-5, review e ricerca libera

### /analytics - Statistiche
- statistiche clan e player
- grafici a torta CSS per vittorie/sconfitte, modalità, mappe, ranking 1-5 e MVP
- filtro per clan appartenenza
- filtro per modalità
- top player per Kill / Death / Assist, K/D, MVP e posizione media

### /clan - Clan HQ
- storia del clan
- motto
- capi clan
- vice e amministratori
- link social: Discord, WhatsApp, TikTok, YouTube, Instagram
- avvisi clan
- statistiche per clan e giocatori del clan
- backup locale nel browser e salvataggio Supabase con migrazione 1.2

## UI gaming
- tasti superiori più gaming
- menu con simboli
- dropdown scuri leggibili
- card dark/neon
- badge MVP e statistiche

## Migrazione Supabase
Eseguire nel SQL Editor:

```sql
supabase/migration_1_2_supabase_analytics_stable.sql
```

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
