# FIX6 CONNECTION SAFE

Questo fix non cambia il motore OCR validato; corregge il collegamento frontend/backend.

Errore risolto: `Failed to fetch`.

Cause gestite:
- backend non avviato;
- porta vecchia 8765 ancora in uso;
- `.env.local` con URL backend vecchio;
- frontend avviato mentre backend non è ancora pronto.

Controllo corretto:
```text
http://127.0.0.1:8770/health
```

Risposta attesa:
```json
{ "ok": true, "version": "0.8.5-fix5-locked" }
```
