# CODM AK47DX - Force Version Routes

Questo pacchetto forza la creazione delle route:

- `/version`
- `/cache-reset`

Nel tuo ultimo log Vercel la build è riuscita, ma nella lista route non compaiono `/version` e `/cache-reset`. Questo significa che i file non sono nel commit deployato, oppure non sono stati copiati nella root corretta del progetto.

## Uso

1. Estrai lo ZIP.
2. Copia tutto nella root del progetto `codm-clan-intelligence-ak47dx`.
3. Avvia:

```bat
APPLICA_CODM_FORCE_VERSION_ROUTES.bat
```

4. Se la build locale passa, fai:

```bat
git add -A
git commit -m "fix: force version and cache reset routes"
git push origin main
```

5. Su Vercel controlla il log. Dopo `Route (app)` devono comparire:

```txt
/version
/cache-reset
```

6. Apri il tuo dominio reale:

```txt
https://TUO-DOMINIO.vercel.app/version
https://TUO-DOMINIO.vercel.app/cache-reset
```

## Nota

Non usare `https://tuo-link-vercel.vercel.app`: è solo un esempio. Usa il dominio reale mostrato da Vercel.
