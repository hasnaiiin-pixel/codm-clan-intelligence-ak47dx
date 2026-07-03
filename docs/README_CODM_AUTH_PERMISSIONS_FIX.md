# CODM AK47DX - Auth, Dashboard pubblica e permessi

## Problema risolto

- In locale vedi dati perché usi `.env.local` e/o sei loggato.
- Su Vercel non vedi dati perché mancano env reali o perché RLS permette lettura solo ad utenti autenticati membri del clan.
- Alcune pagine mostrano pulsanti di modifica anche senza controllo ruolo lato UI.

## Ordine corretto

### 1. Verifica Vercel Env

Vercel -> Project -> Settings -> Environment Variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://tuo-link-vercel.vercel.app
```

Poi fai redeploy senza cache.

### 2. Esegui SQL dashboard pubblica

Supabase -> SQL Editor -> New Query:

1. Esegui `supabase/01_public_dashboard_private_writes.sql`
2. Crea utente admin da Authentication -> Users
3. Copia `supabase/02_admin_owner_seed_TEMPLATE.sql`, sostituisci `ADMIN_EMAIL_HERE`, esegui
4. Esegui `supabase/03_player_registration_model.sql`

## Ruoli consigliati

- `owner`: tutto
- `coach`: upload risultati, modifica partite, roster, descrizioni
- `staff`: upload risultati, modifica base
- `player`: vede dati e profilo, non modifica risultati
- `viewer`: sola lettura
- visitatore senza login: solo dashboard pubblica

## Test finale

1. Apri link Vercel da finestra anonima: `/dashboard` deve mostrare dati.
2. Prova `/players` senza login: non dovrebbe essere usato per modificare.
3. Login admin: deve poter caricare/modificare.
4. Login player: deve vedere ma non caricare risultati.

## Prossima patch frontend consigliata

Creare hook `useCodmSessionRole()` e nascondere/disabilitare pulsanti upload/modifica quando ruolo non è `owner`, `coach`, `staff`.

