# CODM AK47DX - Clean `patch_files` Build Fix

## Problema
La build fallisce perché TypeScript sta compilando file dentro:

```txt
patch_files/app/admin/users/page.tsx
```

`patch_files` era una cartella temporanea della patch e non deve stare nel progetto deployato.

## Cosa fa il fix

- Rimuove la cartella `patch_files/`.
- Aggiunge `patch_files/` a `.gitignore`.
- Aggiunge `patch_files` e `patch_files/**/*` a `tsconfig.json -> exclude`.
- Esegue `npm run build`.

## Istruzioni

1. Copia tutto nella root del progetto:

```txt
CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX/
```

2. Esegui:

```bat
APPLICA_CODM_PATCH_FILES_CLEANUP_FIX.bat
```

3. Se la build passa:

```bat
git add -A
git commit -m "fix: remove patch_files from CODM build"
git push origin main
```

4. Su Vercel controlla che il commit nuovo sia deployato.

## Nota
Se dopo questo appare un errore su `app/admin/users/page.tsx`, allora il problema è nel file reale, non più in `patch_files`.
