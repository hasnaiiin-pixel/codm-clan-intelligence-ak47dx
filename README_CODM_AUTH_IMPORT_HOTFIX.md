# CODM AK47DX - Auth Users + Import Match Hotfix

Questa patch corregge due problemi:

1. Nuovi utenti registrati con email non appaiono in Admin → Utenti.
2. `/import/match` genera `Application error: a client-side exception has occurred`.

## Perché succede

- Il login creava solo l'utente Supabase Auth. L'admin panel non può leggere direttamente `auth.users` dal browser, quindi serve una tabella pubblica `profiles` popolata da trigger.
- La pagina `/import/match` aveva il guard permessi prima degli hook React. Quando cambia sessione/ruolo, React può generare errore client-side.

## File aggiornati

- `app/login/page.tsx`
- `app/profile-import/page.tsx`
- `app/admin/users/page.tsx`
- `app/import/match/page.tsx`
- `src/components/WriteAccessBlock.tsx`
- `supabase/05_auth_profiles_admin_approval.sql`

## Installazione

1. Estrai nella root del progetto.
2. Esegui `APPLICA_CODM_AUTH_IMPORT_HOTFIX.bat`.
3. Se build OK, esegui su Supabase SQL Editor:
   `supabase/05_auth_profiles_admin_approval.sql`
4. Push:

```bat
git add -A
git commit -m "fix: auth user approval and import match client crash"
git push origin main
```

## Test

- Registrati da `/login` con nuova email.
- Accedi con quell'utente e apri `/profile-import`.
- Compila nickname/UID.
- Accedi come owner e apri `/admin/users`.
- Approva utente e assegna ruolo.
- Apri `/import/match`:
  - senza login/staff deve bloccare;
  - con owner/staff/coach deve aprire e salvare partita.
