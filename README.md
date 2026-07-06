# CODM AK47DX V5.5 - Clean Start + MIRZA Logo + Medaglie

Base import mantenuta: V5.4 FastLane. Non è stato cambiato il motore OCR funzionante.

## Modifiche
- 1° posto = Oro / MVP
- 2° posto = Argento
- 3° posto = Bronzo
- 4° posto = Legno
- 5° posto = Olimpico
- Logo sviluppatore MIRZA visibile in alto a destra e nel footer in fondo.
- Aggiunto SQL di reset dati test: `supabase/99_RESET_DATABASE_PULITO_KEEP_OWNER.sql`.

## Reset database pulito
1. Apri Supabase -> SQL Editor.
2. Apri `supabase/99_RESET_DATABASE_PULITO_KEEP_OWNER.sql`.
3. Sostituisci `INSERISCI_EMAIL_OWNER` con la tua email principale.
4. Esegui.

Il reset cancella partite/statistiche/eventi/notifiche/roster di prova e mantiene solo l'utente principale come owner.

## Versione
Frontend marker: `V5_5_CLEAN_START_LOGO_MEDALS_OK`
Backend OCR resta: `2.0.10-v5-4-fastlane-import-stabile-ak47dx`
