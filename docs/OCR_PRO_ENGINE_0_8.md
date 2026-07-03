# CODM Clan Intelligence 0.8 — OCR PRO ENGINE

## Scopo

Questa versione sostituisce l'approccio basato solo su coordinate frontend con un motore OCR più professionale:

```text
Screenshot da telefono diverso
↓
Backend Python FastAPI
↓
OpenCV normalizza immagine e rimuove margini/bordi
↓
Rilevamento dinamico tabella blu/rossa
↓
Calcolo righe e celle
↓
Tesseract legge numeri, score, K/D/A, impatto
↓
Google Vision opzionale legge testo difficile/nickname
↓
Frontend mostra overlay dei box e tabella correggibile
```

## Cosa contiene

```text
frontend Next.js
ocr-backend FastAPI
OpenCV layout detector
Tesseract numerico
Google Vision opzionale
PaddleOCR predisposto come fallback futuro
overlay box trovati dal backend
start_all.bat
setup_ocr_backend.bat
start_ocr_backend.bat
```

## Setup

1. Copia `.env.local` dalla versione precedente.
2. Esegui `setup_ocr_backend.bat`.
3. Esegui `start_all.bat`.

Oppure manualmente:

```powershell
cd ocr-backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Poi in un altro terminale:

```powershell
npm.cmd install
npm.cmd run dev
```

## Uso

Apri:

```text
http://localhost:3000/import/match
```

Carica screenshot CED e usa:

```text
OCR Backend Pro 0.8
```

Se il backend non è avviato, usa il pulsante fallback:

```text
OCR browser/calibrato 0.7
```

## Note importanti

- Questa 0.8 è focalizzata su scoreboard CED.
- Team blu e team rosso sono sempre separati.
- Rapporto U/M totale, Precisione e Headshot% sono ignorati nello scoreboard.
- Nickname con simboli strani possono richiedere associazione manuale al roster.
- Le box rilevate dal backend vengono mostrate sopra l'immagine per diagnosticare il puntamento.
