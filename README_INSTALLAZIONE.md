# CLAN MANAGER V10.0 COMPLETE TOURNAMENT TEMPLATE PRO

Release completa: Torneo separato, iscrizione dal profilo, squadre dopo iscrizioni, formato/tipo modificabile dopo creazione, armi permesse/vietate, statistiche torneo isolate dalla pagina generale, template OCR con menu vero e salvataggio robusto.

## Installazione

Copia il contenuto della cartella `codm_v81b` nella root del progetto GitHub.

Comandi:

```bash
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V10.0 complete tournament template pro"
git push origin main
```

## Verifica

Apri `/version` e controlla marker:

`V10_0_COMPLETE_TOURNAMENT_TEMPLATE_PRO_OK`

## SQL

Esegui `supabase/FINAL_SCHEMA_CLAN_MANAGER.sql` se la parte torneo non è ancora presente o se vuoi aggiungere l'indice anti doppia iscrizione.

## PWA

Dopo deploy apri `/cache-reset`, pulisci cache, chiudi PWA, rimuovi vecchia icona e reinstalla dalla URL Vercel.
