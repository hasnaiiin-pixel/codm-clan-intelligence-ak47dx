# CODM AK47DX - Fix finale Next config ES module

## Errore risolto

Vercel segnala:

```txt
ReferenceError: module is not defined in ES module scope
package.json contains "type": "module"
next.config.js uses module.exports
```

## Cosa fa questo fix

- Sostituisce `package.json` con JSON valido.
- Rimuove `"type": "module"`.
- Imposta Node 24.x per Vercel.
- Aggiunge `next.config.cjs` CommonJS.
- Cancella il vecchio `next.config.js`, perché se resta presente Next continua a leggere quello e fallisce.
- Aggiorna `package-lock.json`.
- Esegue `npm run build` in locale.

## Istruzioni

1. Copia tutti i file dello ZIP nella root del progetto:

```txt
codm-clan-intelligence-ak47dx/
```

2. Quando Windows chiede, sostituisci `package.json`.

3. Avvia:

```bat
CODM_FIX_ESMODULE_NEXT_CONFIG_WINDOWS.bat
```

4. Se lo script termina con FIX OK:

```bat
git add -A
git commit -m "fix: use CommonJS Next config and Node 24"
git push origin main
```

5. Su Vercel fai un nuovo deploy senza cache.

## Controllo fondamentale

Nel log Vercel il commit NON deve essere più `6cd8ac1`.
Deve comparire un commit nuovo.

Il file su GitHub deve NON contenere più:

```json
"type": "module"
```

E deve contenere:

```json
"engines": {
  "node": "24.x"
}
```
