# AK47DX Clan Manager — V14.2 FIX25 TEST

Web / PWA per iscrizioni ai tornei COD Mobile, squadre, gironi, Winners/Losers, calendario, risultati, esportazioni Excel/PDF.

## Pagine pubbliche incluse
- `/iscrizione/<UUID-torneo>` — partecipazione senza account, Nome/Cognome/Nickname/UID.
- `/privacy?tournament=<UUID-torneo>` — informativa integrata, con identità del titolare indicata dall'organizzatore.
- `/privacy/richiesta?tournament=<UUID-torneo>` — richiesta e consultazione esito senza email.

Il codice personale per esercitare i diritti viene mostrato una sola volta alla fine dell'iscrizione. Non è possibile recuperarlo automaticamente. Le iscrizioni FIX24 antecedenti alla FIX25 non hanno tale codice: occorre una verifica manuale da parte dello staff.

**Non pubblicare il link a nuovi giocatori finché il titolare reale non è indicato e l'informativa non è adattata/verificata.** La registrazione viene bloccata automaticamente se manca il titolare, anche quando il torneo è "Iscrizioni aperte".

## Documentazione
- `README_INSTALLAZIONE.md`: passaggi Windows, Supabase e Vercel.
- `supabase/UPDATE_V14_2_FIX25_PRIVACY_PORTAL.sql`: migrazione NON distruttiva da eseguire dopo FIX24.
- `docs/project_history/RELEASE_NOTES_LEGACY.md`: storico versioni consolidato.

## Test
`npm run test:fix24 && npm run test:fix25 && npm run build`

La distribuzione resta **TEST** finché build Next e integrazione reale Supabase non sono verificate.
