# V13.4 - Fix conferma registrazione

## Correzione
- Dopo la creazione account viene mostrata una pagina valida "Registrazione completata" invece di una rotta 404.
- Il link email apre `/auth/callback` e mostra "Iscrizione confermata".
- Aggiunte rotte compatibili `/auth/confirm` e `/confirmed` per evitare 404 con configurazioni o link precedenti.

## Supabase Auth
In Authentication > URL Configuration impostare:
- Site URL: URL pubblico Vercel, senza slash finale.
- Redirect URLs:
  - `https://TUO-DOMINIO.vercel.app/auth/callback`
  - `https://TUO-DOMINIO.vercel.app/auth/confirm`
  - `https://TUO-DOMINIO.vercel.app/confirmed`

Su Vercel impostare:
`NEXT_PUBLIC_APP_URL=https://TUO-DOMINIO.vercel.app`

Dopo ogni modifica alle variabili Vercel fare Redeploy.
