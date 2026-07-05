# CODM AK47DX V5.6 — Profile FastLane stabile

Questa versione mantiene l'import partite V5.4 FastLane funzionante e allinea Import Profilo / Statistiche giocatore.

## Modifiche principali

- Import partite non toccato.
- Profilo OCR V5.6 FastLane: non si blocca più sul controllo `/health`.
- `/health` è solo informativo; l'import profilo prova direttamente `/ocr/profile`.
- Progress percentuale profilo: upload, OCR Render, applicazione campi.
- Backend profilo più leggero: niente Google/Paddle prima di Tesseract, numeri Leggendario letti con fast numeric.
- Layout Import Profilo/Statistiche più largo e leggibile.
- Frontend: `V5_6_PROFILE_FASTLANE_STABILE_OK`.
- Backend: `2.0.11-v5-6-profile-fastlane-stabile-ak47dx`.

## Installazione

Copia il contenuto dello ZIP nella root progetto mantenendo solo `.git` e `.env.local`, poi esegui:

```bat
APPLICA_PUSH_V5_6.bat
```

## Render

Aggiorna Render con la cartella `ocr-backend` di questa versione.
Dopo deploy, `/health` deve mostrare:

```txt
2.0.11-v5-6-profile-fastlane-stabile-ak47dx
```

## Test

- `/version` deve mostrare `V5_6_PROFILE_FASTLANE_STABILE_OK`.
- `/import/match` deve continuare a usare FastLane V5.4.
- `/import/profile` deve usare il nuovo Profile FastLane V5.6.
