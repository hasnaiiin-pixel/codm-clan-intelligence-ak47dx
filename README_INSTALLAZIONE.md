# FIX25 — Installazione su progetto AK47DX V14.2 FIX24

1. Copia di sicurezza. Estrai **il contenuto** della PATCH nella radice del progetto, non la cartella esterna. Conserva `.git`, `.env.local`, `node_modules`.
2. Supabase > SQL Editor: esegui la migrazione `supabase/UPDATE_V14_2_FIX25_PRIVACY_PORTAL.sql` **dopo FIX24**. Non eseguire file di reset; non ripetere FIX24 se già applicato.
3. Tornei > Crea / Gestisci: indica il **titolare reale del trattamento** e salva. La pagina `/privacy` è già selezionata automaticamente. Controlla che il testo privacy corrisponda ai dati e ai fornitori effettivi prima di aprire nuove iscrizioni.
4. Verifica da terminale Windows:

```cmd
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm run test:bracket64
npm run test:fix24
npm run test:fix25
npm run build
```

Non lanciare `npm ci` se le dipendenze sono già integre. Se la build passa:

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX25 privacy portal e pulizia docs"
git push origin main
```

5. Verifica `https://<dominio>/version`, `/privacy`, `/privacy/richiesta`; dal telefono completa un'iscrizione di test, **conserva ID iscrizione e codice**, verifica richiesta e risposta staff. Non usare dati personali reali nei test preliminari.
6. L'archivio storico dei README è stato consolidato sotto `docs/project_history/`. Se usi la PATCH sopra repository già popolato, puoi eseguire il file `PULIZIA_FIX25.ps1` (opzionale): elimina SOLO file README di versione e BUILD_OK obsoleti dalla radice, **dopo avere applicato la PATCH**, lasciando il nuovo archivio e i file necessari.

### Avvertenze
- Richieste privacy tramite token: il token è privato, non inviarlo via chat pubblica e non includerlo in screenshot.
- Lo staff deve effettivamente procedere alla rettifica/cancellazione: segnare una richiesta "Completata" non elimina alcun dato automaticamente.
- Per iscrizioni precedenti alla FIX25 non esiste codice privato retroattivo; verificare manualmente l'identità.
- Le misure anti-abuso del modulo pubblico sono basilari (honeypot, limiti richieste per iscrizione). Prima del lancio pubblico verificare protezione anti-bot/rate limiting e conformità dell'informativa.
