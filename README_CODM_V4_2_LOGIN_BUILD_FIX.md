# CODM V4.2 Login Build Fix

Corregge `app/login/page.tsx`, che era stato generato male: la funzione `getFirstClan()` restituiva JSX invece di una riga clan, causando errore TypeScript:

`Property 'id' is missing in type 'ReactElement<any, any>' but required in type 'ClanRow'.`

## Uso

1. Copia il contenuto di questo ZIP nella root progetto.
2. Esegui `APPLICA_CODM_V4_2_LOGIN_BUILD_FIX.bat`.
3. Se build OK:

```bat
git add -A
git commit -m "fix: repair V4.2 login build"
git push origin main
```
