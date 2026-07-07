# CLAN MANAGER V8.1B - UUID REGEX FIX

Correzione critica: la regex UUID lato server era sbagliata e rifiutava UUID validi come `8d285302-1ef6-4761-ae6f-6f4dfcd08e01`.

## Cosa cambia
- `src/lib/server/codmEventsApi.ts`: UUID_RE corretta.
- Nessuna modifica database richiesta se hai già fatto reset pulito.
- `/events-health` ora deve accettare il clan UUID valido.

## Deploy
```bash
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.1B fix validazione UUID clan"
git push origin main
```

Dopo deploy apri `/version` e verifica `V8_1B_UUID_REGEX_FIX_OK`, poi `/events-health` dopo login.
