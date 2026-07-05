# CODM AK47DX V4.9 - OCR 4.6 STABILE

Questa versione mantiene le pagine/eventi V4.8, ma riporta l'import partita e il backend OCR alla base stabile V4.6.

## Marker frontend

`V4_9_OCR46_STABILE_OK`

## Backend OCR atteso

`2.0.5-v4-6-template-notifications-ak47dx`

## Perché

V4.7/V4.8 hanno aggiunto template-priority e fallback OCR più pesanti. Su localhost funzionano meglio, ma su Render free possono andare in timeout. Questa versione usa il flusso V4.6 più leggero e stabile.

## File riportati a V4.6

- `app/import/match/page.tsx`
- `src/lib/ocrBackend.ts`
- `ocr-backend/*`

## Test

1. Deploy Render con la cartella `ocr-backend` di questa versione.
2. Apri `https://ak47dx-ocr-backend.onrender.com/health`.
3. Deve rispondere con versione `2.0.5-v4-6-template-notifications-ak47dx`.
4. Deploy Vercel.
5. Apri `/version` e verifica `V4_9_OCR46_STABILE_OK`.
6. Apri `/ocr-status`.
7. Prova `/import/match`.
