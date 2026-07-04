# CODM AK47DX - MobileSidebar src path fix

Questo fix corregge l'errore:

```txt
Module not found: Can't resolve '@/components/MobileSidebar'
```

Nel progetto `tsconfig.json` contiene:

```json
"paths": { "@/*": ["./src/*"] }
```

Quindi `@/components/MobileSidebar` deve stare in:

```txt
src/components/MobileSidebar.tsx
```

Il pacchetto aggiunge anche `src/components/PwaInstaller.tsx`, perché `app/layout.tsx` importa entrambi i componenti.

## Procedura

1. Copia tutto nella root del progetto.
2. Avvia:

```bat
APPLICA_CODM_MOBILE_SIDEBAR_SRC_FIX.bat
```

3. Se la build passa:

```bat
git add -A
git commit -m "fix: place MobileSidebar and PwaInstaller under src components alias"
git push origin main
```

4. Aspetta deploy Vercel.

Nel log Vercel non deve più comparire:

```txt
Module not found: Can't resolve '@/components/MobileSidebar'
```
