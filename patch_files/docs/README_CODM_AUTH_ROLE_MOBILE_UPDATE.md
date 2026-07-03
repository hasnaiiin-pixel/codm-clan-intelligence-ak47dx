# CODM AK47DX — Auth Role Guard + registrazione player + sidebar mobile

Questa patch implementa:

- Dashboard pubblica sola lettura.
- Login/registrazione email Supabase per player e staff.
- Richiesta profilo player da `/profile-import`.
- Pannello Owner `/admin/users` per approvare richieste e assegnare ruoli.
- Blocco frontend delle pagine operative per chi non è `owner`, `coach` o `staff`.
- RLS Supabase: SELECT pubblico, INSERT/UPDATE/DELETE solo ruoli autorizzati.
- Sidebar/tab laterale sinistra per telefono, invece di avere tutti i pulsanti in alto.

## Ruoli

- `anon`: vede dashboard pubblica, non modifica.
- `registered`: account creato ma non ancora approvato.
- `viewer`: sola lettura.
- `player`: profilo player, sola lettura + richieste.
- `staff`: carica risultati e modifica base.
- `coach`: carica risultati e modifica base.
- `owner`: tutto, incluso gestione utenti/ruoli.

## Ordine aggiornamento

1. Fai backup/tag Git.
2. Esegui SQL `supabase/04_auth_roles_public_read_private_write.sql` su Supabase.
3. Copia i file della patch nel progetto.
4. Esegui `APPLICA_CODM_AUTH_ROLE_MOBILE_FIX.bat`.
5. Fai build locale.
6. Commit/push.
7. Redeploy Vercel senza cache.

## Test obbligatorio

1. Browser anonimo senza login:
   - `/dashboard` deve vedere dati.
   - `/import/match` deve mostrare blocco accesso.
   - non deve poter salvare/caricare nulla.

2. Login con `hasnaiiin@gmail.com` owner:
   - può aprire `/admin/users`.
   - può aprire `/import/match`.
   - può caricare risultati.

3. Nuovo player:
   - si registra da `/login`.
   - apre `/profile-import`.
   - invia nickname/UID.
   - admin approva da `/admin/users`.

## Nota importante

La sicurezza reale è nel SQL/RLS. Il frontend nasconde o blocca i pulsanti, ma Supabase deve comunque impedire scritture non autorizzate.
