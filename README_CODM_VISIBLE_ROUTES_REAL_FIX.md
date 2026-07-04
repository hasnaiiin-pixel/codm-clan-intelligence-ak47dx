# CODM - Fix reale per `/version` e `/cache-reset`

Questo pacchetto sostituisce le pagine `/version` e `/cache-reset` con file TSX validi.

## Perché serve

La patch precedente poteva lasciare pagine non valide o non chiaramente visibili. Questo fix crea due route Next.js semplici e sicure:

- `/version`: mostra una card con versione deploy.
- `/cache-reset`: cancella service worker, Cache Storage, session storage e ricarica `/version`.

## Come applicare

1. Copia tutto nella root del progetto `codm-clan-intelligence-ak47dx`.
2. Avvia:

```bat
APPLICA_CODM_VISIBLE_ROUTES_REAL_FIX.bat
```

3. Se la build passa:

```bat
git add -A
git commit -m "fix: repair visible version and cache reset routes"
git push origin main
```

4. Su Vercel aspetta il nuovo deploy automatico.

## Link da aprire

Usa il dominio reale Vercel, non `tuo-link-vercel`.

Esempio:

```txt
https://NOME-REALE-PROGETTO.vercel.app/version
https://NOME-REALE-PROGETTO.vercel.app/cache-reset
```

## Se ancora non funziona

Controlla nel log Vercel:

```txt
Cloning github.com/... Commit: NUOVO_COMMIT
```

Se il commit non cambia, il push non è arrivato al branch di produzione.
