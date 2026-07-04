# CODM AK47DX - WriteAccessBlock src path fix

## Problema

La build fallisce con:

```txt
Module not found: Can't resolve '@/components/WriteAccessBlock'
```

Nel progetto `tsconfig.json` l'alias è:

```json
"@/*": ["./src/*"]
```

Quindi l'import:

```ts
import { WriteAccessBlock } from '@/components/WriteAccessBlock'
```

cerca il file qui:

```txt
src/components/WriteAccessBlock.tsx
```

La patch precedente lo aveva creato in:

```txt
components/WriteAccessBlock.tsx
```

che con questo `tsconfig.json` non viene risolto.

## Come applicare

1. Copia tutto nella root del progetto.
2. Avvia:

```bat
APPLICA_CODM_WRITE_ACCESS_SRC_FIX.bat
```

3. Se la build passa:

```bat
git add -A
git commit -m "fix: place WriteAccessBlock under src components alias"
git push origin main
```

4. Su Vercel aspetta il nuovo deploy.

## Dopo il deploy

Nel log Vercel devono comparire anche le route nuove se sono state aggiunte:

```txt
/admin/users
/version
/cache-reset
```
