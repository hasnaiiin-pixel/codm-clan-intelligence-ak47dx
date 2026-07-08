# CLAN MANAGER V11.0A COMPLETE TOURNAMENT PRO - NPM PUBLIC FIX

Release completa CODM/AK47DX basata su V11.0, con fix installazione npm per PC e Vercel.

## Fix importante

La V11.0 precedente aveva alcune URL `resolved` nel `package-lock.json` puntate al registry interno:

```text
packages.applied-caas-gateway1.internal.api.openai.org
```

Queste URL non sono raggiungibili dal PC dell'utente e causavano timeout su `xlsx`.

In questa V11.0A:

- `package-lock.json` usa `https://registry.npmjs.org/`
- `.npmrc` forza `registry=https://registry.npmjs.org/`
- cache PWA aggiornata a V11.0A
- marker `/version` aggiornato
- tutte le funzioni V11.0 restano incluse

## Novità funzionali mantenute

- Torneo Pro separato dal resto della app.
- Iscrizioni prima, squadre dopo.
- Admin può cambiare formato e tipo torneo dopo aver visto iscritti.
- Generazione tabellone/gruppi dopo iscrizioni confermate.
- Bracket grafico con vincitore verde ed eliminato rosso.
- Click su partita per inserire o modificare risultato.
- Eliminazione torneo con dati collegati.
- Armi permesse e vietate nel regolamento torneo.
- Statistiche torneo isolate dentro pagina Torneo.
- Import partita da screenshot oppure da Excel.
- Template Excel incluso in `public/templates/TEMPLATE_IMPORT_RISULTATI_CODM_CLAN_MANAGER.xlsx`.
- Import profilo con stesso selettore template professionale di Import partita.
- SQL schema completo e script caricamento dati in `supabase`.

## Installazione consigliata Windows

Chiudere VS Code, browser localhost e terminali npm aperti, poi:

```bash
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
taskkill /F /IM node.exe
rmdir /s /q node_modules
rmdir /s /q .next
npm cache clean --force
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V11.0A complete tournament pro npm public fix"
git push origin main
```

Se Vercel non parte:

```bash
git commit --allow-empty -m "Force Vercel deploy CLAN MANAGER V11.0A"
git push origin main
```

## Script automatico incluso

Puoi anche usare:

```text
FIX_INSTALL_NPM_PUBLIC_REGISTRY.cmd
```

Questo script chiude Node, imposta il registry pubblico, pulisce `node_modules` e `.next`, poi esegue `npm ci` e `npm run build`.

## SQL

Eseguire in Supabase SQL Editor:

1. `supabase/FINAL_SCHEMA_CLAN_MANAGER.sql`
2. `supabase/LOAD_CODM_V11_REFERENCE_AND_DEMO_DATA.sql` solo se vuoi caricare dati riferimento/demo.

## Verifica

Aprire:

```text
/version
```

Marker atteso:

```text
V11_0A_COMPLETE_TOURNAMENT_PRO_EXCEL_SQL_NPM_PUBLIC_OK
```

Dopo deploy PWA: aprire `/cache-reset`, pulire cache e reinstallare icona.
