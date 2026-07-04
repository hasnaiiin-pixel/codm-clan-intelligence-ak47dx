# CODM AK47DX - AUTH USERS + IMPORT MATCH HOTFIX V2

Questa versione corregge il pacchetto precedente: ora i file sono dentro `patch_source/` e il BAT li copia nella root reale del progetto.

## Correzioni

- Nuovi utenti registrati da email creano/aggiornano `profiles` e richiesta `clan_invite_requests`.
- Nuova pagina `/profile-import` per inviare nickname CODM e UID.
- `/admin/users` mostra richieste pending e membri clan.
- Owner può approvare player e assegnare ruolo.
- `/import/match` viene patchato senza rompere gli hook React: il blocco permessi viene spostato in un wrapper.
- Rimuove `patch_files/` e duplicati root che facevano compilare file temporanei.

## Uso

1. Estrai tutto lo ZIP nella root del progetto CODM.
2. Avvia:

```bat
APPLICA_CODM_AUTH_IMPORT_HOTFIX_V2.bat
```

3. Se la build passa, vai in Supabase SQL Editor ed esegui:

```txt
supabase\05_auth_profiles_admin_approval.sql
```

4. Push:

```bat
git add -A
git commit -m "fix: auth approval and import match client crash"
git push origin main
```

## Test

- Registrati con nuovo utente da `/login`.
- Fai login col nuovo utente e apri `/profile-import`.
- Inserisci nickname e UID.
- Accedi come owner e apri `/admin/users`.
- Approva il player.
- Prova `/import/match`: solo owner/staff/coach deve poter caricare.
