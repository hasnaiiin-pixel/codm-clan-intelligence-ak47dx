# CODM AK47DX - WriteAccessBlock Fix

Questo fix risolve l'errore:

```txt
Module not found: Can't resolve '@/components/WriteAccessBlock'
```

## Cosa aggiunge

- `components/WriteAccessBlock.tsx`
- `scripts/check-write-access-block.cjs`
- `APPLICA_CODM_WRITE_ACCESS_BLOCK_FIX.bat`

Il componente controlla la sessione Supabase e legge il ruolo da `clan_members`. Consente la modifica solo ai ruoli:

- `owner`
- `admin`
- `coach`
- `staff`

Gli utenti anonimi, `registered`, `viewer` e `player` vedono un blocco accesso quando provano ad aprire aree operative.

## Come applicare

1. Copia tutto nella root del progetto `codm-clan-intelligence-ak47dx`.
2. Esegui:

```bat
APPLICA_CODM_WRITE_ACCESS_BLOCK_FIX.bat
```

3. Se la build passa:

```bat
git add -A
git commit -m "fix: add missing WriteAccessBlock component"
git push origin main
```

4. Aspetta il deploy Vercel.

Nel log Vercel devono comparire anche `/version` e `/cache-reset` se hai applicato il fix route precedente.
