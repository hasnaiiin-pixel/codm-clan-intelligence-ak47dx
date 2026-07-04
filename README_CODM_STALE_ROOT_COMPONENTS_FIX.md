# CODM AK47DX - Stale Root Components Fix

Questo fix risolve l'errore:

```txt
./components/WriteAccessBlock.tsx
Cannot find module '@/src/lib/supabaseClient'
```

## Causa

Il progetto usa questo alias in `tsconfig.json`:

```json
"@/*": ["./src/*"]
```

Quindi gli import corretti sono:

```ts
import { supabase } from "@/lib/supabaseClient";
```

Non:

```ts
import { supabase } from "@/src/lib/supabaseClient";
```

Inoltre era rimasta una copia vecchia in `components/WriteAccessBlock.tsx` fuori da `src/`, compilata da TypeScript.

## Uso

1. Copia tutto nella root del progetto.
2. Avvia `APPLICA_CODM_STALE_ROOT_COMPONENTS_FIX.bat`.
3. Se la build passa:

```bat
git add -A
git commit -m "fix: remove stale root components and correct supabase imports"
git push origin main
```

4. Attendi deploy Vercel.
