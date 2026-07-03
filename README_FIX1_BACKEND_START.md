# FIX1 - Backend uvicorn non riconosciuto

Errore risolto:

```text
"uvicorn" non è riconosciuto come comando interno o esterno
```

La correzione è nei file BAT:

- `setup_ocr_backend.bat`
- `start_ocr_backend.bat`
- `start_all.bat`

Ora il backend non usa più il comando globale `uvicorn`, ma avvia Uvicorn dal venv locale:

```bat
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

## Avvio corretto

1. Esegui una volta:

```bat
setup_ocr_backend.bat
```

2. Poi avvia tutto:

```bat
start_all.bat
```

Oppure solo backend:

```bat
start_ocr_backend.bat
```

3. Test backend:

```text
http://127.0.0.1:8765/health
```
